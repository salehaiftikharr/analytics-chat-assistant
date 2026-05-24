# Analytics Chat Assistant

A chat app where users ask natural-language questions about a dataset and get
back charts and statistics rendered inline. Ask *"What were monthly sales by
region last year?"* and receive a bar chart plus the underlying numbers, right
in the conversation. Conversations persist across page reloads, and the LLM
backend is **switchable between Anthropic and OpenAI** via one env var.

> **Status:** Planning. This document is a proposal for review — no application
> code has been written yet.

---

## 1. What we're building (the core idea)

The heart of the app is a loop that turns a sentence into data:

```
User question ──▶ LLM provider (with DB schema) ──▶ validated SQL ──▶ Postgres
                  (Anthropic │ OpenAI)                                   │
   Chat UI  ◀── chart + stats ◀── result + chart spec ◀─────────────────┘
        │
        └──▶ every message saved to / loaded from the `messages` table
```

1. The user types a question in a chat interface.
2. The backend hands that question — plus a description of the dataset's
   schema — to the configured **LLM provider** (Anthropic or OpenAI).
3. The provider responds with a **structured plan**: a read-only SQL query *and*
   a suggestion for how to visualize the result (chart type, axes, etc.).
4. The backend **validates** the SQL (single read-only `SELECT`), runs it
   against Postgres with a row limit and timeout, and returns rows + chart spec.
5. The frontend renders the result inline as a Recharts chart and/or a stat
   summary, appended to the chat thread.
6. The question and its answer are **persisted** to the database, so reloading
   the page restores the conversation.

---

## 2. Decisions locked in for v1

Confirmed during planning — these shape the build:

1. **NL → SQL:** the LLM generates SQL directly, made safe by strict validation
   + a read-only DB role (flexible, handles open-ended questions).
2. **Dataset:** an invented **e-commerce orders** dataset (customers, products,
   orders, order_items), swappable later.
3. **Conversation memory:** each question is **independent** in v1 — answers are
   persisted and reloaded, but the LLM does *not* yet use prior turns as
   context. (The schema leaves room to add this later.)
4. **Streaming:** build **non-streaming first**; add streaming at the end if
   time allows.
