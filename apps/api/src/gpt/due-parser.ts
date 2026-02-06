import OpenAI from "openai";
import { validateDueParseCandidate, type DueParseCandidate } from "@new/shared";
import { loadEnv } from "../env";

export type DueParserProvider = (
  inputText: string,
  options: {
    defaultDueTime?: string;
    nowIso?: string;
  }
) => Promise<DueParseCandidate | null>;

function buildPrompt(
  inputText: string,
  options: {
    defaultDueTime?: string;
    nowIso?: string;
  }
): string {
  return [
    "入力文から期限候補を抽出してください。JSON以外を返さないこと。",
    "ルール:",
    "- state は resolved / needs_confirmation / unparsable のいずれか",
    "- resolved の場合のみ dueAt(ISO8601 UTC) と timeProvided(boolean) を必須で返す",
    "- needs_confirmation/unparsable の場合 dueAt は null",
    "- 未確定情報を推測で補わない",
    "- 曖昧なら needs_confirmation",
    `defaultDueTime=${options.defaultDueTime ?? "09:00"}`,
    `now=${options.nowIso ?? new Date().toISOString()}`,
    `input=${inputText}`,
    "schema:",
    '{"state":"resolved|needs_confirmation|unparsable","dueAt":"ISO8601 or null","timeProvided":true,"reason":"short"}'
  ].join("\n");
}

function parseJsonCandidate(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    return JSON.parse(fenced[1]);
  }

  return JSON.parse(trimmed);
}

export function createDueParserProvider(): DueParserProvider {
  const env = loadEnv();
  if (!env.OPENAI_API_KEY) {
    return async () => null;
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  return async (inputText, options) => {
    try {
      const completion = await client.chat.completions.create({
        model: env.OPENAI_MODEL,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "あなたは日時抽出器です。必ずJSONのみで返答します。"
          },
          {
            role: "user",
            content: buildPrompt(inputText, options)
          }
        ]
      });

      const content = completion.choices[0]?.message?.content ?? "";
      const parsed = validateDueParseCandidate(parseJsonCandidate(content));
      if (!parsed) {
        return {
          state: "needs_confirmation",
          dueAt: null,
          timeProvided: null,
          reason: "ai_invalid_payload"
        };
      }

      return parsed;
    } catch {
      return null;
    }
  };
}
