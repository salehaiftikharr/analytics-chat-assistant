"use client";

import { useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

interface ConversationProps {
  conversationId: string;
  initialMessages: UIMessage[];
}

export default function Conversation({
  conversationId,
  initialMessages,
}: ConversationProps) {
  // Send the conversation id alongside every request so the server saves under
  // it. Memoized so we don't rebuild the transport on each render.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { conversationId },
      }),
    [conversationId],
  );

  const { messages, sendMessage, status, error, stop, regenerate } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";

  return (
    <div className="chat">
      <header className="chat-header">
        <h1>Analytics Chat Assistant</h1>
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
