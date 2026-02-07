import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { ChatService } from "../services/chat-service";

const bodySchema = z.object({
  text: z.string().optional(),
  selectedChoice: z.string().optional(),
  defaultDueTime: z.string().optional(),
  responseTone: z.enum(["polite", "friendly", "concise"]).optional()
});

export function registerChatRoutes(app: FastifyInstance, chatService: ChatService) {
  app.post("/v1/chat/messages", async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid request" });
    }

    if (!request.installationId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const response = await chatService.handleMessage({
      installationId: request.installationId,
      text: parsed.data.text,
      selectedChoice: parsed.data.selectedChoice,
      defaultDueTime: parsed.data.defaultDueTime,
      responseTone: parsed.data.responseTone ?? "polite"
    });

    return response;
  });
}

