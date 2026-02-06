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

    const second = await app.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { selectedChoice: "設定しない" }
    });

    expect(second.statusCode).toBe(200);
    expect(second.json().actionType).toBe("saved");

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
  });
});
