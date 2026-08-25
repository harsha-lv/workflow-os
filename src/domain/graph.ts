export type WorkflowStatus = "draft" | "published" | "paused" | "archived";

export type ExecutionStatus =
  | "queued"
  | "running"
  | "waiting"
  | "success"
  | "failed"
  | "cancelled"
  | "timed_out";

export type StepStatus =
  | "pending"
  | "queued"
  | "running"
  | "waiting"
  | "success"
  | "failed"
  | "skipped"
  | "cancelled";

export type MembershipRole = "owner" | "admin" | "editor" | "viewer";

export type ErrorPolicy = "stop" | "continue" | "retry" | "fallback";

export type ApprovalDecision = "approve" | "reject" | "request_changes";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "changes_requested"
  | "timed_out"
  | "escalated";

export type Viewport = {
  x: number;
  y: number;
  zoom: number;
};

export type GraphPosition = {
  x: number;
  y: number;
};

export type GraphNodeErrorPolicy = {
  onError: ErrorPolicy;
  retries?: number;
  retryDelayMs?: number;
  fallbackTarget?: string;
};

export type GraphNode = {
  id: string;
  type: string;
  name: string;
  position: GraphPosition;
  config: Record<string, unknown>;
  disabled?: boolean;
  notes?: string;
  errorPolicy?: GraphNodeErrorPolicy;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
};

export type WorkflowGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  viewport?: Viewport;
};

export const emptyGraph = (): WorkflowGraph => ({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
});

export type WorkflowDefinition = {
  name: string;
  description?: string;
  graph: WorkflowGraph;
  variables?: Record<string, unknown>;
};

export type ValidationIssue = {
  severity: "error" | "warning";
  nodeId?: string;
  edgeId?: string;
  path?: string;
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};
