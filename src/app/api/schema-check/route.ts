import { describeSchema } from "@/lib/schema/describe";

/**
 * TEMPORARY verification route for step 5 — returns the generated schema
 * description as plain text. Remove together with the other temp routes when
 * the real /api/chat route lands (step 8).
 */
export async function GET() {
  try {
    const schema = await describeSchema(true); // refresh: bypass the cache
    return new Response(schema, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    return new Response(`error: ${(error as Error).message}`, { status: 500 });
  }
}
