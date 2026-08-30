# FlowForge Architecture

FlowForge is a full-stack workflow automation platform.

## Core Components

- Next.js application for the web interface
- TypeScript application logic
- Visual workflow builder
- Workflow execution engine
- PostgreSQL/Supabase production database
- SQLite support for local development
- Authentication and user management
- Organizations and projects
- Workflow versions and execution history
- Approvals and integrations
- Secrets management
- Audit logging
- Execution receipts

## Execution Flow

1. User creates a workflow.
2. The workflow is stored as a versioned graph.
3. The execution engine processes the workflow.
4. Individual execution steps are recorded.
5. The execution result is stored as a receipt.
6. Eligible executions can be verified using the blockchain layer.
