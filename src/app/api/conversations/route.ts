import {
  deleteConversation,
  listConversations,
} from "@/lib/persistence/messages";

/** GET: list saved conversations for the sidebar (newest first). */
export async function GET() {
  try {
    return Response.json(await listConversations());
  } catch (error) {
    console.error("[conversations] failed to list:", error);
    return Response.json([]);
  }
}

/** DELETE ?conversationId=... : permanently remove a conversation. */
export async function DELETE(req: Request) {
  const conversationId = new URL(req.url).searchParams.get("conversationId");
  if (!conversationId) {
    return Response.json({ error: "conversationId required" }, { status: 400 });
  }
  try {
    await deleteConversation(conversationId);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[conversations] failed to delete:", error);
    return Response.json({ error: "failed to delete" }, { status: 500 });
  }
}
