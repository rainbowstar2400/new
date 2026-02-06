import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  localStorage.clear();
});

describe("App", () => {
  it("renders heading", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/v1/installations/register")) {
          return new Response(
            JSON.stringify({
              installationId: "i1",
              accessToken: "t1",
              timezone: "Asia/Tokyo"
            }),
            { status: 200 }
          );
        }
        if (url.includes("/v1/tasks")) {
          return new Response(JSON.stringify({ items: [] }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      })
    );

    render(<App />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "自分専用秘書PWA" })).toBeInTheDocument());
  });

  it("disables text input during choice_only confirmation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url.includes("/v1/installations/register")) {
          return new Response(
            JSON.stringify({
              installationId: "i1",
              accessToken: "t1",
              timezone: "Asia/Tokyo"
            }),
            { status: 200 }
          );
        }

        if (url.includes("/v1/tasks")) {
          return new Response(JSON.stringify({ items: [] }), { status: 200 });
        }

        if (url.includes("/v1/chat/messages")) {
          const body = JSON.parse(String(init?.body ?? "{}"));
          if (body.text === "転職準備") {
            return new Response(
              JSON.stringify({
                assistantText: "転職準備ですね。これはタスクにしますか？メモにしますか？",
                summarySlot: "転職準備",
                actionType: "confirm",
                quickChoices: ["タスク", "メモ"],
                affectedTaskIds: [],
                inputMode: "choice_only",
                confirmationType: "task_or_memo",
                negativeChoice: null
              }),
              { status: 200 }
            );
          }
        }

        return new Response(JSON.stringify({}), { status: 200 });
      })
    );

    render(<App />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "自分専用秘書PWA" })).toBeInTheDocument());

    const textarea = screen.getByPlaceholderText("例: 明日9時にAさんへ連絡") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "転職準備" } });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "メモ" })).toBeInTheDocument());
    const lockedTextarea = screen.getByPlaceholderText("例: 明日9時にAさんへ連絡") as HTMLTextAreaElement;
    expect(lockedTextarea).toBeDisabled();
  });

  it("enables text input after negative choice in choice_then_text_on_negative", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url.includes("/v1/installations/register")) {
          return new Response(
            JSON.stringify({
              installationId: "i1",
              accessToken: "t1",
              timezone: "Asia/Tokyo"
            }),
            { status: 200 }
          );
        }

        if (url.includes("/v1/tasks")) {
          return new Response(JSON.stringify({ items: [] }), { status: 200 });
        }

        if (url.includes("/v1/chat/messages")) {
          const body = JSON.parse(String(init?.body ?? "{}"));
          if (body.text === "明日の打ち合わせをリマインドして") {
            return new Response(
              JSON.stringify({
                assistantText: "期限を2026/2/8 09:00（既定時刻）で設定します。よければ○、変更する場合は✕を選んでください。",
                summarySlot: "打ち合わせ",
                actionType: "confirm",
                quickChoices: ["○", "✕"],
                affectedTaskIds: [],
                inputMode: "choice_then_text_on_negative",
                confirmationType: "due_time_confirm",
                negativeChoice: "✕"
              }),
              { status: 200 }
            );
          }

          if (body.selectedChoice === "✕") {
            return new Response(
              JSON.stringify({
                assistantText: "希望する時刻を入力してください。例: 18時 / 18:30",
                summarySlot: "打ち合わせ",
                actionType: "confirm",
                quickChoices: [],
                affectedTaskIds: [],
                inputMode: "free_text",
                confirmationType: "due_time_confirm",
                negativeChoice: null
              }),
              { status: 200 }
            );
          }
        }

        return new Response(JSON.stringify({}), { status: 200 });
      })
    );

    render(<App />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "自分専用秘書PWA" })).toBeInTheDocument());

    const textarea = screen.getByPlaceholderText("例: 明日9時にAさんへ連絡") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "明日の打ち合わせをリマインドして" } });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "✕" })).toBeInTheDocument());
    const lockedTextarea = screen.getByPlaceholderText("例: 明日9時にAさんへ連絡") as HTMLTextAreaElement;
    expect(lockedTextarea).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "✕" }));
    await waitFor(() => {
      const unlockedTextarea = screen.getByPlaceholderText("例: 明日9時にAさんへ連絡") as HTMLTextAreaElement;
      expect(unlockedTextarea).toBeEnabled();
    });
  });
});

