import {
  streamText,
  stepCountIs,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { getModel } from "@/lib/llm/model";
import { buildSystemPrompt } from "@/lib/llm/prompt";
import { queryDatabase, suggestFollowups } from "@/lib/llm/tools";
import { describeSchema } from "@/lib/schema/describe";
import { loadConversation, saveConversation } from "@/lib/persistence/messages";

/**
 * POST: run the model with the queryDatabase tool and stream the answer back as
 * a UI message stream. The whole thread is sent (conversation memory), and the
 * finished conversation is persisted under `conversationId`.
 */
export async function POST(req: Request) {
  const { messages, conversationId, provider }: {
    messages: UIMessage[];
    conversationId?: string;
    provider?: string;
  } = await req.json();

  const schema = await describeSchema();

  const result = streamText({
    model: getModel(provider),
    system: buildSystemPrompt(schema),
    messages: await convertToModelMessages(messages),
    tools: { queryDatabase, suggestFollowups },
    stopWhen: stepCountIs(6),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ messages: finalMessages }) => {
      if (!conversationId) return;
      try {
        await saveConversation(conversationId, finalMessages);
      } catch (error) {
        console.error("[chat] failed to persist conversation:", error);
      }
    },
    onError: (error) => (error instanceof Error ? error.message : String(error)),
  });
}

/**
 * GET ?conversationId=... : load a saved conversation so the client can seed
 * useChat on reload. Returns [] for an unknown/missing id.
 */
export async function GET(req: Request) {
  const conversationId = new URL(req.url).searchParams.get("conversationId");
  if (!conversationId) return Response.json([]);
  try {
    const messages = await loadConversation(conversationId);
    return Response.json(messages);
  } catch (error) {
    console.error("[chat] failed to load conversation:", error);
    return Response.json([]);
  }
}
