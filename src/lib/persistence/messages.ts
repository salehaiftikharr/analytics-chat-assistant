import { getAppPool } from "@/lib/db";
import type { UIMessage } from "ai";

/**
 * Chat persistence via the app pool (read/write on `messages` only).
 *
 * Each row stores one UIMessage: its full JSON in `payload` (so text parts and
 * tool results — including chart data — restore exactly), plus `role` and the
 * flattened text in `content` for readability/search. Saving replaces the whole
 * conversation in a transaction, which keeps it simple and always consistent
 * with what the AI SDK hands us in onFinish.
 */
export async function loadConversation(
  conversationId: string,
): Promise<UIMessage[]> {
  const { rows } = await getAppPool().query<{ payload: UIMessage }>(
    `SELECT payload FROM messages WHERE conversation_id = $1 ORDER BY id ASC`,
    [conversationId],
  );
  return rows.map((row) => row.payload);
}

export async function saveConversation(
  conversationId: string,
  messages: UIMessage[],
): Promise<void> {
  const client = await getAppPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM messages WHERE conversation_id = $1`, [
      conversationId,
    ]);
    for (const message of messages) {
      await client.query(
        `INSERT INTO messages (conversation_id, role, content, payload)
         VALUES ($1, $2, $3, $4)`,
        [conversationId, message.role, textOf(message), JSON.stringify(message)],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Flatten a message's text parts into a single string for the `content` column. */
function textOf(message: UIMessage): string {
  const parts = message.parts as Array<{ type: string; text?: string }>;
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("\n");
}

export interface ConversationSummary {
  conversationId: string;
  title: string;
  updatedAt: string;
}

/**
 * Lists saved conversations for the sidebar, newest first. The title is the
 * first user message; ordering is by most-recently-updated. Derived from the
 * messages table, so a brand-new (empty) chat only appears after its first save.
 */
export async function listConversations(): Promise<ConversationSummary[]> {
  const { rows } = await getAppPool().query<{
    conversation_id: string;
    title: string | null;
    updated_at: string;
  }>(`
    SELECT conversation_id,
           max(created_at) AS updated_at,
           (array_agg(content ORDER BY id) FILTER (WHERE role = 'user'))[1] AS title
    FROM messages
    GROUP BY conversation_id
    ORDER BY updated_at DESC
  `);
  return rows.map((row) => ({
    conversationId: row.conversation_id,
    title: (row.title ?? "").trim() || "Untitled chat",
    updatedAt: row.updated_at,
  }));
}
