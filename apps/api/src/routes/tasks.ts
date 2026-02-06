import { z } from "zod";
import { applyOffset } from "@new/shared";
import type { FastifyInstance } from "fastify";
import type { AppRepository } from "../repos/types";

const reclassifySchema = z.object({
  kind: z.enum(["task", "memo"]),
  memoCategory: z.enum(["want", "idea", "misc"]).nullable().optional()
});

export function registerTaskRoutes(app: FastifyInstance, repo: AppRepository) {
  app.get("/v1/tasks", async (request, reply) => {
    if (!request.installationId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const tasks = await repo.listTasks(request.installationId);
    return { items: tasks };
  });

  app.post("/v1/tasks/:id/reclassify", async (request, reply) => {
    if (!request.installationId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const taskId = String((request.params as any).id ?? "");
    const parsed = reclassifySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid request" });
    }

    const task = await repo.getTaskById(taskId);
    if (!task || task.installationId !== request.installationId) {
      return reply.code(404).send({ message: "Task not found" });
    }

    const now = new Date().toISOString();
    const next = {
      ...task,
      kind: parsed.data.kind,
      memoCategory: parsed.data.kind === "memo" ? (parsed.data.memoCategory ?? "misc") : null,
      dueState: parsed.data.kind === "memo" ? "no_due" : task.dueState,
      dueAt: parsed.data.kind === "memo" ? null : task.dueAt,
      updatedAt: now
    };

    const updated = await repo.updateTask(next);

    if (updated.kind === "task" && updated.dueAt) {
      const reminders = await repo.listRemindersByTask(updated.id);
      if (reminders.length === 0) {
        await repo.createReminder({
          id: crypto.randomUUID(),
          taskId: updated.id,
          baseTime: updated.dueAt,
          offsetMinutes: 0,
          notifyAt: updated.dueAt,
          status: "active",
          createdAt: now,
          updatedAt: now
        });
      } else {
        for (const reminder of reminders) {
          await repo.updateReminder({
            ...reminder,
            baseTime: updated.dueAt,
            notifyAt: applyOffset(updated.dueAt, reminder.offsetMinutes),
            updatedAt: now
          });
        }
      }
    }

    return updated;
  });
}
