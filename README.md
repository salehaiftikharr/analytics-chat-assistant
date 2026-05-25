# Analytics Chat Assistant

A chat app where users ask natural-language questions about a dataset and get
back charts and statistics rendered inline. Ask *"What were monthly sales by
region last year?"* and receive a bar chart plus the underlying numbers, right
in the conversation. Conversations are saved and listed in a **sidebar** —
switch between them, start new ones, or delete — and the LLM backend is
**switchable between Anthropic and OpenAI** via one env var.

> **Status:** Complete — all 14 build steps are done. See **Getting started**
> below to run it.

---

## Getting started

**Prerequisites:** Docker (Desktop). Node.js is optional — only if you want to
run tooling on the host.

**1. Add your API key(s).** Copy the template and fill in at least one provider
key:

```bash
cp .env.example .env.local
# In .env.local: set ANTHROPIC_API_KEY and/or OPENAI_API_KEY,
# and choose LLM_PROVIDER=anthropic | openai
```

**2a. Development** — hot-reloading dev server + Postgres:

```bash
docker compose up --build
```

Open http://localhost:3000. Edits to `src/` reload live.

**2b. Production** — lean standalone image + Postgres:

```bash
docker compose -f docker-compose.prod.yml up --build
```

Open http://localhost:3000.

**Switching provider:** set `LLM_PROVIDER` (and optionally `ANTHROPIC_MODEL` /
`OPENAI_MODEL`) in `.env.local`, then restart — nothing else changes (see §4
"The provider seam").

**Re-seeding the database:** the `db/init` scripts run on first boot only. To
reset and re-seed, recreate the volume: `docker compose down -v` then `up`.

---

## 1. What we're building (the core idea)

The heart of the app is a loop that turns a sentence into data, orchestrated by
the **Vercel AI SDK**:

```
useChat (UI) ──▶ /api/chat ──▶ streamText(model, tools) ──┐
                                (Anthropic │ OpenAI)       │ model calls the
                                                           ▼ queryDatabase tool
   Chat UI  ◀──── streamed text + chart ◀──── { rows, chartSpec } ◀── Postgres
        │                                          (validated, read-only)
        └──▶ every message saved to / loaded from the `messages` table
```

1. The user types a question; the `useChat` hook streams it to `/api/chat`.
2. The route calls the AI SDK's `streamText` with the active **model**
   (Anthropic or OpenAI, chosen by `LLM_PROVIDER`) plus a `queryDatabase` tool
   and a system prompt containing the schema description.
3. The model calls `queryDatabase` with a read-only `SELECT` and a `chartSpec`.
   The tool **validates** the SQL and runs it via the read-only pool, returning
   `{ rows, chartSpec }`.
4. The model writes a one-sentence summary; the SDK **streams** the text and the
   tool result back to the browser.
5. The frontend renders the tool result inline as a Recharts chart (the AI SDK
   "generative UI" pattern), alongside the streamed summary.
6. Each message (with its parts) is **persisted** to the database, so reloading
   restores the conversation — and follow-up questions keep prior context.

---

## 2. Decisions locked in for v1

Confirmed during planning — these shape the build:

1. **NL → SQL:** the LLM generates SQL directly, made safe by strict validation
   + a read-only DB role (flexible, handles open-ended questions).
2. **Dataset:** an invented **e-commerce orders** dataset (customers, products,
   orders, order_items), swappable later.
3. **Conversation memory:** **on.** `useChat` sends the thread to the model, so
   follow-up questions ("now break that down by month") keep prior context.
4. **Streaming:** **native** via the AI SDK (`streamText` + `useChat`) — answers
   stream from the first build, not as a later add-on.
