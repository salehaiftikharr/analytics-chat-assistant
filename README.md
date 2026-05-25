# Analytics Chat Assistant

A chat-native BI tool. Ask questions about an e-commerce dataset in plain
English and get back **real charts, stat cards, and tables rendered inline** in
the conversation — with a short narrative and **clickable follow-up suggestions**
to drill in further. Works with **both Claude and GPT** (switchable live),
streams responses, and persists every conversation.

```
You:  What's revenue by category?
AI:   Home & Kitchen leads (~$30K), then Electronics (~$21K)…
      ┌─────────────────────────────────┐
      │  ▆▆▆  ▆▆   ▆▆   ▆    ▆           │   ← live bar chart
      └─────────────────────────────────┘
      [ Break down by country? ] [ Revenue over time? ]   ← follow-up chips
```

---

## ✅ Requirements at a glance

| Requirement | Status | Where / how |
|---|:---:|---|
| **Dual provider** (Claude + OpenAI, switch via config) | ✅ | `LLM_PROVIDER` env var **and** a live Claude/GPT toggle. One `getModel()` seam — see [Architecture](#how-it-works). |
| **Real database** (analytics + chat, local) | ✅ | PostgreSQL in Docker. [Why Postgres ↓](#dataset--database-choice) |
| **UI tool — key metric** | ✅ | `StatCard` (single-value answers) |
| **UI tool — trends/comparisons** | ✅ | Bar / line / area / pie charts + data table (Recharts) |
| **UI tool — interactive control** | ✅ | Assistant-rendered **follow-up suggestion chips** (`suggestFollowups` tool) |
| **Streaming** | ✅ | Vercel AI SDK `streamText` + `useChat`; text and tool results render as they arrive |
| **Persistence** (survive reload, resume) | ✅ | Saved to Postgres; sidebar to revisit and continue any chat |
| **Bring your own dataset** | ✅ | E-commerce orders — [rationale ↓](#dataset--database-choice) |
| **Fully dockerized & local** | ✅ | `docker compose up` — no host Node/DB needed |

A couple of honest limitations are listed under [Known gaps](#known-gaps--limitations).

---

## Quick start

**Prerequisites:** Docker Desktop. Nothing else — no Node, no Postgres on your host.

```bash
# 1. Configure providers
cp .env.example .env.local
#    → open .env.local and set ANTHROPIC_API_KEY and/or OPENAI_API_KEY
#    → set LLM_PROVIDER=anthropic  (or openai)

# 2a. Development (hot-reloading app + Postgres)
docker compose up --build

# 2b. Production (lean standalone image + Postgres)
docker compose -f docker-compose.prod.yml up --build
```

Then open **http://localhost:3000**.

- The database seeds itself on first boot (sample data in `db/init/`).
- Only the selected provider's key is required; add both to try the toggle.
- **Reset the database:** `docker compose down -v` then `up` (re-runs the seed).

That's it — a fresh clone with only Docker installed comes up end to end.

---

## How it works

```
 Browser (useChat)
   │  POST /api/chat   { messages, conversationId, provider }
   ▼
 /api/chat  ──>  streamText(getModel(provider), tools, systemPrompt)
   │                         │
   │            ┌────────────┴─────────────┐
   │            ▼                           ▼
   │     queryDatabase tool         suggestFollowups tool
   │     · validate SQL             · returns 2–4 next questions
   │     · run on READ-ONLY pool
   │            │
   ▼            ▼
 stream text + tool results  ──>  Recharts / StatCard / Table + follow-up chips
   │
   └─ on finish: save the whole conversation to Postgres (APP pool)
```

**Provider abstraction (the seam).** The Vercel AI SDK gives every model one
`LanguageModel` interface. `src/lib/llm/model.ts` is the *only* file that names a
vendor:

```ts
getModel(provider) =
  provider === "openai" ? openai("gpt-4.1") : anthropic("claude-opus-4-7")
```

Everything downstream (prompt, tools, streaming, the React hook) is identical
regardless of vendor. Switching is just an env var or the header toggle — the
choice rides in each request's body, so no restart and no code change.

**Tools that render UI.** The model answers by calling tools, not by writing
prose. Two tools today, both in `src/lib/llm/tools.ts`:
- `queryDatabase` — takes a SQL `SELECT` + a `chartSpec`; runs the query and
  returns `{ rows, chartSpec }`. The client renders the right component.
- `suggestFollowups` — returns 2–4 next questions, rendered as clickable chips.

**Streaming.** `streamText(...).toUIMessageStreamResponse()` streams text and
tool results as they're produced; the `useChat` hook renders them incrementally.

**Persistence & conversations.** Each message (with its parts — text, chart
data, follow-ups) is stored as a row in `messages`. A sidebar lists every
conversation; you can switch, start new ones, delete, and resume after a reload.

### Safety: two database roles + SQL validation

The model writes SQL, so that's the main risk surface. It's defended in layers:

1. **Read-only role.** Generated SQL runs as `aca_readonly` — `SELECT` on the
   analytics tables only. It physically cannot write, drop, or even see the
   `messages` table. Chat persistence uses a separate `aca_app` role.
2. **Validation** (`src/lib/query/validate.ts`) — rejects anything that isn't a
   single `SELECT` (blocks DDL/DML, multiple statements, comments) and enforces a
   `LIMIT`, *before* the query reaches Postgres.
3. **Timeouts & row caps** so a runaway query can't exhaust resources.

If a query is rejected or errors, the error goes back to the model, which can
fix its SQL and retry (bounded by a step limit).

### Adding a new tool (≈20 minutes)

The tool layer is meant to be extended. To add, say, a "compare two periods" tool:
1. Define it in `src/lib/llm/tools.ts` with a Zod `inputSchema` + `execute`.
2. Add it to the `tools` map in `src/app/api/chat/route.ts`.
3. Render its result part in `src/components/MessageList.tsx`.

No provider-specific code, no plumbing changes.

---

## Dataset & database choice

**Dataset — a small e-commerce store** (invented, seeded in `db/init/`):
`customers` (18, across 6 countries) → `orders` (300, across 2024, with statuses)
→ `order_items` (854) → `products` (20, across 5 categories).

*Why this dataset:* it has exactly the shape an analytics tool shines on —
a **time dimension** (order dates), **categorical dimensions** (category,
country, status), and a clear **measure** (`quantity × unit_price` = revenue).
That supports trends, group comparisons, rankings, and single-KPI questions —
the full range the assistant needs to show off — while staying small enough to
read and reason about.

**Database — PostgreSQL.** The workload is relational analytics: joins across
orders/items/products/customers, `GROUP BY`, aggregates, date bucketing. SQL is
the natural fit, and Postgres does it well with a tiny footprint, runs trivially
in Docker, and lets us enforce the security model **in the database** via roles
and grants (read-only vs. read-write) rather than trusting application code. It
also stores both halves of the app — the analytics data *and* chat history — in
one local service. (For a much larger analytics workload, a columnar store like
DuckDB/ClickHouse would be the next step; at this scale Postgres is the right,
simplest choice.)

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                  # renders <ChatApp/>
│   └── api/
│       ├── chat/route.ts         # POST: stream answer | GET: load a conversation
│       └── conversations/route.ts# GET: list chats | DELETE: remove a chat
├── components/
│   ├── ChatApp.tsx               # shell: sidebar + active conversation
│   ├── Sidebar.tsx               # list / new / delete / switch chats
│   ├── Conversation.tsx          # useChat host (streaming, provider in request)
│   ├── MessageList.tsx           # renders text, charts, follow-up chips
│   ├── MessageInput.tsx          # auto-growing composer (Enter to send)
│   ├── ModelSwitcher.tsx         # Claude / GPT toggle
│   ├── StatCard.tsx              # single-metric card
│   └── charts/                   # ChartRenderer + Bar/Line/Area/Pie + DataTable
└── lib/
    ├── llm/
    │   ├── model.ts              # getModel(): the provider seam
    │   ├── prompt.ts             # system prompt (rules + schema)
    │   └── tools.ts              # queryDatabase + suggestFollowups tools
    ├── query/{validate,execute}.ts  # SQL guardrails + read-only execution
    ├── persistence/messages.ts   # save / load / list / delete conversations
    ├── schema/describe.ts        # introspects the DB → schema text for the LLM
    └── db.ts                     # two pg pools (read-only + app)

db/init/                          # auto-run on first DB boot
├── 01_analytics_schema.sql       # e-commerce tables (+ column comments)
├── 02_analytics_seed.sql         # sample data
├── 03_app_schema.sql             # messages table (chat persistence)
└── 04_roles.sql                  # read-only + app roles and grants
```

The schema text the LLM sees is **introspected from the live database**
(`schema/describe.ts`), so it always matches the real tables — and, because it
introspects through the read-only role, it can't even tell the model that the
`messages` table exists.

---

## AI tools & open source used

- **Built with [Claude Code](https://claude.com/claude-code)** — the entire
  project was planned and written in an agentic pair-programming loop with
  Claude (Opus). Decisions, code, and verification were done collaboratively;
  this README documents the result.
- **[Vercel AI SDK](https://ai-sdk.dev)** (`ai`, `@ai-sdk/anthropic`,
  `@ai-sdk/openai`, `@ai-sdk/react`) — the provider abstraction, tool calling,
  streaming, and the `useChat` hook. This is what makes dual-provider a one-line
  seam.
- **[Recharts](https://recharts.org)** — the bar/line/area/pie chart components.
- **[node-postgres](https://node-postgres.com) (`pg`)** — Postgres driver / pools.
- **[Zod](https://zod.dev)** — tool input schemas.
- **[Next.js](https://nextjs.org) (App Router) + React + TypeScript** — app
  framework; API routes and the UI live in one codebase.
- **PostgreSQL** and **Node** official Docker images for the local stack.

Everything else (provider seam, tool design, SQL guardrails, schema
introspection, persistence, the UI) is application code written for this project.

---

## Known gaps & limitations

Being upfront about what's intentionally out of scope or imperfect:

- **No automated tests.** The SQL validator and provider seam are the obvious
  first candidates; verification so far has been manual + type-checking.
- **Single-user, no auth** (as the brief allows). The conversation list is keyed
  by a per-browser id in `localStorage`, so chats don't follow you across
  browsers/devices.
- **SQL safety is validation + a read-only role, not a full SQL parser.** A
  cleverly-crafted *read* query could still run; that's acceptable here because
  the role can only `SELECT` non-sensitive analytics tables, but a production
  system would add a real parser/allow-list and per-statement cost limits.
- **The model picks the chart type**, and occasionally a different type would
  read better. There's a sensible fallback to a table/stat card when a chart
  doesn't fit.
- **Follow-up chips depend on the model** calling `suggestFollowups`; the prompt
  asks for it and both providers comply reliably, but it isn't forced.
- **Provider switch applies to new messages**, not retroactively to a
  mid-stream response.

---

## What I'd do with another 6 hours

1. **Tests** — unit tests for `validate.ts` (the security boundary) and the
   `getModel` seam; a couple of integration tests that drive `/api/chat` with a
   mocked model and assert the tool-call → render path.
2. **Richer interactions** — let follow-ups carry structured drill-down params
   (e.g. "filter to this category") rather than re-asking in prose, and add
   cross-filtering between a chart and a table.
3. **Harden SQL** — swap the regex guardrails for a real Postgres parser
   (allow-list of statement shapes), add `EXPLAIN`-based cost limits, and surface
   the validated SQL + row count as a small "trust" footer.
4. **Smarter charts** — let the model express axis formatting (currency, dates),
   multi-series comparisons, and "stat card with delta vs. previous period."
5. **Conversation niceties** — rename/pin chats, server-side conversation
   ownership (real multi-user), and prompt-cache the schema prefix more
   aggressively for lower latency/cost.
6. **Observability** — log token usage and tool latency per message; show a
   subtle per-answer "answered by Claude/GPT in N ms" line.
