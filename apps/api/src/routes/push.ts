import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { AppRepository } from "../repos/types";
import { newId } from "../id";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
});

export function registerPushRoutes(app: FastifyInstance, repo: AppRepository) {
  app.post("/v1/push/subscribe", async (request, reply) => {
    if (!request.installationId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const parsed = subscribeSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid request" });
    }

    const now = new Date().toISOString();
    await repo.savePushSubscription({
      id: newId(),
      installationId: request.installationId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      createdAt: now,
      updatedAt: now
    });

    return { ok: true };
  });
}
