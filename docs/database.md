# Database

SQLite via libSQL for local development. The schema is relational with foreign keys and indexes, and is intended to move to Postgres without a rewrite of domain code.

Tables:

- `users`, `organizations`, `memberships`
- `projects`
- `workflows`, `workflow_versions`, `workflow_nodes`, `workflow_edges`
- `executions`, `execution_steps`
- `approvals`
- `integrations`, `secrets`
- `templates`
- `audit_logs`
- `usage_events`

The editor's source of truth is `workflow_versions.definition` (JSON). Node and edge rows are a queryable projection written on save/publish.

Apply schema: `ensureMigrated()` runs `CREATE TABLE IF NOT EXISTS` on boot.

Indexes cover org-scoped listing, webhook tokens, execution status, and audit time.
