import { test, expect, type Page, type Route } from "@playwright/test";
import type { Task } from "@new/shared";

type ChatRequest = {
  text?: string;
  selectedChoice?: string;
  responseTone?: "polite" | "friendly" | "concise";
};

type ChatResponse = {
  assistantText: string;
  summarySlot: string;
  actionType: "saved" | "confirm" | "error";
  quickChoices: string[];
  affectedTaskIds: string[];
  inputMode?: "free_text" | "choice_only" | "choice_then_text_on_negative";
  confirmationType?: "task_or_memo" | "memo_category" | "due_choice" | "due_time_confirm" | "task_target_confirm" | null;
  negativeChoice?: string | null;
};

function buildTask(input: {
  id: string;
  title: string;
  kind: "task" | "memo";
  memoCategory: Task["memoCategory"];
  dueState: Task["dueState"];
  dueAt: string | null;
}): Task {
  const now = "2026-02-07T00:00:00.000Z";
  return {
    id: input.id,
    installationId: "inst-1",
    title: input.title,
    kind: input.kind,
    memoCategory: input.memoCategory,
    dueState: input.dueState,
    dueAt: input.dueAt,
    defaultDueTimeApplied: false,
    status: "active",
    createdAt: now,
    updatedAt: now
  };
}

async function fulfillJson(route: Route, payload: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload)
  });
}

async function setupBaseApiMocks(page: Page, tasks: Task[]): Promise<void> {
  await page.route("**/v1/installations/register", async (route) => {
    await fulfillJson(route, {
      installationId: "inst-1",
      accessToken: "token-1",
      timezone: "Asia/Tokyo"
    });
  });

  await page.route("**/v1/tasks", async (route) => {
    const req = route.request();
    if (req.method() !== "GET") {
      await fulfillJson(route, { message: "method not allowed" }, 405);
      return;
    }
    await fulfillJson(route, { items: tasks });
  });
}

test("home renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "自分専用秘書PWA" })).toBeVisible();
});

test("memo choice from ambiguous input asks memo category then saves selected category", async ({ page }) => {
  const tasks: Task[] = [];

  await setupBaseApiMocks(page, tasks);

  await page.route("**/v1/chat/messages", async (route) => {
    const body = route.request().postDataJSON() as ChatRequest;

    let response: ChatResponse;
    if (body.text === "転職準備") {
      response = {
        assistantText: "転職準備ですね。これはタスクにしますか？メモにしますか？",
        summarySlot: "転職準備",
        actionType: "confirm",
        quickChoices: ["タスク", "メモ"],
        affectedTaskIds: [],
        inputMode: "choice_only",
        confirmationType: "task_or_memo",
        negativeChoice: null
      };
    } else if (body.selectedChoice === "メモ") {
      response = {
        assistantText: "転職準備ですね。メモの分類を選んでください。",
        summarySlot: "転職準備",
        actionType: "confirm",
        quickChoices: ["やりたいこと", "アイデア", "メモ（雑多）"],
        affectedTaskIds: [],
        inputMode: "choice_only",
        confirmationType: "memo_category",
        negativeChoice: null
      };
    } else if (body.selectedChoice === "やりたいこと") {
      tasks.splice(0, tasks.length, buildTask({
        id: "task-1",
        title: "転職準備",
        kind: "memo",
        memoCategory: "want",
        dueState: "no_due",
        dueAt: null
      }));
      response = {
        assistantText: "転職準備ですね。やりたいこととして保存しました。",
        summarySlot: "転職準備",
        actionType: "saved",
        quickChoices: [],
        affectedTaskIds: ["task-1"],
        inputMode: "free_text",
        confirmationType: null,
        negativeChoice: null
      };
    } else {
      response = {
        assistantText: "処理できませんでした。",
        summarySlot: "",
        actionType: "error",
        quickChoices: [],
        affectedTaskIds: [],
        inputMode: "free_text",
        confirmationType: null,
        negativeChoice: null
      };
    }

    await fulfillJson(route, response);
  });

  await page.goto("/");

  await page.getByPlaceholder("例: 明日9時にAさんへ連絡").fill("転職準備");
  await page.getByRole("button", { name: "送信" }).click();

  const textarea = page.getByPlaceholder("例: 明日9時にAさんへ連絡");
  await expect(page.getByRole("button", { name: "メモ" })).toBeVisible();
  await expect(textarea).toBeDisabled();
  await page.getByRole("button", { name: "メモ" }).click();

  await expect(page.getByRole("button", { name: "やりたいこと" })).toBeVisible();
  await expect(page.locator(".task-item")).toHaveCount(0);
  await page.getByRole("button", { name: "やりたいこと" }).click();

  await expect(page.locator(".task-item .task-title")).toHaveText("転職準備");
  await expect(page.locator(".task-item .badge.memo-cat")).toHaveText("やりたいこと");
  await expect(textarea).toBeEnabled();
});

