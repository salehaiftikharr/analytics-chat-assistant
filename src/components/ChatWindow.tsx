"use client";

import { useState } from "react";
import type { Message } from "@/types";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

// Hardcoded for step 4 to prove rendering. The real history comes from the API
// (step 10) and the database (step 11).
const INITIAL_MESSAGES: Message[] = [
  {
    id: "seed-1",
    role: "assistant",
    content:
      'Hi! Ask me a question about your e-commerce data — for example, "What\'s revenue by category?"',
  },
  {
    id: "seed-2",
    role: "user",
    content: "What's revenue by category?",
  },
  {
    id: "seed-3",
    role: "assistant",
    content:
      "Charts and stats will render here once the backend is wired up in later steps.",
  },
];

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);

  function handleSend(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: text },
    ]);
  }

  return (
    <div className="chat">
      <header className="chat-header">
        <h1>Analytics Chat Assistant</h1>
      </header>
      <MessageList messages={messages} />
      <MessageInput onSend={handleSend} />
    </div>
  );
}
