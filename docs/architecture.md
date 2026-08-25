# Architecture

Workflow OS is a single Next.js application with a hard internal split:

```
src/
  app/          HTTP + pages
  components/   UI
  domain/       pure logic (nodes, engine, expressions, authz, billing)
  db/           schema + migrations
  server/       sessions, services, worker, seed
```

The browser never talks to the engine directly. It mutates a **workflow definition**. Publishing snapshots an immutable **version**. Running creates an **execution** row with status `queued`. A worker claims it.

## Tenancy

`User → Membership(role) → Organization → Project → Workflow → Version → Execution`

Authorization is checked in `requirePermission` on the server. Frontend hiding is not a security boundary.

## Design principles in code

- Node types live in a registry (`src/domain/nodes`). The editor imports definitions; the engine imports handlers.
- Expressions are parsed and evaluated without `eval` or `Function`.
- Secrets are encrypted at rest and resolved only inside handlers.
- AI calls go through `AIProvider`. SpaceXAI is the default live provider. Missing keys use a mock that labels its output `mocked: true`.
- Execution is independent of the request that enqueued it. `runPersistedExecution` can be called from an API route (local DX) or from `npm run worker`.
