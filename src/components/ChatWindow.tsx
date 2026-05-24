"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

export default function ChatWindow() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isBusy = status === "submitted" || status === "streaming";

  return (
    <div className="chat">
      <header className="chat-header">
        <h1>Analytics Chat Assistant</h1>
      </header>
      <MessageList messages={messages} busy={isBusy} error={error} />
      <MessageInput
        onSend={(text) => sendMessage({ text })}
        disabled={isBusy}
      />
    </div>
  );
}