test("task title is normalized when input contains due expression", async ({ page }) => {
  const tasks: Task[] = [];

  await setupBaseApiMocks(page, tasks);

  await page.route("**/v1/chat/messages", async (route) => {
    const body = route.request().postDataJSON() as ChatRequest;

    if (body.text === "明日18時に洗濯") {
      tasks.splice(0, tasks.length, buildTask({
        id: "task-2",
        title: "洗濯",
        kind: "task",
        memoCategory: null,
        dueState: "scheduled",
        dueAt: "2026-02-08T09:00:00.000Z"
      }));
      await fulfillJson(route, {
        assistantText: "洗濯ですね。タスクに登録しました。",
        summarySlot: "洗濯",
        actionType: "saved",
        quickChoices: [],
        affectedTaskIds: ["task-2"],
        inputMode: "free_text",
        confirmationType: null,
        negativeChoice: null
      } satisfies ChatResponse);
      return;
    }

    await fulfillJson(route, {
      assistantText: "処理できませんでした。",
      summarySlot: "",
      actionType: "error",
      quickChoices: [],
      affectedTaskIds: [],
      inputMode: "free_text",
      confirmationType: null,
      negativeChoice: null
    } satisfies ChatResponse);
  });

  await page.goto("/");

  await page.getByPlaceholder("例: 明日9時にAさんへ連絡").fill("明日18時に洗濯");
  await page.getByRole("button", { name: "送信" }).click();

  await expect(page.locator(".task-item .task-title")).toHaveText("洗濯");
});

test("choice_then_text_on_negative unlocks free text after ✕", async ({ page }) => {
  const tasks: Task[] = [];

  await setupBaseApiMocks(page, tasks);

  await page.route("**/v1/chat/messages", async (route) => {
    const body = route.request().postDataJSON() as ChatRequest;

    if (body.text === "明日の打ち合わせをリマインドして") {
      await fulfillJson(route, {
        assistantText: "期限を2026/2/8 09:00（既定時刻）で設定します。よければ○、変更する場合は✕を選んでください。",
        summarySlot: "打ち合わせ",
        actionType: "confirm",
        quickChoices: ["○", "✕"],
        affectedTaskIds: [],
        inputMode: "choice_then_text_on_negative",
        confirmationType: "due_time_confirm",
        negativeChoice: "✕"
      } satisfies ChatResponse);
      return;
    }

    if (body.selectedChoice === "✕") {
      await fulfillJson(route, {
        assistantText: "希望する時刻を入力してください。例: 18時 / 18:30",
        summarySlot: "打ち合わせ",
        actionType: "confirm",
        quickChoices: [],
        affectedTaskIds: [],
        inputMode: "free_text",
        confirmationType: "due_time_confirm",
        negativeChoice: null
      } satisfies ChatResponse);
      return;
    }

    await fulfillJson(route, {
      assistantText: "処理できませんでした。",
      summarySlot: "",
      actionType: "error",
      quickChoices: [],
      affectedTaskIds: [],
      inputMode: "free_text",
      confirmationType: null,
      negativeChoice: null
    } satisfies ChatResponse);
  });

  await page.goto("/");

  const textarea = page.getByPlaceholder("例: 明日9時にAさんへ連絡");
  await textarea.fill("明日の打ち合わせをリマインドして");
  await page.getByRole("button", { name: "送信" }).click();

  await expect(page.getByRole("button", { name: "✕" })).toBeVisible();
  await expect(textarea).toBeDisabled();

  await page.getByRole("button", { name: "✕" }).click();
  await expect(textarea).toBeEnabled();
});




test("response tone setting persists and is sent in chat payload", async ({ page }) => {
  const tasks: Task[] = [];
  let latestTone: string | undefined;

  await setupBaseApiMocks(page, tasks);

  await page.route("**/v1/chat/messages", async (route) => {
    const body = route.request().postDataJSON() as ChatRequest;
    latestTone = body.responseTone;

    const textByTone: Record<string, string> = {
      polite: "丁寧トーンで応答します。",
      friendly: "フレンドリートーンで応答するね！",
      concise: "簡潔トーン応答。"
    };

    await fulfillJson(route, {
      assistantText: textByTone[body.responseTone ?? "polite"],
      summarySlot: body.text ?? "",
      actionType: "saved",
      quickChoices: [],
      affectedTaskIds: [],
      inputMode: "free_text",
      confirmationType: null,
      negativeChoice: null
    } satisfies ChatResponse);
  });

  await page.goto("/");

  const toneSelect = page.getByLabel("応答文の文体");
  await toneSelect.selectOption("friendly");
  await expect(toneSelect).toHaveValue("friendly");

  await page.getByPlaceholder("例: 明日9時にAさんへ連絡").fill("洗濯");
  await page.getByRole("button", { name: "送信" }).click();

  await expect(page.getByText("フレンドリートーンで応答するね！")).toBeVisible();
  expect(latestTone).toBe("friendly");

  await page.reload();
  await expect(page.getByLabel("応答文の文体")).toHaveValue("friendly");
});

