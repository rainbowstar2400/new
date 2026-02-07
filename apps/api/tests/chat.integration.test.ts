import { describe, expect, it } from "vitest";
import { MemoryRepository } from "../src/repos/memory-repo";
import { createServer } from "../src/server";

describe("chat api integration", () => {
  it("handles due choice flow (UC-02)", async () => {
    const repo = new MemoryRepository();
    const app = await createServer({
      repo,
      startScheduler: false,
      summaryProvider: async (text) => text.slice(0, 20)
    });

    const reg = await app.inject({ method: "POST", url: "/v1/installations/register", payload: {} });
    const session = reg.json();

    const first = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { text: "牛乳を買うのを忘れないように" }
    });

    expect(first.statusCode).toBe(200);
    expect(first.json().actionType).toBe("confirm");
    expect(first.json().quickChoices).toContain("設定しない");
    expect(first.json().inputMode).toBe("choice_only");
    expect(first.json().confirmationType).toBe("due_choice");

    const second = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { selectedChoice: "設定しない" }
    });

    expect(second.statusCode).toBe(200);
    expect(second.json().actionType).toBe("saved");
    expect(second.json().inputMode).toBe("free_text");

    const list = await app.inject({
      method: "GET",
      url: "/v1/tasks",
      headers: { authorization: `Bearer ${session.accessToken}` }
    });

    expect(list.json().items.length).toBe(1);
    expect(list.json().items[0].dueState).toBe("no_due");
  });

  it("handles date-only confirm flow (UC-08)", async () => {
    const repo = new MemoryRepository();
    const app = await createServer({
      repo,
      startScheduler: false,
      summaryProvider: async () => "打ち合わせ"
    });

    const reg = await app.inject({ method: "POST", url: "/v1/installations/register", payload: {} });
    const session = reg.json();

    const first = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { text: "明日の打ち合わせをリマインドして", defaultDueTime: "09:00" }
    });

    expect(first.json().quickChoices).toContain("○");
    expect(first.json().inputMode).toBe("choice_then_text_on_negative");
    expect(first.json().confirmationType).toBe("due_time_confirm");
    expect(first.json().negativeChoice).toBe("✕");

    const second = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { selectedChoice: "○" }
    });

    expect(second.json().actionType).toBe("saved");

    const list = await app.inject({
      method: "GET",
      url: "/v1/tasks",
      headers: { authorization: `Bearer ${session.accessToken}` }
    });

    expect(list.json().items[0].dueState).toBe("scheduled");
  });

  it("keeps short unclear input as confirmation (UC-13)", async () => {
    const repo = new MemoryRepository();
    const app = await createServer({
      repo,
      startScheduler: false,
      summaryProvider: async () => "転職準備"
    });

    const reg = await app.inject({ method: "POST", url: "/v1/installations/register", payload: {} });
    const session = reg.json();

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { text: "転職準備" }
    });

    expect(response.json().actionType).toBe("confirm");
    expect(response.json().quickChoices).toEqual(["タスク", "メモ"]);
    expect(response.json().inputMode).toBe("choice_only");
    expect(response.json().confirmationType).toBe("task_or_memo");
  });

  it("asks memo category after explicit memo choice from ambiguous input", async () => {
    const repo = new MemoryRepository();
    const app = await createServer({
      repo,
      startScheduler: false,
      summaryProvider: async () => "転職準備"
    });

    const reg = await app.inject({ method: "POST", url: "/v1/installations/register", payload: {} });
    const session = reg.json();
    const headers = { authorization: `Bearer ${session.accessToken}` };

    const first = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers,
      payload: { text: "転職準備" }
    });

    expect(first.json().actionType).toBe("confirm");
    expect(first.json().quickChoices).toEqual(["タスク", "メモ"]);

    const second = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers,
      payload: { selectedChoice: "メモ" }
    });

    expect(second.json().actionType).toBe("confirm");
    expect(second.json().quickChoices).toEqual(["やりたいこと", "アイデア", "メモ（雑多）"]);
    expect(second.json().inputMode).toBe("choice_only");
    expect(second.json().confirmationType).toBe("memo_category");

    const third = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers,
      payload: { selectedChoice: "やりたいこと" }
    });

    expect(third.json().actionType).toBe("saved");

    const list = await app.inject({
      method: "GET",
      url: "/v1/tasks",
      headers
    });

    expect(list.json().items[0].kind).toBe("memo");
    expect(list.json().items[0].memoCategory).toBe("want");
  });
  it("asks memo category even when AI suggests one after explicit memo choice", async () => {
    const repo = new MemoryRepository();
    const app = await createServer({
      repo,
      startScheduler: false,
      summaryProvider: async () => "転職準備",
      classificationProvider: async (_text, facts) => {
        if (facts.ruleReason !== "explicit_memo_choice") return null;
        return {
          kind: "memo",
          memoCategory: "want",
          confidence: 0.95,
          reason: "ai_suggest_want"
        };
      }
    });

    const reg = await app.inject({ method: "POST", url: "/v1/installations/register", payload: {} });
    const session = reg.json();
    const headers = { authorization: `Bearer ${session.accessToken}` };

    await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers,
      payload: { text: "転職準備" }
    });

    const second = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers,
      payload: { selectedChoice: "メモ" }
    });

    expect(second.json().actionType).toBe("confirm");
    expect(second.json().quickChoices).toEqual(["やりたいこと", "アイデア", "メモ（雑多）"]);
    expect(second.json().assistantText).toContain("候補はやりたいこと");

    const listBefore = await app.inject({
      method: "GET",
      url: "/v1/tasks",
      headers
    });
    expect(listBefore.json().items.length).toBe(0);

    const third = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers,
      payload: { selectedChoice: "アイデア" }
    });

    expect(third.json().actionType).toBe("saved");

    const listAfter = await app.inject({
      method: "GET",
      url: "/v1/tasks",
      headers
    });
    expect(listAfter.json().items[0].memoCategory).toBe("idea");
  });

  it("interprets short chore text as task", async () => {
    const repo = new MemoryRepository();
    const app = await createServer({
      repo,
      startScheduler: false,
      summaryProvider: async () => "洗濯"
    });

    const reg = await app.inject({ method: "POST", url: "/v1/installations/register", payload: {} });
    const session = reg.json();

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { text: "洗濯" }
    });

    expect(response.json().actionType).toBe("confirm");
    expect(response.json().quickChoices).toContain("設定する");
  });

  it("interprets desire sentence as memo", async () => {
    const repo = new MemoryRepository();
    const app = await createServer({
      repo,
      startScheduler: false,
      summaryProvider: async () => "京都旅行に行きたい"
    });

    const reg = await app.inject({ method: "POST", url: "/v1/installations/register", payload: {} });
    const session = reg.json();

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { text: "京都旅行に行きたい" }
    });

    expect(response.json().actionType).toBe("saved");

    const list = await app.inject({
      method: "GET",
      url: "/v1/tasks",
      headers: { authorization: `Bearer ${session.accessToken}` }
    });

    expect(list.json().items[0].kind).toBe("memo");
    expect(list.json().items[0].memoCategory).toBe("want");
  });

  it("interprets hiragana desire sentence as memo", async () => {
    const repo = new MemoryRepository();
    const app = await createServer({
      repo,
      startScheduler: false,
      summaryProvider: async () => "京都にいきたい"
    });

    const reg = await app.inject({ method: "POST", url: "/v1/installations/register", payload: {} });
    const session = reg.json();

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { text: "京都にいきたい" }
    });

    expect(response.json().actionType).toBe("saved");

    const list = await app.inject({
      method: "GET",
      url: "/v1/tasks",
      headers: { authorization: `Bearer ${session.accessToken}` }
    });

    expect(list.json().items[0].kind).toBe("memo");
    expect(list.json().items[0].memoCategory).toBe("want");
  });

  it("strips due expression from task title", async () => {
    const repo = new MemoryRepository();
    const app = await createServer({
      repo,
      startScheduler: false,
      summaryProvider: async (text) => text
    });

    const reg = await app.inject({ method: "POST", url: "/v1/installations/register", payload: {} });
    const session = reg.json();

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { text: "明日18時に洗濯" }
    });

    expect(response.json().actionType).toBe("saved");

    const list = await app.inject({
      method: "GET",
      url: "/v1/tasks",
      headers: { authorization: `Bearer ${session.accessToken}` }
    });

    expect(list.json().items[0].title).toBe("洗濯");
  });

  it("uses AI classification result when deterministic is ambiguous", async () => {
    const repo = new MemoryRepository();
    const app = await createServer({
      repo,
      startScheduler: false,
      summaryProvider: async (text) => text,
      classificationProvider: async () => ({
        kind: "memo",
        memoCategory: "want",
        confidence: 0.92,
        reason: "ai_test"
      })
    });

    const reg = await app.inject({ method: "POST", url: "/v1/installations/register", payload: {} });
    const session = reg.json();

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { text: "この件" }
    });

    expect(response.json().actionType).toBe("saved");

    const list = await app.inject({
      method: "GET",
      url: "/v1/tasks",
      headers: { authorization: `Bearer ${session.accessToken}` }
    });

    expect(list.json().items[0].kind).toBe("memo");
    expect(list.json().items[0].memoCategory).toBe("want");
  });

  it("asks target confirmation when multiple tasks exist (UC-17)", async () => {
    const repo = new MemoryRepository();
    const app = await createServer({
      repo,
      startScheduler: false,
      summaryProvider: async (text) => text.slice(0, 16)
    });

    const reg = await app.inject({ method: "POST", url: "/v1/installations/register", payload: {} });
    const session = reg.json();
    const headers = { authorization: `Bearer ${session.accessToken}` };

    await app.inject({ method: "POST", url: "/v1/chat/messages", headers, payload: { text: "明日9時にAさんへ連絡" } });
    await app.inject({ method: "POST", url: "/v1/chat/messages", headers, payload: { text: "明後日10時に請求書送付" } });

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers,
      payload: { text: "1時間前にリマインドして" }
    });

    expect(response.json().actionType).toBe("confirm");
    expect(response.json().quickChoices).toEqual(["○", "✕"]);
    expect(response.json().inputMode).toBe("choice_then_text_on_negative");
    expect(response.json().confirmationType).toBe("task_target_confirm");
  });

  it("falls back to due-choice confirmation when AI due parsing payload is invalid", async () => {
    const repo = new MemoryRepository();
    const app = await createServer({
      repo,
      startScheduler: false,
      dueParseMode: "ai-first",
      summaryProvider: async () => "請求書送付",
      dueParserProvider: async () => ({
        state: "resolved",
        dueAt: null,
        timeProvided: true,
        reason: "invalid_payload"
      }) as any
    });

    const reg = await app.inject({ method: "POST", url: "/v1/installations/register", payload: {} });
    const session = reg.json();

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { text: "来週金曜に請求書送付" }
    });

    expect(response.json().actionType).toBe("confirm");
    expect(response.json().quickChoices).toEqual(["設定する", "設定しない", "後で設定する"]);
    expect(response.json().inputMode).toBe("choice_only");
    expect(response.json().confirmationType).toBe("due_choice");
  });
  it("uses polite tone when responseTone is omitted", async () => {
    const repo = new MemoryRepository();
    const app = await createServer({
      repo,
      startScheduler: false,
      summaryProvider: async () => "京都旅行に行きたい"
    });

    const reg = await app.inject({ method: "POST", url: "/v1/installations/register", payload: {} });
    const session = reg.json();
    const headers = { authorization: `Bearer ${session.accessToken}` };

    const omitted = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers,
      payload: { text: "京都旅行に行きたい" }
    });

    const explicit = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers,
      payload: { text: "京都旅行に行きたい", responseTone: "polite" }
    });

    expect(omitted.statusCode).toBe(200);
    expect(explicit.statusCode).toBe(200);
    expect(omitted.json().assistantText).toBe(explicit.json().assistantText);
  });

  it("changes assistant tone when responseTone is specified", async () => {
    const repo = new MemoryRepository();
    const app = await createServer({
      repo,
      startScheduler: false,
      summaryProvider: async () => "京都旅行に行きたい"
    });

    const reg = await app.inject({ method: "POST", url: "/v1/installations/register", payload: {} });
    const session = reg.json();
    const headers = { authorization: `Bearer ${session.accessToken}` };

    const polite = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers,
      payload: { text: "京都旅行に行きたい", responseTone: "polite" }
    });

    const friendly = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers,
      payload: { text: "京都旅行に行きたい", responseTone: "friendly" }
    });

    expect(polite.statusCode).toBe(200);
    expect(friendly.statusCode).toBe(200);
    expect(friendly.json().assistantText).not.toBe(polite.json().assistantText);
  });
});

