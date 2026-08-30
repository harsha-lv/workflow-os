export type ReceiptStatus = "pending" | "confirmed" | "failed" | "mocked";

export type CanonicalStep = {
  nodeId: string;
  nodeType: string;
  status: string;
  attempt: number;
  inputHash: string;
  outputHash: string;
  configHash: string;
};

export type CanonicalReceipt = {
  executionId: string;
  organizationId: string;
  workflowId: string;
  workflowVersionId: string;
  workflowVersionHash: string;
  triggerType: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  outputHash: string;
  errorHash: string;
  previousRoot: string | null;
  steps: CanonicalStep[];
};

export type ExecutionReceiptView = {
  id: string;
  organizationId: string;
  executionId: string;
  sequence: number;
  root: string;
  payload: CanonicalReceipt;
  chainId: string | null;
  txHash: string | null;
  blockNumber: string | null;
  contractAddress: string | null;
  status: ReceiptStatus;
  createdAt: Date;
  verifiedAt: Date | null;
};

export type VerificationOutcome =
  | "integrity_verified"
  | "integrity_failed"
  | "blockchain_anchored"
  | "demo_verified"
  | "pending"
  | "anchor_failed";

export type VerificationResult = {
  valid: boolean;
  outcome: VerificationOutcome;
  root: string;
  computedRoot: string;
  sequence: number;
  receiptId: string;
  executionId: string;
  status: ReceiptStatus;
  mocked: boolean;
  chainId: string | null;
  txHash: string | null;
  blockNumber: string | null;
  contractAddress: string | null;
  explorerUrl: string | null;
  verifiedAt: string | null;
  createdAt: string;
  chainOk: boolean | null;
  message: string;
};
