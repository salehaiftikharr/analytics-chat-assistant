"use client";

import type { ConversationSummary } from "@/lib/persistence/messages";

interface SidebarProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
}: SidebarProps) {
  // A freshly-created chat has no saved messages yet, so it won't be in the
  // list — show it as a "New chat" entry until its first message persists.
  const activeIsSaved = conversations.some((c) => c.conversationId === activeId);

  return (
    <aside className="sidebar">
      <button type="button" className="sidebar-new" onClick={onNew}>
        + New chat
      </button>
      <nav className="sidebar-list">
        {activeId && !activeIsSaved ? (
          <button
            type="button"
            className="sidebar-item sidebar-item--active"
            onClick={() => onSelect(activeId)}
          >
            New chat
          </button>
        ) : null}
        {conversations.map((conversation) => (
          <button
            key={conversation.conversationId}
            type="button"
            className={`sidebar-item${
              conversation.conversationId === activeId
                ? " sidebar-item--active"
                : ""
            }`}
            title={conversation.title}
            onClick={() => onSelect(conversation.conversationId)}
          >
            {conversation.title}
          </button>
        ))}
      </nav>
    </aside>
  );
}
