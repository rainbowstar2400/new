import type { FastifyReply, FastifyRequest } from "fastify";
import type { AppRepository } from "../repos/types";

export function buildAuthPreHandler(repo: AppRepository) {
  return async function authPreHandler(request: FastifyRequest, reply: FastifyReply) {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const token = header.slice("Bearer ".length);
    const installation = await repo.findInstallationByToken(token);
    if (!installation) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    request.installationId = installation.installationId;
    request.installationTimezone = installation.timezone;
  };
}
