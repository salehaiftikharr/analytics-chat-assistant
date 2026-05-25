"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import ChartRenderer from "@/components/charts/ChartRenderer";
import type { ChartSpec } from "@/lib/llm/tools";
import type { Row } from "@/components/charts/chart-common";

interface MessageListProps {
  messages: UIMessage[];
  /** True while waiting for the assistant to start responding. */
  pending?: boolean;
  error?: Error;
  onExample?: (question: string) => void;
}

const EXAMPLES = [
  "What's revenue by category?",
  "Show monthly revenue as a line chart",
  "Top 5 customers by total spend",
];

/** The shape of our queryDatabase tool result (part.output when available). */
type QueryOutput = { rowCount: number; rows: Row[]; chartSpec: ChartSpec };

/** Permissive view of a UIMessage part (the SDK's part union is heavily generic). */
type UIPart = {
  type: string;
  text?: string;
  state?: string;
  input?: { sql?: string };
  output?: unknown;
  errorText?: string;
};

export default function MessageList({
  messages,
  pending,
  error,
  onExample,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the latest content in view as messages stream in.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  return (
    <div className="chat-list">
      {messages.length === 0 ? (
        <div className="chat-empty">
          <p className="chat-empty-hint">
            Ask a question about your e-commerce data.
          </p>
          <div className="chat-examples">
            {EXAMPLES.map((question) => (
              <button
                key={question}
                type="button"
                className="chat-example"
                onClick={() => onExample?.(question)}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {messages.map((message, index) => (
        <div
          key={message.id || index}
          className={`chat-message chat-message--${message.role}`}
        >
          <div className="chat-role">
            {message.role === "user" ? "You" : "Assistant"}
          </div>
          <div className="chat-bubble">
            {(message.parts as unknown as UIPart[]).map((part, i) => {
              if (part.type === "text") {
                return <span key={i}>{part.text}</span>;
              }
              if (part.type === "tool-queryDatabase") {
                return <ToolResult key={i} part={part} />;
              }
              return null;
            })}
          </div>
        </div>
      ))}

      {pending ? (
        <div className="chat-message chat-message--assistant">
          <div className="chat-role">Assistant</div>
          <div className="chat-bubble chat-typing" aria-label="Assistant is thinking">
            <span />
            <span />
            <span />
          </div>
        </div>
      ) : null}

      {error ? <p className="chat-error">Error: {error.message}</p> : null}

      <div ref={endRef} />
    </div>
  );
}

function ToolResult({ part }: { part: UIPart }) {
  if (part.state === "output-available") {
    const output = part.output as QueryOutput;
    const sql = part.input?.sql;
    return (
      <div className="tool-result">
        <ChartRenderer chartSpec={output.chartSpec} rows={output.rows} />
        {sql ? (
          <details className="sql-details">
            <summary>View SQL</summary>
            <pre className="sql-code">{sql}</pre>
          </details>
        ) : null}
      </div>
    );
  }
  if (part.state === "output-error") {
    return <p className="chart-empty">Query failed: {part.errorText}</p>;
  }
  return <p className="chart-empty">Running query…</p>;
}
