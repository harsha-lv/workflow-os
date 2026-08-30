import { createHash } from "node:crypto";
import type { CanonicalReceipt, CanonicalStep } from "./types";

const SECRET_KEY =
  /^(password|passwd|secret|token|apikey|api_key|authorization|cookie|privatekey|private_key|encryptedvalue|encrypted_value|credential|bearer|x[-_]?api[-_]?key)$/i;

export function isSecretKey(key: string): boolean {
  const compact = key.replace(/[^a-z0-9]/gi, "");
  return SECRET_KEY.test(key) || SECRET_KEY.test(compact);
}

export function stripSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSecrets);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (isSecretKey(key)) continue;
      out[key] = stripSecrets(nested);
    }
    return out;
  }
  return value;
}

export function canonicalize(value: unknown): unknown {
  const cleaned = stripSecrets(value);
  return sortValue(cleaned);
}

function sortValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    const out: Record<string, unknown> = {};
    for (const [key, nested] of entries) out[key] = sortValue(nested);
    return out;
  }
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashCanonical(value: unknown): string {
  return sha256Hex(canonicalJson(value));
}

export function isoOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function buildCanonicalReceipt(input: {
  executionId: string;
  organizationId: string;
  workflowId: string;
  workflowVersionId: string;
  workflowVersionHash: string;
  triggerType: string;
  status: string;
  startedAt: Date | string | null | undefined;
  endedAt: Date | string | null | undefined;
  output: unknown;
  error: unknown;
  previousRoot: string | null;
  steps: Array<{
    nodeId: string;
    nodeType: string;
    status: string;
    attempt: number;
    input: unknown;
    output: unknown;
    config: unknown;
  }>;
}): CanonicalReceipt {
  const steps: CanonicalStep[] = [...input.steps]
    .map((step) => ({
      nodeId: step.nodeId,
      nodeType: step.nodeType,
      status: step.status,
      attempt: step.attempt,
      inputHash: hashCanonical(step.input ?? null),
      outputHash: hashCanonical(step.output ?? null),
      configHash: hashCanonical(step.config ?? null),
    }))
    .sort((a, b) => {
      if (a.nodeId === b.nodeId) return a.attempt - b.attempt;
      return a.nodeId < b.nodeId ? -1 : 1;
    });

  return canonicalize({
    executionId: input.executionId,
    organizationId: input.organizationId,
    workflowId: input.workflowId,
    workflowVersionId: input.workflowVersionId,
    workflowVersionHash: input.workflowVersionHash,
    triggerType: input.triggerType,
    status: input.status,
    startedAt: isoOrNull(input.startedAt),
    endedAt: isoOrNull(input.endedAt),
    outputHash: hashCanonical(input.output ?? null),
    errorHash: hashCanonical(input.error ?? null),
    previousRoot: input.previousRoot,
    steps,
  }) as CanonicalReceipt;
}

export function rootFromCanonical(canonical: CanonicalReceipt): string {
  return hashCanonical(canonical);
}
