"use client";

import { useCallback, useEffect, useState } from "react";
import type { UIMessage } from "ai";
import type { ConversationSummary } from "@/lib/persistence/messages";
import Sidebar from "./Sidebar";
import Conversation from "./Conversation";
import type { ProviderName } from "./ModelSwitcher";

const ACTIVE_KEY = "aca-active-conversation-id";
const PROVIDER_KEY = "aca-provider";

/**
 * Top-level chat shell: a sidebar of conversations plus the active conversation.
 * The active id is kept in localStorage (so reload reopens the last chat); the
 * conversation list comes from the server and refreshes after each answer.
 */
export default function ChatApp() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  // The loaded conversation, tagged with its id. When `loaded.id !== activeId`
  // we're still fetching the active chat — that derived check replaces a
  // separate "loading" state (and avoids a synchronous reset in the effect).
  const [loaded, setLoaded] = useState<{
    id: string;
    messages: UIMessage[];
  } | null>(null);
  const [provider, setProvider] = useState<ProviderName>("anthropic");
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    /* eslint-disable react-hooks/set-state-in-effect --
       One-time client-only initialization. activeId/provider/sidebar are derived
       from localStorage and window, which aren't available during SSR (nor in a
       lazy useState initializer without a hydration mismatch), so they must be
       set in a mount effect. This is a single intentional render, not a cascade. */
    let id = localStorage.getItem(ACTIVE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ACTIVE_KEY, id);
    }
    setActiveId(id);

    const savedProvider = localStorage.getItem(PROVIDER_KEY);
    if (savedProvider === "anthropic" || savedProvider === "openai") {
      setProvider(savedProvider);
    }

    // Start with the sidebar collapsed on narrow screens (it's an overlay there).
    if (window.innerWidth < 768) setSidebarOpen(false);
    /* eslint-enable react-hooks/set-state-in-effect */

    void refreshList();
  }, [refreshList]);

  const changeProvider = useCallback((next: ProviderName) => {
    setProvider(next);
    localStorage.setItem(PROVIDER_KEY, next);
  }, []);

  // Load the active conversation's history whenever it changes. setState happens
  // only in the async callback (after the fetch resolves), which is the
  // recommended place — no synchronous reset in the effect body.
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    const settle = (messages: UIMessage[]) => {
      if (!cancelled) setLoaded({ id: activeId, messages });
    };
    fetch(`/api/chat?conversationId=${activeId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((msgs: UIMessage[]) => settle(msgs))
      .catch(() => settle([]));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // On narrow screens the sidebar is an overlay; close it after picking a chat.
  const closeSidebarIfNarrow = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  const selectConversation = useCallback(
    (id: string) => {
      localStorage.setItem(ACTIVE_KEY, id);
      setActiveId(id);
      closeSidebarIfNarrow();
    },
    [closeSidebarIfNarrow],
  );

  const newConversation = useCallback(() => {
    const id = crypto.randomUUID();
    localStorage.setItem(ACTIVE_KEY, id);
    setActiveId(id);
    closeSidebarIfNarrow();
  }, [closeSidebarIfNarrow]);

  const deleteConversation = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this chat? This can't be undone.")) return;
      try {
        await fetch(`/api/conversations?conversationId=${id}`, {
          method: "DELETE",
        });
      } catch {
        /* a failed delete is non-fatal; the list refresh will reconcile */
      }
      await refreshList();
      // If we deleted the chat we're viewing, drop into a fresh one.
      if (id === activeId) {
        const fresh = crypto.randomUUID();
        localStorage.setItem(ACTIVE_KEY, fresh);
        setActiveId(fresh);
      }
    },
    [activeId, refreshList],
  );

  return (
    <div className={`app${sidebarOpen ? "" : " app--sidebar-collapsed"}`}>
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNew={newConversation}
        onDelete={deleteConversation}
      />
      {/* Click-away backdrop for the overlay sidebar on narrow screens. */}
      <div
        className="sidebar-backdrop"
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <div className="app-main">
        {activeId && loaded?.id === activeId ? (
          <Conversation
            key={activeId}
            conversationId={activeId}
            initialMessages={loaded.messages}
            onPersisted={refreshList}
            provider={provider}
            onProviderChange={changeProvider}
            onToggleSidebar={() => setSidebarOpen((open) => !open)}
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
