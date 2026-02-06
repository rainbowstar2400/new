import { z } from "zod";
import { applyOffset } from "@new/shared";
import type { FastifyInstance } from "fastify";
import type { AppRepository } from "../repos/types";

const adjustSchema = z.object({
  offsetMinutes: z.number().int().min(0).max(30 * 24 * 60)
});

export function registerReminderRoutes(app: FastifyInstance, repo: AppRepository) {
  app.get("/v1/reminders/upcoming", async (request, reply) => {
    if (!request.installationId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const reminders = await repo.listUpcomingReminders(request.installationId);
    return { items: reminders };
  });

  app.post("/v1/reminders/:id/adjust-offset", async (request, reply) => {
    if (!request.installationId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const reminderId = String((request.params as any).id ?? "");
    const parsed = adjustSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid request" });
    }

    const reminder = await repo.findReminderById(reminderId);
    if (!reminder) {
      return reply.code(404).send({ message: "Reminder not found" });
    }

    const task = await repo.getTaskById(reminder.taskId);
    if (!task || task.installationId !== request.installationId || !task.dueAt) {
      return reply.code(404).send({ message: "Reminder not found" });
    }

    const now = new Date().toISOString();
    const updated = await repo.updateReminder({
      ...reminder,
      offsetMinutes: parsed.data.offsetMinutes,
      notifyAt: applyOffset(task.dueAt, parsed.data.offsetMinutes),
      updatedAt: now
    });

    return updated;
  });
}
