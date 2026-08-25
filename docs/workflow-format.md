# Workflow format

A versioned definition looks like:

```json
{
  "name": "Inbound lead qualification",
  "description": "...",
  "graph": {
    "nodes": [
      {
        "id": "t1",
        "type": "webhook.trigger",
        "name": "New lead",
        "position": { "x": 80, "y": 240 },
        "config": { "pathHint": "lead" }
      }
    ],
    "edges": [
      { "id": "e1", "source": "t1", "target": "n1", "sourceHandle": "out" }
    ],
    "viewport": { "x": 0, "y": 0, "zoom": 1 }
  }
}
```

Rules:

- `type` must exist in the node registry.
- Triggers have no inbound edges.
- Conditions and approvals use `sourceHandle` (`true` / `false`, `approved` / `rejected` / `changes`).
- Draft edits never mutate a published version. Saving after publish creates `version + 1`.
- Executions store `workflow_version_id` so history stays stable.
