import { describe, expect, it } from "vitest";
import { classifyInput, detectMemoCategory } from "../src/logic/classification";

describe("classifyInput", () => {
  it("classifies explicit task", () => {
    const result = classifyInput("明日9時にAさんへ連絡");
    expect(result.kind).toBe("task");
  });

  it("classifies memo want", () => {
    const result = classifyInput("最近読んだ本の感想を残しておきたい");
    expect(result.kind).toBe("memo");
    expect(result.memoCategory).toBe("want");
  });

  it("classifies hiragana desire sentence as want", () => {
    const result = classifyInput("京都にいきたい");
    expect(result.kind).toBe("memo");
    expect(result.memoCategory).toBe("want");
  });

  it("keeps epistemic mitai as non-want", () => {
    const category = detectMemoCategory("この景色は映画みたいです");
    expect(category).toBe("misc");
  });

  it("classifies short task-like noun", () => {
    const result = classifyInput("洗濯");
    expect(result.kind).toBe("task");
  });

  it("classifies familiar chore nouns as task", () => {
    const result = classifyInput("買い物");
    expect(result.kind).toBe("task");
  });

  it("classifies full-width datetime cue as task", () => {
    const result = classifyInput("１８時に出発");
    expect(result.kind).toBe("task");
  });

  it("classifies relative-week cue as task", () => {
    const result = classifyInput("再来週火曜に会議");
    expect(result.kind).toBe("task");
  });

  it("classifies bare desire sentence as memo", () => {
    const result = classifyInput("来月は京都に行きたい");
    expect(result.kind).toBe("memo");
    expect(result.memoCategory).toBe("want");
  });

  it("keeps truly short unclear text ambiguous", () => {
    const result = classifyInput("転職準備");
    expect(result.kind).toBe("ambiguous");
  });

  it("treats unknown short noun as ambiguous instead of memo misc", () => {
    const result = classifyInput("資料整理");
    expect(result.kind).toBe("ambiguous");
  });

  it("detects idea category", () => {
    const category = detectMemoCategory("作業導線の改善アイデア");
    expect(category).toBe("idea");
  });

  it("detects idea from thought wording", () => {
    const category = detectMemoCategory("新機能の思いつきを残す");
    expect(category).toBe("idea");
  });
});
