-- Application table for chat persistence (NOT part of the analytics dataset).
-- Only the app role can read/write this; the read-only role is granted no
-- access, so LLM-generated SQL can never see chat history (see 04_roles.sql).

CREATE TABLE messages (
    id              BIGSERIAL PRIMARY KEY,
    conversation_id UUID        NOT NULL,
    role            TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
    content         TEXT,
    payload         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE messages IS 'Chat history: one row per message in a conversation.';
COMMENT ON COLUMN messages.conversation_id IS 'Groups messages into a conversation (client-provided).';
COMMENT ON COLUMN messages.role IS 'Who sent the message: user or assistant.';
COMMENT ON COLUMN messages.content IS 'Natural-language text (the question, or the assistant summary).';
COMMENT ON COLUMN messages.payload IS 'Assistant answer payload as JSON: { sql, chartSpec, rows, summary }.';

-- Load a conversation in chronological order.
CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);
