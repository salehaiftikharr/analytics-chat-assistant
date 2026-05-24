"use client";

import { useEffect, useState } from "react";
import type { UIMessage } from "ai";
import Conversation from "./Conversation";

const STORAGE_KEY = "aca-conversation-id";

/**
 * Resolves a stable conversation id (kept in localStorage so it survives
 * reloads) and loads that conversation's saved history before mounting the chat.
 * Seeding useChat with the loaded messages is what makes the thread — and its
 * context — persist across reloads.
 */
export default function ChatWindow() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(
    null,
  );

  useEffect(() => {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    setConversationId(id);

    fetch(`/api/chat?conversationId=${id}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((msgs: UIMessage[]) => setInitialMessages(msgs))
      .catch(() => setInitialMessages([]));
  }, []);

  if (!conversationId || initialMessages === null) {
    return (
      <div className="chat">
        <header className="chat-header">
          <h1>Analytics Chat Assistant</h1>
        </header>
        <div className="chat-list">
          <p className="chat-empty-hint">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <Conversation
      conversationId={conversationId}
      initialMessages={initialMessages}
    />
  );
}
