"use client";

import { useCallback, useEffect, useState } from "react";
import type { UIMessage } from "ai";
import type { ConversationSummary } from "@/lib/persistence/messages";
import Sidebar from "./Sidebar";
import Conversation from "./Conversation";

const ACTIVE_KEY = "aca-active-conversation-id";

/**
 * Top-level chat shell: a sidebar of conversations plus the active conversation.
 * The active id is kept in localStorage (so reload reopens the last chat); the
 * conversation list comes from the server and refreshes after each answer.
 */
export default function ChatApp() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(
    null,
  );

  const refreshList = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) setConversations(await res.json());
    } catch {
      /* a failed list refresh is non-fatal */
    }
  }, []);

  // On mount: resolve the active conversation (last used, or a new one) + list.
  useEffect(() => {
    let id = localStorage.getItem(ACTIVE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ACTIVE_KEY, id);
    }
    setActiveId(id);
    void refreshList();
  }, [refreshList]);

  // Load the active conversation's history whenever it changes.
  useEffect(() => {
    if (!activeId) return;
    setInitialMessages(null);
    fetch(`/api/chat?conversationId=${activeId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((msgs: UIMessage[]) => setInitialMessages(msgs))
      .catch(() => setInitialMessages([]));
  }, [activeId]);

  const selectConversation = useCallback((id: string) => {
    localStorage.setItem(ACTIVE_KEY, id);
    setActiveId(id);
  }, []);

  const newConversation = useCallback(() => {
    const id = crypto.randomUUID();
    localStorage.setItem(ACTIVE_KEY, id);
    setActiveId(id);
  }, []);

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNew={newConversation}
      />
      <div className="app-main">
        {activeId && initialMessages !== null ? (
          <Conversation
            key={activeId}
            conversationId={activeId}
            initialMessages={initialMessages}
            onPersisted={refreshList}
          />
        ) : (
          <div className="chat">
            <header className="chat-header">
              <h1>Analytics Chat Assistant</h1>
            </header>
            <div className="chat-list">
              <p className="chat-empty-hint">Loading…</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
