import { listConversations } from "@/lib/persistence/messages";

/** GET: list saved conversations for the sidebar (newest first). */
export async function GET() {
  try {
    return Response.json(await listConversations());
  } catch (error) {
    console.error("[conversations] failed to list:", error);
    return Response.json([]);
  }
}
