# Internal API

All mutating routes require a signed-in session cookie (`wos_session`) except webhooks.

Authorization is enforced on the server (`requirePermission`). Do not trust the client.

## Workflows

- `GET /api/workflows/:id` — draft, published version, version list
- `PATCH /api/workflows/:id` — save draft graph
- `POST /api/workflows/:id/publish` — publish current draft (blocked on validation errors)
- `POST /api/workflows/:id/run` — enqueue execution (`triggerType`: `manual` | `test`)
- `POST /api/workflows/:id/clone` — duplicate as a draft named “— Copy”
- `POST /api/workflows/:id/status` — `{ "status": "paused" | "published" | "archived" }`
- `POST /api/workflows/:id/copilot` — generate a graph from a prompt
- `POST /api/workflows/:id/explain`
- `GET /api/workflows/:id/health`
- `POST /api/workflows/import` — import `workflow-os.v1` JSON as a **draft** (never executed)

## Executions

- `GET /api/executions/:id`
- `POST /api/executions/:id/retry` — `{ "fromNodeId"?: string }`
- `GET /api/executions/compare?a=&b=`

## Webhooks

- `POST /api/webhooks/:token` — published workflows only. Paused workflows return 423 and do not start a run. `Authorization` headers are stripped from stored payloads.

Rate limits apply to auth and webhooks.
