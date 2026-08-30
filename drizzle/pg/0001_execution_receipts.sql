-- Execution receipts and optional on-chain verification flags.
-- Applied by `npm run db:migrate` / ensureMigrated().

ALTER TABLE workflows ADD COLUMN IF NOT EXISTS verify_on_chain BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS execution_receipts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  execution_id TEXT NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  root TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  chain_id TEXT,
  tx_hash TEXT,
  block_number TEXT,
  contract_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS execution_receipts_exec_seq_idx ON execution_receipts(execution_id, sequence);
CREATE INDEX IF NOT EXISTS execution_receipts_org_idx ON execution_receipts(organization_id);
CREATE INDEX IF NOT EXISTS execution_receipts_exec_idx ON execution_receipts(execution_id);
CREATE INDEX IF NOT EXISTS execution_receipts_status_idx ON execution_receipts(status);

INSERT INTO schema_migrations (id) VALUES ('0001_execution_receipts') ON CONFLICT (id) DO NOTHING;
