import { generateText, stepCountIs } from "ai";
import { getModel, getProviderName } from "@/lib/llm/model";
import { queryDatabase } from "@/lib/llm/tools";
import { buildSystemPrompt } from "@/lib/llm/prompt";
import { describeSchema } from "@/lib/schema/describe";

/**
 * TEMPORARY verification route for step 6. Runs one question through the active
 * provider via the AI SDK, letting the model call the queryDatabase tool. Proves
 * provider switching (LLM_PROVIDER) + tool calling + execution end to end —
 * non-streaming, for easy inspection. The real streaming /api/chat route (and
 * the removal of this route) comes in step 8.
 *
 *   GET /api/provider-check?q=Your+question
 */
type LooseStep = {
  toolCalls: Array<{ input?: unknown }>;
  toolResults: Array<{ output?: unknown }>;
};

export async function GET(request: Request) {
  const question =
    new URL(request.url).searchParams.get("q") ??
    "What is total revenue by product category?";

  try {
    const schema = await describeSchema();
    const result = await generateText({
      model: getModel(),
      system: buildSystemPrompt(schema),
      prompt: question,
      tools: { queryDatabase },
      // Allow: model calls the tool, sees results, then writes its answer.
      stopWhen: stepCountIs(5),
    });

    const steps = result.steps as unknown as LooseStep[];
    const sql = steps
      .flatMap((s) => s.toolCalls)
      .map((c) => (c.input as { sql?: string }).sql);
    const results = steps
      .flatMap((s) => s.toolResults)
      .map((r) => {
        const out = r.output as { rowCount?: number; chartSpec?: unknown };
        return { rowCount: out.rowCount, chartSpec: out.chartSpec };
      });

    return Response.json({
      ok: true,
      provider: getProviderName(),
      question,
      answer: result.text,
      sql,
      results,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
