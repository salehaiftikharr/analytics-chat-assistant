import {
  streamText,
  stepCountIs,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { getModel } from "@/lib/llm/model";
import { buildSystemPrompt } from "@/lib/llm/prompt";
import { queryDatabase } from "@/lib/llm/tools";
import { describeSchema } from "@/lib/schema/describe";

/**
 * The chat endpoint. `useChat` POSTs the whole thread as UIMessages; we run the
 * active model with the queryDatabase tool and stream the answer back as a UI
 * message stream (text + tool-result parts).
 *
 * Conversation memory is on: the full thread is sent to the model, so follow-up
 * questions keep prior context.
 */
export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const schema = await describeSchema();

  const result = streamText({
    model: getModel(),
    system: buildSystemPrompt(schema),
    messages: await convertToModelMessages(messages),
    tools: { queryDatabase },
    // Let the model call the tool, see the rows, then write its answer.
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse({
    // Surface real error messages to the client during development instead of
    // the SDK's default masked "An error occurred." (hardened in step 12).
    onError: (error) => (error instanceof Error ? error.message : String(error)),
  });
}
