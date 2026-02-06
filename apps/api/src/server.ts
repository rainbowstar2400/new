import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { createRepository } from "./repos/factory";
import type { AppRepository } from "./repos/types";
import { registerInstallationRoutes } from "./routes/installations";
import { registerChatRoutes } from "./routes/chat";
import { registerPushRoutes } from "./routes/push";
import { registerTaskRoutes } from "./routes/tasks";
import { registerReminderRoutes } from "./routes/reminders";
import { buildAuthPreHandler } from "./routes/auth";
import { ChatService } from "./services/chat-service";
import { createSummaryProvider, type SummaryProvider } from "./gpt/summary-slot";
import { createClassificationProvider, type ClassificationProvider } from "./gpt/classifier";
import { startReminderScheduler } from "./push/scheduler";

declare module "fastify" {
  interface FastifyRequest {
    installationId?: string;
    installationTimezone?: string;
  }
}

type CreateServerOptions = {
  repo?: AppRepository;
  summaryProvider?: SummaryProvider;
  classificationProvider?: ClassificationProvider;
  startScheduler?: boolean;
};

export async function createServer(options: CreateServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  const repo = options.repo ?? createRepository();
  const summaryProvider = options.summaryProvider ?? createSummaryProvider();
  const classificationProvider = options.classificationProvider ?? createClassificationProvider();
  const chatService = new ChatService(repo, summaryProvider, classificationProvider);

  registerInstallationRoutes(app, repo);

  const authPreHandler = buildAuthPreHandler(repo);
  app.addHook("preHandler", async (request, reply) => {
    if (request.url.startsWith("/v1/installations/register")) return;
    if (!request.url.startsWith("/v1/")) return;
    await authPreHandler(request, reply);
  });

  registerChatRoutes(app, chatService);
  registerPushRoutes(app, repo);
  registerTaskRoutes(app, repo);
  registerReminderRoutes(app, repo);

  if (options.startScheduler ?? true) {
    const stop = startReminderScheduler(repo);
    app.addHook("onClose", async () => stop());
  }

  return app;
}
