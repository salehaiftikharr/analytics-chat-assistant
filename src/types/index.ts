/** Shared types used across the chat UI and API. */

export type MessageRole = "user" | "assistant";

/**
 * A single chat message. In later steps assistant messages will also carry a
 * structured `payload` (SQL, chart spec, rows, summary); for now it's just text.
 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
}
