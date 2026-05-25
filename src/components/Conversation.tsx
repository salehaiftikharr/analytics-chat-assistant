"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ModelSwitcher, { type ProviderName } from "./ModelSwitcher";

interface ConversationProps {
  conversationId: string;
  initialMessages: UIMessage[];
  /** Called after an answer finishes (and is saved) so the sidebar can refresh. */
  onPersisted?: () => void;
  provider: ProviderName;
  onProviderChange: (provider: ProviderName) => void;
  onToggleSidebar?: () => void;
}

export default function Conversation({
  conversationId,
  initialMessages,
  onPersisted,
  provider,
  onProviderChange,
  onToggleSidebar,
}: ConversationProps) {
  // Create the transport once (stable identity) so re-renders never reset the
  // thread. Per-request fields (conversationId, provider) are supplied at send
  // time via each sendMessage/regenerate call's `body`, so the transport itself
  // needs no changing state.
  const [transport] = useState(
    () => new DefaultChatTransport({ api: "/api/chat" }),
  );

  const { messages, sendMessage, status, error, stop, regenerate } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";

  // The body sent with every request: which conversation to save under, and
  // which provider to use (the current switch value).
  const requestBody = { conversationId, provider };

  const ask = (text: string) => sendMessage({ text }, { body: requestBody });

  // When a response finishes (streaming -> ready), the server has persisted the
  // conversation; tell the parent so the sidebar list/title updates.
  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current === "streaming" && status === "ready") {
      onPersisted?.();
    }
    prevStatus.current = status;
  }, [status, onPersisted]);

  return (
    <div className="chat">
      <header className="chat-header">
        <div className="chat-header-left">
          {onToggleSidebar ? (
            <button
              type="button"
              className="icon-button sidebar-toggle"
              aria-label="Toggle sidebar"
              onClick={onToggleSidebar}
            >
              ☰
            </button>
          ) : null}
          <h1>Analytics Chat Assistant</h1>
        </div>
        <ModelSwitcher
          provider={provider}
          onChange={onProviderChange}
          disabled={isBusy}
        />
      </header>
      <MessageList
        messages={messages}
        pending={status === "submitted"}
        error={error}
        onExample={ask}
      />
      {(isBusy || status === "error") && (
        <div className="chat-controls">
          {isBusy && (
            <button type="button" className="chat-control" onClick={() => stop()}>
              Stop
            </button>
          )}
          {status === "error" && (
            <button
              type="button"
              className="chat-control"
              onClick={() => regenerate({ body: requestBody })}
            >
              Retry
            </button>
          )}
        </div>
      )}
      <MessageInput onSend={ask} disabled={isBusy} />
    </div>
  );
}
