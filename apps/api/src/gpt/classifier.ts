import OpenAI from "openai";
import { z } from "zod";
import type { ClassificationResult } from "@new/shared";
import { loadEnv } from "../env";

export type ClassificationFacts = {
  ruleKind: "task" | "memo" | "ambiguous";
  ruleReason: string;
  ruleConfidence: number;
};

export type ClassificationProvider = (
  inputText: string,
  facts: ClassificationFacts
) => Promise<ClassificationResult | null>;

const aiClassificationSchema = z.object({
  kind: z.enum(["task", "memo", "ambiguous"]),
  memoCategory: z.enum(["want", "idea", "misc"]).nullable(),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1).max(80)
});

function buildPrompt(inputText: string, facts: ClassificationFacts): string {
  return [
    "次の発話を task / memo / ambiguous に分類してください。",
    "memo の場合は memoCategory を want / idea / misc から必ず1つ選んでください。",
    "task / ambiguous の場合 memoCategory は null。",
    "不明なら ambiguous を選ぶ。",
    "ただし願望・希望（〜たい、〜してみたい等）は memo(want) を優先。",
    "出力はJSONのみ。",
    `ruleKind=${facts.ruleKind}`,
    `ruleReason=${facts.ruleReason}`,
    `ruleConfidence=${facts.ruleConfidence.toFixed(2)}`,
    `input=${inputText}`,
    "JSON schema:",
    '{"kind":"task|memo|ambiguous","memoCategory":"want|idea|misc|null","confidence":0.0,"reason":"short"}'
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

export function createClassificationProvider(): ClassificationProvider {
  const env = loadEnv();
  if (!env.OPENAI_API_KEY) {
    return async () => null;
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  return async (inputText, facts) => {
    try {
      const completion = await client.chat.completions.create({
        model: env.OPENAI_MODEL,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "あなたは分類器です。JSON以外は返答しません。"
          },
          {
            role: "user",
            content: buildPrompt(inputText, facts)
          }
        ]
      });

      const content = completion.choices[0]?.message?.content ?? "";
      const parsed = aiClassificationSchema.safeParse(parseJsonCandidate(content));
      if (!parsed.success) return null;

      const value = parsed.data;
      if (value.kind !== "memo") {
        return {
          kind: value.kind,
          memoCategory: null,
          confidence: value.confidence,
          reason: `ai_${value.reason}`
        };
      }

      return {
        kind: "memo",
        memoCategory: value.memoCategory ?? "misc",
        confidence: value.confidence,
        reason: `ai_${value.reason}`
      };
    } catch {
      return null;
    }
  };
}
