"use client";

import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import ChartRenderer from "@/components/charts/ChartRenderer";
import type { ChartSpec } from "@/lib/llm/tools";
import type { Row } from "@/components/charts/chart-common";

interface MessageListProps {
  messages: UIMessage[];
  /** True while waiting for the assistant to start responding. */
  pending?: boolean;
  /** True while a request is in flight (disables follow-up chips). */
  busy?: boolean;
  error?: Error;
  /** Send a question (used by the empty-state examples and follow-up chips). */
  onAsk?: (question: string) => void;
}

const EXAMPLES = [
  "What's revenue by category?",
  "Show monthly revenue as a line chart",
  "Top 5 customers by total spend",
];

/** The shape of our queryDatabase tool result (part.output when available). */
type QueryOutput = { rowCount: number; rows: Row[]; chartSpec: ChartSpec };

/** The shape of our suggestFollowups tool result. */
type FollowupOutput = { suggestions: string[] };

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
  busy,
  error,
  onAsk,
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
          <div className="chat-chips">
            {EXAMPLES.map((question) => (
              <button
                key={question}
                type="button"
                className="chip"
                onClick={() => onAsk?.(question)}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {messages.map((message, index) => {
        const parts = message.parts as unknown as UIPart[];
        // Follow-up chips render below the bubble, not inside it.
        const followups = parts
          .filter(
            (p) => p.type === "tool-suggestFollowups" && p.state === "output-available",
          )
          .flatMap((p) => (p.output as FollowupOutput).suggestions);

        return (
          <div
            key={message.id || index}
            className={`chat-message chat-message--${message.role}`}
          >
            <div className="chat-role">
              {message.role === "user" ? "You" : "Assistant"}
            </div>
            <div className="chat-bubble">
              {parts.map((part, i) => {
                if (part.type === "text") {
                  return <span key={i}>{part.text}</span>;
                }
                if (part.type === "tool-queryDatabase") {
                  return <ToolResult key={i} part={part} />;
                }
                return null;
              })}
            </div>
            {followups.length > 0 ? (
              <div className="followups">
                {followups.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    className="chip"
                    disabled={busy}
                    onClick={() => onAsk?.(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

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
        {sql ? <SqlDisclosure sql={sql} /> : null}
      </div>
    );
  }
  if (part.state === "output-error") {
    return <p className="chart-empty">Query failed: {part.errorText}</p>;
  }
  return <p className="chart-empty">Running query…</p>;
}

function SqlDisclosure({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable; ignore */
    }
  }

  return (
    <details className="sql-details">
      <summary>View SQL</summary>
      <div className="sql-block">
        <button type="button" className="sql-copy" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
        <pre className="sql-code">{sql}</pre>
      </div>
    </details>
  );
}
