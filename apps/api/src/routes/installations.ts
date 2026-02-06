import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { AppRepository } from "../repos/types";

const registerSchema = z.object({
  timezone: z.string().min(1).optional()
});

export function registerInstallationRoutes(app: FastifyInstance, repo: AppRepository) {
  app.post("/v1/installations/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid request" });
    }

    const installation = await repo.createInstallation({
      timezone: parsed.data.timezone ?? "Asia/Tokyo"
    });

    return {
      installationId: installation.installationId,
      accessToken: installation.accessToken,
      timezone: installation.timezone
    };
  });
}