5. **Docker:** the **app runs in Docker during development too** — a
   containerized Next.js dev server with hot reload (source bind-mounted, a
   `node_modules` volume keeps the container's Linux binaries). The same Compose
   stack carries through to the final deliverable: `docker compose up` with only
   Docker installed. A production-optimized image (`Dockerfile`) is added near
   the end; dev uses `Dockerfile.dev`.

---

## 3. Tech stack and the role of each piece

| Piece | Role |
|-------|------|
| **Next.js (App Router) + TypeScript** | Full-stack framework. Serves the chat UI (React) *and* hosts the backend API route — one codebase, one deploy. |
| **API Route (`/api/chat`)** | The brain. Receives the question, calls the active LLM provider, validates + runs SQL, persists the exchange, returns rows + chart spec. All trust boundaries live here. |
| **LLM provider layer** | A common interface with two implementations (Anthropic, OpenAI), selected at runtime by `LLM_PROVIDER`. Each turns NL → `{ sql, chartSpec, summary }` via structured output / tool calling. |
| **Anthropic SDK / OpenAI SDK** | The two concrete provider clients behind the interface. |
| **PostgreSQL** | Stores **two things**: the analytics dataset (queried read-only) and the app's own `messages` table (read-write). |
| **`pg` (node-postgres)** | Connection pooling. Two roles: a **read-only role** for LLM-generated SQL, and an **app role** for reading/writing chat history. |
| **Persistence layer** | Saves each user question + assistant answer to `messages`, and loads history on page load. |
| **Recharts** | Renders bar/line/area/pie charts inline in the chat from the returned rows + chart spec. |
| **Docker Compose** | Runs Postgres (dev) or Postgres **+ the app** (final) with one command. Seeds the DB from `db/init` on first boot. |
| **SQL validation layer** | Guards the trust boundary: rejects anything that isn't a single `SELECT`, blocks DDL/DML, enforces `LIMIT`. |
| **Schema introspection** | Builds the human-readable schema description fed to the LLM so it knows what analytics tables/columns exist. |

---

## 4. Proposed project structure

```
analytics-chat-assistant/
├── README.md                      # this file
├── docker-compose.yml             # dev stack: app (+ Postgres from step 2)
├── Dockerfile.dev                 # dev image: Next.js dev server + hot reload
├── Dockerfile                     # production image (added near the end)
├── .dockerignore
├── .env.example                   # documented env vars (committed)
├── .env.local                     # real secrets (gitignored)
├── package.json
├── tsconfig.json
├── next.config.ts
│
├── db/
│   └── init/                      # auto-run by Postgres on first boot
│       ├── 01_analytics_schema.sql  # e-commerce tables
│       ├── 02_analytics_seed.sql    # sample orders data
│       ├── 03_app_schema.sql        # messages table (chat persistence)
│       └── 04_roles.sql             # read-only role + grants
│
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx               # the chat page (loads history on mount)
    │   ├── globals.css
    │   └── api/
    │       └── chat/
    │           └── route.ts       # POST: ask a question | GET: load history
    │
    ├── components/
    │   ├── ChatWindow.tsx         # container + state, fetches history
    │   ├── MessageList.tsx        # scrollable thread
    │   ├── MessageInput.tsx       # text box + send button
    │   ├── StatCard.tsx           # single-number / summary stat
    │   └── charts/
    │       ├── ChartRenderer.tsx  # picks the right chart from the spec
    │       ├── BarChartView.tsx
    │       ├── LineChartView.tsx
    │       └── PieChartView.tsx
    │
    ├── lib/
    │   ├── db.ts                  # pg pools: readOnlyPool + appPool
    │   ├── llm/
    │   │   ├── providers/
    │   │   │   ├── types.ts       # LLMProvider interface + shared types
    │   │   │   ├── anthropic.ts   # Anthropic implementation
    │   │   │   ├── openai.ts      # OpenAI implementation
    │   │   │   └── index.ts       # factory: pick provider from LLM_PROVIDER
    │   │   ├── prompt.ts          # system prompt + schema context
    │   │   └── tools.ts           # structured-output / tool definitions
    │   ├── query/
    │   │   ├── validate.ts        # SQL guardrails (SELECT-only, etc.)
    │   │   └── execute.ts         # run validated SQL via readOnlyPool
    │   ├── persistence/
    │   │   └── messages.ts        # save + load chat history via appPool
    │   └── schema/
    │       └── describe.ts        # produce analytics-schema text for the LLM
    │
    └── types/
        └── index.ts              # shared types: Message, ChartSpec, etc.
```

**Why it's shaped this way:** UI (`components/`) is separate from logic
(`lib/`), and `lib/` is split by concern — LLM access (`llm/`), safe querying
(`query/`), persistence (`persistence/`), and schema knowledge (`schema/`). The
single API route is the only place that wires them together, keeping the trust
boundary auditable.

### The provider abstraction (the key extensibility point)

`llm/providers/types.ts` defines one interface — conceptually:

```
interface LLMProvider {
  name: string
  generateQueryPlan(question, schemaDescription): Promise<QueryPlan>
}
// QueryPlan = { sql, chartSpec, summary }
```

`anthropic.ts` and `openai.ts` each implement it; `index.ts` is a factory that
reads `LLM_PROVIDER` (`"anthropic"` | `"openai"`) and returns the right one.
**Nothing outside `providers/` knows which vendor is active** — the API route
just calls `getProvider().generateQueryPlan(...)`. Adding a third provider later
means adding one file and one switch case, nothing else.

### Two database roles (the key safety point)

Persistence needs *write* access; LLM-generated SQL must never have it. So:

- **`appPool`** uses an app role with read/write on `messages` only — used by
  `persistence/messages.ts`.
- **`readOnlyPool`** uses a read-only role with `SELECT` on the analytics tables
  only — used by `query/execute.ts` for generated SQL.

Even a query that slips past validation cannot write, drop, or touch `messages`.

---

## 5. The request lifecycle (one question, end to end)

1. On load, **`ChatWindow`** does `GET /api/chat` → `persistence/messages.ts`
   returns prior messages → thread is restored.
2. **`MessageInput`** captures a question; **`ChatWindow`** POSTs it to
   `/api/chat`.
3. **`route.ts`** saves the user message, pulls the schema from
   `schema/describe.ts`, builds the prompt (`llm/prompt.ts`).
4. **`llm/providers/index.ts`** returns the active provider; its
   `generateQueryPlan` returns `{ sql, chartSpec, summary }`.
5. **`query/validate.ts`** confirms a single safe `SELECT`;
   **`query/execute.ts`** runs it via `readOnlyPool`.
6. **`route.ts`** saves the assistant answer (rows + chartSpec) to `messages`
   and returns it to the client.
7. **`ChartRenderer`** + **`StatCard`** render the answer inline.

---

## 6. Build plan (small, reviewable steps)

Each step is independently runnable/verifiable before moving on.

1. **Scaffold the project + Docker dev server.** Next.js + TypeScript app;
   install deps (`pg`, `@anthropic-ai/sdk`, `openai`, `recharts`); add
   `.env.example` (`LLM_PROVIDER`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, DB
   URLs); add `Dockerfile.dev` + `docker-compose.yml` to run the dev server in a
   container with hot reload. *Verify:* `docker compose up` serves a blank page
   on `localhost:3000` and edits hot-reload.
2. **Stand up Postgres in Docker.** `docker-compose.yml` (Postgres only) +
   `db/init`: analytics schema, seed data, `messages` table, and the read-only
   role + grants. *Verify:* `docker compose up`, then query both the analytics
   tables and `messages` manually.
3. **Connect the app to the DB.** Build `lib/db.ts` with `readOnlyPool` and
   `appPool` (timeouts, row caps). *Verify:* a temp route reads seed data via
   the read-only pool and writes/reads `messages` via the app pool.
4. **Static chat UI.** `ChatWindow`, `MessageList`, `MessageInput` with local
   state and hardcoded messages. *Verify:* messages render, input works.
5. **Schema description.** `schema/describe.ts` produces the analytics
   table/column text for the LLM. *Verify:* log it; matches the seed schema.
6. **Provider abstraction.** Define `providers/types.ts`; implement
   `anthropic.ts` and `openai.ts`; wire the `index.ts` factory to `LLM_PROVIDER`.
   *Verify:* run a sample question through **each** provider and compare the
   structured output by flipping one env var.
7. **SQL guardrails.** `query/validate.ts` (SELECT-only, block DDL/DML/multiple
   statements/comments, force `LIMIT`) and `query/execute.ts`. *Verify:*
   unit-test that bad queries are rejected and good ones pass.
8. **Wire the API route (POST).** `app/api/chat/route.ts` end to end: question →
   provider → validate → execute → response. *Verify:* `curl` a question and get
   rows + chart spec back.
9. **Chart rendering.** `ChartRenderer` + Recharts chart components driven by
   `chartSpec`. *Verify:* a real question renders a real chart inline.
10. **Connect UI to API.** `ChatWindow` calls POST `/api/chat` and appends the
    rendered answer. *Verify:* full loop works from the browser.
11. **Chat persistence.** Build `persistence/messages.ts`; have the POST handler
    save each exchange and add a GET handler to load history; `ChatWindow`
    fetches it on mount. *Verify:* reload the page — the conversation is still
    there.
12. **Error & empty states.** Handle no-rows, invalid SQL, provider failures,
    timeouts. *Verify:* trigger each path on purpose.
13. **Production image.** Add a production-optimized multi-stage `Dockerfile`
    (build + run, no dev tooling) and a production Compose profile/file.
    *Verify:* on a clean checkout with only Docker installed, the production
    stack comes up and the app works in the browser.
14. **Streaming (if time allows).** Stream the answer progressively instead of
    waiting. *Verify:* tokens/result appear incrementally; non-streaming path
    still works as fallback.
15. **Polish & docs.** Loading indicators, basic styling, finalize this README
    with run instructions for both dev and Docker modes.

---

## 7. Security & safety notes

Generated SQL touching a database is the main risk area; defended in layers:

- **Two DB roles** — generated SQL runs as a read-only role scoped to the
  analytics tables; only the app role can write, and only to `messages`.
- **SQL validation** — reject anything that isn't a single `SELECT`; block
  semicolons/multiple statements, comments, and DDL/DML keywords.
- **Row cap + statement timeout** — every generated query gets a `LIMIT` and a
  timeout so a huge or runaway query can't exhaust resources.
- **No secrets to the client** — provider API keys and DB credentials live only
  in the server-side API route, never in the browser bundle.

---

*Reply with any changes, or say "go" and I'll start at step 1.*
