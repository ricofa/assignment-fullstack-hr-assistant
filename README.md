# Harness fullstack

A TypeScript pnpm workspace for a PT Bisi HR assistant:

- `apps/api`: Hono API with Zod validation.
- `apps/web`: React, Vite, Tailwind CSS, and file-based TanStack Router.
- `packages/agents`: Anvia agent, mock Indonesian HR context, Tavily web tools, and Lens tracing.
- `packages/db`: PostgreSQL 16, Drizzle ORM, and Anvia's durable agent-memory tables.

## Requirements

Use Node.js 24 or newer and the pnpm version declared in the root `package.json`.
The agent package requires Node.js 24 or newer.

Set these values in the workspace root `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/harness
OPENAI_API_KEY=your-devscale-api-key
OPENAI_BASE_URL=your-devscale-compatible-base-url
TAVILY_API_KEY=your-tavily-api-key
ANVIA_LENS_BASE_URL=http://localhost
ANVIA_LENS_PUBLIC_KEY=your-lens-project-public-key
ANVIA_LENS_SECRET_KEY=your-lens-project-secret-key
```

The database URL uses port `5433`, which is the host port published by
`docker-compose.dev.yaml`. Keep real credentials in `.env`; do not commit them.

## Development

Start PostgreSQL and apply the checked-in database migration, then start the API
and web app:

```sh
pnpm install
docker compose -f docker-compose.dev.yaml up -d
pnpm --filter @harness/db db:migrate
pnpm dev
```

Web: http://localhost:5173. API: http://localhost:3000. Vite proxies `/api`
requests to the API during development.

The home page lists saved conversations and has a message composer. Sending a
message creates a session and opens `/s/:id`. Session history is stored in
PostgreSQL for the fixed user `default-user`. Session titles are generated from
the first message and can be edited or deleted from the sidebar.

Assistant replies stream into the chat. The message controls can copy user
messages and assistant replies, and show available token/context usage and the
measured response time. Response times are stored in the current browser's
`sessionStorage`; historical messages without a saved duration show no recorded
time.

The API exposes these chat routes:

- `GET /api/chat/sessions`: list saved sessions.
- `GET /api/chat/:sessionId`: load a session's messages.
- `POST /api/chat/:sessionId`: stream a reply for a session.
- `PATCH /api/chat/:sessionId/title`: edit a session title.
- `DELETE /api/chat/:sessionId`: delete a session and its messages.

The chat route parses Anvia client requests, calls `runAgent()`, and returns
`agentToClientStream()` through `createClientStreamResponse()`. The web app uses
`useChat()` with `createHttpClientTransport()` and Anvia's headless thread,
message, and composer components. API credentials stay on the server.

`pnpm dev` builds the shared database and agent packages before starting both
apps. Restart it after changing code in either shared package.

```sh
curl http://localhost:3000/api/health
curl 'http://localhost:3000/api/hello?name=Hono'
```

The hello endpoint defaults to `world` and rejects blank names with HTTP 400.
Set `PORT` to override the API port; update Vite's proxy target to match.

Add web routes in `apps/web/src/routes`. The route tree is generated
automatically by Vite during development and by `pnpm routes` before
typechecking/building. Do not edit `apps/web/src/routeTree.gen.ts` manually.

## Agents

The workspace root `.env` supplies the Devscale OpenAI-compatible gateway
credentials and Tavily API key. The current default model is
`deepseek-v4.1-flash`; `runAgent()` also accepts an optional `modelId` and
`maxTurns` (default: 25). `getModel(modelId)` is exported for direct model
access. The OpenAI-compatible adapter uses the Chat Completions API.

```ts
import { runAgent } from '@harness/agents'

const stream = runAgent({
  messages: [
    { role: 'user', content: 'Bagaimana cara mengajukan cuti tahunan di PT Bisi?' },
  ],
})

for await (const delta of stream.textStream) {
  process.stdout.write(delta)
}
const result = await stream.result
```

`runAgent()` returns Anvia's stream handle directly and accepts `messages`, not
a `prompt`. The API supplies memory session details when it calls the agent.
The `search-web` tool searches with Tavily; `read-webpage` extracts content from
a specific HTTP or HTTPS URL. Both use `TAVILY_API_KEY` when called.

Edit the prompt in `packages/agents/src/instruction.ts`, mock company policies
in `packages/agents/src/context/document.ts`, and Indonesian employment
references in `packages/agents/src/context/indonesia-rules.ts`. Company policies
are demonstration data, not official PT Bisi policies. Legal summaries link to
public sources and should be checked for changes before use in individual
decisions. Keep this package on the server.

## Lens tracing

`packages/agents/src/lens.ts` passes the root environment credentials to
`LensClient`: `ANVIA_LENS_BASE_URL`, `ANVIA_LENS_PUBLIC_KEY`, and
`ANVIA_LENS_SECRET_KEY`. `runAgent()` registers the Lens observer. The base URL
is the Lens browser origin, without `/api` or an OTLP path. The service name is
`pt-bisi-hr`; `captureMode: 'full'` includes prompt and response payloads in
traces.

Agent and eval runs send traces to Lens. Each eval calls `lens.close()` in a
`finally` block so queued traces can be exported before exit, and registers
`lens.evalReporter({ includePayloads: true })` to export evaluation results and
payloads. Other short-lived callers should call
`await lens.flush()` after a run and `await lens.close()` at shutdown.

## HR evaluations

`packages/agents/src/evals` contains 20 Indonesian cases in four standalone
evals: `working-hours.ts`, `leave.ts`, `payroll.ts`, and `thr.ts` (five cases
each). Each file calls `runEvalCli()` with inline cases, an agent call, and
three metrics. `input` is the employee's question, `expected` is the reference
answer, and `metadata.numberPattern` is the numeric regex stored as text.
The cases exercise the mock company policies and Indonesian reference context;
they do not independently certify current employment law.

Every case uses three metrics:

- `correctness`: Anvia `gEval()` (imported as `gEvals`) with a 0–10 rubric,
  normalized to 0–1 with a 0.8 threshold.
- `answerRelevancy`: an LLM judge with a 0.8 threshold.
- `contains`: a case-specific, case-insensitive regex check for expected
  numbers, times, units, or rupiah amounts.

Run one suite or all four in order:

```sh
pnpm run evals:1 # Working hours
pnpm run evals:2 # Leave
pnpm run evals:3 # Payroll and holidays
pnpm run evals:4 # THR
pnpm run evals  # All suites; stops if a suite fails
```

Each live eval loads the root `.env` if present and makes billable model calls
through the configured Devscale gateway. Tavily may also be used when the agent
checks external sources. Failed checks or invalid runs set a nonzero exit code.

## Checks and production builds

```sh
pnpm typecheck
pnpm build
pnpm --filter @harness/api start
pnpm --filter @harness/web preview
```

The web build is in `apps/web/dist`; the API build is in `apps/api/dist`. Vite
preview serves the web build for local inspection. In production, configure
your web host to fall back to `index.html` for client routes and reverse proxy
`/api` to the API server.
