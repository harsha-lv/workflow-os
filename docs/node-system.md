# Node system

Each node is `{ definition, handler }`.

A definition includes id/type, name, icon, category, ports, JSON-ish input/output schemas, config fields, docs, and flags (`isTrigger`, `canPause`).

Handlers receive:

- resolved config (templates interpolated)
- inbound payload
- variable scope (`trigger`, `nodes`, `vars`, `env`)
- secret getter
- HTTP helper
- AI provider
- log / usage callbacks

To add a node:

1. Append a definition in `src/domain/nodes/definitions.ts`
2. Append a handler in `src/domain/nodes/handlers.ts`
3. Write a unit test for the handler or for a graph that uses it

The editor palette is generated from definitions. No page changes required.
