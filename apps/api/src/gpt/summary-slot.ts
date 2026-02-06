import OpenAI from "openai";
import { fallbackSummarySlot, normalizeSummarySlot, normalizeTaskTitle } from "@new/shared";
import { loadEnv } from "../env";

export type SummaryFacts = {
  kind: "task" | "memo" | "confirm";
  dueAt?: string | null;
};

export type SummaryProvider = (inputText: string, facts: SummaryFacts) => Promise<string>;

function buildPrompt(inputText: string, facts: SummaryFacts): string {
  const taskRule =
    facts.kind === "task"
      ? "- taskでは日時やリマインド指示語を含めず、作業本体のみ"
      : "- memo/confirmでは入力語句を最大限保持";

  return [
    "あなたは入力文の要約スロット(〇〇部分)のみを作る補助です。",
    "制約:",
    taskRule,
    "- 未確定の日時や対象を追加しない",
    "- 入力語句を可能な限り保持",
    "- 短くし過ぎない",
    "- 80文字以内",
    "- 要約スロットだけ返答",
    `kind=${facts.kind}`,
    facts.dueAt ? `dueAt=${facts.dueAt}` : "dueAt=none",
    `input=${inputText}`
  ].join("\n");
}

export function createSummaryProvider(): SummaryProvider {
  const env = loadEnv();
  if (!env.OPENAI_API_KEY) {
    return async (inputText, facts) => {
      const slot = fallbackSummarySlot(inputText);
      return facts.kind === "task" ? normalizeTaskTitle(slot, inputText) : slot;
    };
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  return async (inputText, facts) => {
    try {
      const completion = await client.chat.completions.create({
        model: env.OPENAI_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "入力尊重で短すぎない要約スロットを生成してください。"
          },
          {
            role: "user",
            content: buildPrompt(inputText, facts)
          }
        ]
      });

      const candidate = completion.choices[0]?.message?.content ?? "";
      const normalized = normalizeSummarySlot(candidate, inputText);
      if (facts.kind === "task") {
        return normalizeTaskTitle(normalized, inputText);
      }
      return normalized;
    } catch {
      const slot = fallbackSummarySlot(inputText);
      return facts.kind === "task" ? normalizeTaskTitle(slot, inputText) : slot;
    }
  };
}
