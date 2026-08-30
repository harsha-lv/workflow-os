# Internal API

All mutating routes require a signed-in session cookie (`wos_session`) except webhooks.

Authorization is enforced on the server (`requirePermission`). Do not trust the client.

## Workflows

- `GET /api/workflows/:id` — draft, published version, version list
- `PATCH /api/workflows/:id` — save draft graph and/or `{ "verifyOnChain": boolean }`
- `POST /api/workflows/:id/publish` — publish current draft (blocked on validation errors)
- `POST /api/workflows/:id/run` — enqueue execution (`triggerType`: `manual` | `test`)
- `POST /api/workflows/:id/clone` — duplicate as a draft named “— Copy”
- `POST /api/workflows/:id/status` — `{ "status": "paused" | "published" | "archived" }`
- `POST /api/workflows/:id/copilot` — generate a graph from a prompt
- `POST /api/workflows/:id/explain`
- `GET /api/workflows/:id/health`
- `POST /api/workflows/import` — import `workflow-os.v1` JSON as a **draft** (never executed)

## Executions

- `GET /api/executions/:id` — includes the latest receipt when present
- `POST /api/executions/:id/retry` — `{ "fromNodeId"?: string }`
- `GET /api/executions/compare?a=&b=`
- `GET /api/executions/:id/receipt` — append-only receipts for the run
- `POST /api/executions/:id/receipt` — `{ "action": "retry" }` retries a failed anchor
- `POST /api/executions/:id/verify` — recompute the canonical root and compare

## Public verification

- `GET /api/verify/:id` — no auth. Returns hashes and chain metadata only. No inputs, outputs, or secrets.
- `GET /verify/:id` — public HTML proof page

## Webhooks

- `POST /api/webhooks/:token` — published workflows only. Paused workflows return 423 and do not start a run. `Authorization` headers are stripped from stored payloads.

Rate limits apply to auth and webhooks.
