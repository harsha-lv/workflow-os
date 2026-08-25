# User guide

## First run

1. Sign in (or create a workspace).
2. Open **Templates** or start blank.
3. Connect nodes. Configure fields. Use `{{nodes.extract.email}}` to reference earlier data.
4. **Test** runs the draft. **Publish** freezes a version for production runs.

## Reading a run

Open **Runs**, pick an execution, select a node. You will see input, config, output, duration, logs, and errors.

## Approvals

When a workflow pauses, it appears in **Approvals**. Approve, reject, or request changes. The run resumes from that node.

## Keyboard

- `⌘/Ctrl + K` command palette
- `⌘/Ctrl + Z` undo in the editor
- `Shift + ⌘/Ctrl + Z` redo
- `⌘/Ctrl + D` duplicate selected nodes
- Delete / Backspace removes selected nodes (not while typing)

## Secrets

Create workspace secrets. HTTP nodes can interpolate names; the worker injects values. You will only ever see the last four characters in the UI.
