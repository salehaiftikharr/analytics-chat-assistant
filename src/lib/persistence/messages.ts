import { appPool } from "@/lib/db";
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
  const { rows } = await appPool.query<{ payload: UIMessage }>(
    `SELECT payload FROM messages WHERE conversation_id = $1 ORDER BY id ASC`,
    [conversationId],
  );
  return rows.map((row) => row.payload);
}

export async function saveConversation(
  conversationId: string,
  messages: UIMessage[],
): Promise<void> {
  const client = await appPool.connect();
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
