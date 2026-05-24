"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import ChartRenderer from "@/components/charts/ChartRenderer";
import type { ChartSpec } from "@/lib/llm/tools";
import type { Row } from "@/components/charts/chart-common";

interface MessageListProps {
  messages: UIMessage[];
  busy?: boolean;
  error?: Error;
}

/** The shape of our queryDatabase tool result (part.output when available). */
type QueryOutput = { rowCount: number; rows: Row[]; chartSpec: ChartSpec };

/**
 * Permissive view of a UIMessage part. The AI SDK's part union is heavily
 * generic; for rendering we only need a few fields, so we read them off a
 * narrowed shape rather than wrestle the full generic types.
 */
type UIPart = {
  type: string;
  text?: string;
  state?: string;
  output?: unknown;
  errorText?: string;
};

export default function MessageList({ messages, busy, error }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the latest content in view as messages stream in.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  return (
    <div className="chat-list">
      {messages.length === 0 ? (
        <p className="chat-empty-hint">
          Ask a question about your e-commerce data — e.g. &ldquo;What&rsquo;s
          revenue by category?&rdquo;
        </p>
      ) : null}

      {messages.map((message) => (
        <div
          key={message.id}
          className={`chat-message chat-message--${message.role}`}
        >
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

      {busy ? (
        <div className="chat-message chat-message--assistant">
          <div className="chat-bubble chat-typing">…</div>
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
    return (
      <div className="tool-result">
        <ChartRenderer chartSpec={output.chartSpec} rows={output.rows} />
      </div>
    );
  }
  if (part.state === "output-error") {
    return <p className="chart-empty">Query failed: {part.errorText}</p>;
  }
  return <p className="chart-empty">Running query…</p>;
}
