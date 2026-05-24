"use client";

import type { ConversationSummary } from "@/lib/persistence/messages";

interface SidebarProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
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
          <div className="sidebar-item sidebar-item--active">
            <button
              type="button"
              className="sidebar-item-title"
              onClick={() => onSelect(activeId)}
            >
              New chat
            </button>
          </div>
        ) : null}
        {conversations.map((conversation) => {
          const isActive = conversation.conversationId === activeId;
          return (
            <div
              key={conversation.conversationId}
              className={`sidebar-item${isActive ? " sidebar-item--active" : ""}`}
            >
              <button
                type="button"
                className="sidebar-item-title"
                title={conversation.title}
                onClick={() => onSelect(conversation.conversationId)}
              >
                {conversation.title}
              </button>
              <button
                type="button"
                className="sidebar-delete"
                aria-label="Delete chat"
                title="Delete chat"
                onClick={() => onDelete(conversation.conversationId)}
              >
                ×
              </button>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
