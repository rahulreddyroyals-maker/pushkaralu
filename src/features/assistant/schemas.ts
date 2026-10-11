import { z } from "zod";
import { AI_LIMITS } from "@/config/app";

export const chatRequestSchema = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1, "Message can't be empty").max(AI_LIMITS.maxCharsPerMessage, `Keep each message under ${AI_LIMITS.maxCharsPerMessage} characters`),
        })
      )
      .min(1)
      .max(AI_LIMITS.maxTurnsPerRequest),
    lang: z.enum(["en", "te"]).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.messages[v.messages.length - 1]?.role !== "user") ctx.addIssue({ code: "custom", path: ["messages"], message: "The last message must be from the user" });
    if (v.messages.reduce((n, m) => n + m.content.length, 0) > AI_LIMITS.maxCharsTotal) ctx.addIssue({ code: "custom", path: ["messages"], message: "Conversation is too long — start a new chat" });
  });
export type ChatRequest = z.infer<typeof chatRequestSchema>;
