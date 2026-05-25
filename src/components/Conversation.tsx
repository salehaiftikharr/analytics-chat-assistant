"use client";

import { useEffect, useMemo, useRef } from "react";
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
}

export default function Conversation({
  conversationId,
  initialMessages,
  onPersisted,
  provider,
  onProviderChange,
}: ConversationProps) {
  // The current provider, read at send time so the choice applies to every
  // request (new messages, example chips, and retries) without rebuilding the
  // transport.
  const providerRef = useRef(provider);
  providerRef.current = provider;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ id, messages }) => ({
          body: {
            messages,
            conversationId: id,
            provider: providerRef.current,
          },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, error, stop, regenerate } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";

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
        <h1>Analytics Chat Assistant</h1>
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
        onExample={(question) => sendMessage({ text: question })}
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
              onClick={() => regenerate()}
            >
              Retry
            </button>
          )}
        </div>
      )}
      <MessageInput onSend={(text) => sendMessage({ text })} disabled={isBusy} />
    </div>
  );
}