5. **Docker:** the **app runs in Docker during development too** — a
   containerized Next.js dev server with hot reload (source bind-mounted, a
   `node_modules` volume keeps the container's Linux binaries). The same Compose
   stack carries through to the final deliverable: `docker compose up` with only
   Docker installed. A production-optimized image (`Dockerfile`) is added near
   the end; dev uses `Dockerfile.dev`.
6. **LLM orchestration:** the **Vercel AI SDK** is the provider abstraction.
   Switching Anthropic ↔ OpenAI is just choosing which model the SDK is handed
   (`LLM_PROVIDER`); the SDK normalizes prompts, tool calls, structured output,
   and streaming behind one `LanguageModel` interface.

---

## 3. Tech stack and the role of each piece

| Piece | Role |
|-------|------|
| **Next.js (App Router) + TypeScript** | Full-stack framework. Serves the chat UI (React) *and* hosts the backend API route — one codebase, one deploy. |
| **API Routes (`/api/chat`, `/api/conversations`)** | `/api/chat` runs `streamText` with the active model + the `queryDatabase` tool, streams the result, and persists the exchange. `/api/conversations` lists (GET) and deletes (DELETE) saved chats for the sidebar. All trust boundaries live here. |
| **Vercel AI SDK (`ai`)** | Provider abstraction + orchestration. `streamText` runs the model with the `queryDatabase` tool and streams text + tool results. One `LanguageModel` interface for every vendor. |
| **`@ai-sdk/anthropic` / `@ai-sdk/openai`** | Provider packages. `getModel()` returns one or the other based on `LLM_PROVIDER`; everything downstream is identical. |
| **`@ai-sdk/react` (`useChat`)** | React hook that manages the chat thread, input, and streaming on the client and talks to `/api/chat`. |
| **PostgreSQL** | Stores **two things**: the analytics dataset (queried read-only) and the app's own `messages` table (read-write). |
| **`pg` (node-postgres)** | Connection pooling. Two roles: a **read-only role** for LLM-generated SQL, and an **app role** for reading/writing chat history. |
| **Persistence layer** | Saves/loads each conversation's messages (with parts) in `messages`, and lists/deletes conversations for the sidebar. |
| **Recharts** | Renders bar/line/area/pie charts inline in the chat from the tool result (rows + chart spec). |
| **Docker Compose** | Runs Postgres (dev) or Postgres **+ the app** (final) with one command. Seeds the DB from `db/init` on first boot. |
| **SQL validation layer** | Guards the trust boundary: rejects anything that isn't a single `SELECT`, blocks DDL/DML, enforces `LIMIT`. |
| **Schema introspection** | Builds the human-readable schema description fed to the LLM so it knows what analytics tables/columns exist. |

---

## 4. Project structure

```
analytics-chat-assistant/
├── README.md                      # this file
├── docker-compose.yml             # dev stack: app + Postgres
├── docker-compose.prod.yml        # production stack: standalone image + Postgres
├── Dockerfile.dev                 # dev image: Next.js dev server + hot reload
├── Dockerfile                     # production image (multi-stage, standalone)
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
    │   ├── page.tsx               # renders <ChatApp/>
    │   ├── globals.css
    │   └── api/
    │       ├── chat/
    │       │   └── route.ts       # POST: streamText chat | GET: load one conversation
    │       └── conversations/
    │           └── route.ts       # GET: list chats | DELETE: remove a chat
    │
    ├── components/
    │   ├── ChatApp.tsx            # shell: sidebar + active conversation (active id in localStorage)
    │   ├── Sidebar.tsx            # conversation list: switch, New chat, delete
    │   ├── Conversation.tsx       # useChat host for one conversation
    │   ├── MessageList.tsx        # scrollable thread (text + chart tool results)
    │   ├── MessageInput.tsx       # text box + send button
    │   ├── StatCard.tsx           # single-number / summary stat
    │   └── charts/
    │       ├── ChartRenderer.tsx  # picks the right chart from the spec
    │       ├── chart-common.tsx   # shared colors / frame / tooltip
    │       ├── BarChartView.tsx
    │       ├── LineChartView.tsx
    │       ├── AreaChartView.tsx
    │       ├── PieChartView.tsx
    │       └── DataTable.tsx      # fallback for non-chartable results
    │
    ├── lib/
    │   ├── db.ts                  # lazy pg pools: getReadOnlyPool + getAppPool
    │   ├── llm/
    │   │   ├── model.ts           # getModel(): LLM_PROVIDER → AI SDK LanguageModel
    │   │   ├── prompt.ts          # system prompt + schema context
    │   │   └── tools.ts           # the queryDatabase AI SDK tool (+ chartSpec schema)
    │   ├── query/
    │   │   ├── validate.ts        # SQL guardrails (SELECT-only, etc.)
    │   │   └── execute.ts         # run validated SQL via readOnlyPool
    │   ├── persistence/
    │   │   └── messages.ts        # save/load/list/delete conversations via the app pool
    │   └── schema/
    │       └── describe.ts        # produce analytics-schema text for the LLM
    │
    └── types/
        └── index.ts              # shared types (Message, etc.)
```

**Why it's shaped this way:** UI (`components/`) is separate from logic
(`lib/`), and `lib/` is split by concern — LLM access (`llm/`), safe querying
(`query/`), persistence (`persistence/`), and schema knowledge (`schema/`). The
single API route is the only place that wires them together, keeping the trust
boundary auditable.

### The provider seam (the key extensibility point)

The Vercel AI SDK defines one `LanguageModel` interface; each provider package
implements it. Switching vendors is a single function, `llm/model.ts`:

```
getModel() = LLM_PROVIDER === "openai"
  ? openai(OPENAI_MODEL ?? "gpt-4.1")
  : anthropic(ANTHROPIC_MODEL ?? "claude-opus-4-7")
```

Everything downstream — the system prompt, the `queryDatabase` tool, structured
output, streaming, and the `useChat` hook — is identical regardless of vendor.
The SDK translates each provider's native message/tool/stream formats behind the
interface. Adding a third provider is: install its `@ai-sdk/*` package, add one
`case` to `getModel()`, document its API key. Nothing else changes.

### Two database roles (the key safety point)

Persistence needs *write* access; LLM-generated SQL must never have it. So:

- **`appPool`** uses an app role with read/write on `messages` only — used by
  `persistence/messages.ts`.
- **`readOnlyPool`** uses a read-only role with `SELECT` on the analytics tables
  only — used by `query/execute.ts` inside the `queryDatabase` tool.

Even a query that slips past validation cannot write, drop, or touch `messages`.

### Multiple conversations (the sidebar)

Chats are grouped by a `conversation_id` (a UUID kept in `localStorage`, so a
reload reopens the last chat). **`ChatApp`** is the shell: it loads the list from
`GET /api/conversations`, fetches the active chat's history, and renders
**`Sidebar`** (switch, New chat, delete) beside the active **`Conversation`**
(the `useChat` host, keyed by id so switching remounts it). Each chat's title is
its first question; `DELETE /api/conversations?conversationId=…` removes one. The
list refreshes after each answer (the `Conversation` calls back on completion).

---

## 5. The request lifecycle (one question, end to end)

1. On mount, **`ChatApp`** loads the conversation list (`GET /api/conversations`)
   for the sidebar and the active chat's prior messages (`GET /api/chat`),
   seeding `useChat`'s initial messages.
2. The user submits a question; **`useChat`** streams the thread to
   `POST /api/chat`.
3. **`route.ts`** builds the system prompt from `schema/describe.ts` and calls
   the AI SDK's **`streamText`** with `getModel()`, the conversation, and the
   `queryDatabase` tool.
4. The model calls **`queryDatabase({ sql, chartSpec })`**; the tool's `execute`
   runs `query/validate.ts` then `query/execute.ts` (read-only pool) and returns
   `{ rows, chartSpec }`.
5. The model writes a summary; `streamText` **streams** the text + tool result
   to the browser as message parts.
6. On finish, **`route.ts`** persists the messages (parts) to `messages`.
7. **`ChartRenderer`** renders the tool-result part inline; the summary text
   renders alongside it.

---

## 6. Build plan (small, reviewable steps)

Each step is independently runnable/verifiable. **All 14 steps are complete.**

1. **Scaffold the project + Docker dev server.** Next.js + TypeScript app; deps;
   `.env.example`; `Dockerfile.dev` + `docker-compose.yml` with hot reload.
   *Verify:* `docker compose up` serves a page on `localhost:3000`; edits reload.
   ✅ done
2. **Stand up Postgres in Docker.** `db/init`: analytics schema, seed data,
   `messages` table, read-only role + grants. *Verify:* query the tables. ✅ done
3. **Connect the app to the DB.** `lib/db.ts` with `readOnlyPool` + `appPool`
   (timeouts, row caps). *Verify:* a temp route round-trips both pools. ✅ done
4. **Static chat UI.** `ChatWindow`, `MessageList`, `MessageInput`. *Verify:*
   messages render, input works. ✅ done (container rewired to `useChat` in 10)
5. **Schema description.** `schema/describe.ts`. *Verify:* matches seed. ✅ done
6. **AI SDK provider layer.** Install `ai`, `@ai-sdk/anthropic`,
   `@ai-sdk/openai`, `@ai-sdk/react`, `zod` (remove the raw SDKs). Build
   `llm/model.ts` (`getModel()`), revise `llm/prompt.ts`, and define the
   `queryDatabase` tool in `llm/tools.ts`. *Verify:* run a question through
   **each** provider by flipping `LLM_PROVIDER`.
7. **SQL guardrails.** `query/validate.ts` (SELECT-only; block DDL/DML/multiple
   statements/comments; force `LIMIT`) + `query/execute.ts`, called inside the
   tool's `execute`. *Verify:* unit-test that bad queries are rejected.
8. **Chat API route (streaming).** `app/api/chat/route.ts`: `streamText` with
   the model + `queryDatabase` tool, returned as a UI message stream. *Verify:*
   `curl` the route and watch a streamed answer with tool results.
9. **Chart rendering.** `ChartRenderer` + Recharts components driven by the
   `chartSpec` in the tool-result message part. *Verify:* a real question
   renders a real chart.
10. **Connect UI with `useChat`.** Rewire `ChatWindow` to the `useChat` hook;
    render text parts + tool-result parts (charts). *Verify:* full loop works in
    the browser, streaming live.
11. **Chat persistence.** `persistence/messages.ts`; save on `streamText`'s
    `onFinish`, add the `GET` history handler, seed `useChat` on mount. *Verify:*
    reload — the conversation (and its context) is still there.
12. **Error & empty states.** Handle no-rows, invalid SQL (model retry on tool
    error), provider failures, timeouts. *Verify:* trigger each path.
13. **Production image.** Multi-stage `Dockerfile` + production Compose. *Verify:*
    clean checkout, Docker-only, `docker compose up` serves the app.
14. **Polish & docs.** Loading/streaming indicators, styling, finalize this
    README with run instructions for dev and Docker modes.

### Beyond the plan: multi-conversation sidebar

After the 14 steps, a sidebar was added so you can keep multiple chats, switch
between them, start new ones, and delete them. This split the single-chat
`ChatWindow` (steps 4 & 10) into **`ChatApp`** (shell) + **`Sidebar`** +
**`Conversation`**, and added the `GET`/`DELETE` `/api/conversations` endpoint —
see §4 "Multiple conversations (the sidebar)".

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

*Built with the Vercel AI SDK. All 14 steps complete — see Getting started to run it.*
