"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/types";

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the latest message in view as the conversation grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-list">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`chat-message chat-message--${message.role}`}
        >
          <div className="chat-bubble">{message.content}</div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
