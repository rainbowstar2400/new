import { describe, expect, it } from "vitest";
import { dueBadgeLabel, memoCategoryLabel } from "./task-view";
import type { Task } from "@new/shared";

const baseTask: Task = {
  id: "1",
  installationId: "i",
  title: "テスト",
  kind: "task",
  memoCategory: null,
  dueState: "no_due",
  dueAt: null,
  defaultDueTimeApplied: false,
  status: "active",
  createdAt: "2026-02-07T00:00:00.000Z",
  updatedAt: "2026-02-07T00:00:00.000Z"
};

describe("task-view", () => {
  it("shows pending due badge", () => {
    const label = dueBadgeLabel({ ...baseTask, dueState: "pending_due" });
    expect(label).toBe("!期日設定");
  });

  it("shows memo category label", () => {
    expect(memoCategoryLabel("want")).toBe("やりたいこと");
  });
});
