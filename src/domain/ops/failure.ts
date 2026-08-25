export type FailureBrief = {
  what: string;
  where: string;
  why: string;
  impact: string;
  recommended: string;
  retryable: boolean;
};

export function explainFailure(input: {
  error?: { message: string; type?: string; nodeId?: string } | null;
  nodeName?: string;
  nodeType?: string;
}): FailureBrief {
  const message = input.error?.message ?? "The workflow stopped before it finished.";
  const type = input.error?.type ?? "Error";
  const where = input.nodeName ? `${input.nodeName} (${input.nodeType ?? "node"})` : input.error?.nodeId ?? "an unknown step";
  const http = /HTTP\s+(\d+)/i.exec(message);
  const status = http ? Number(http[1]) : null;
  const retryable = type === "ProviderError" || (status != null && status >= 500) || /timeout|temporar|network/i.test(message);
  const why =
    status === 500
      ? "The downstream API returned an internal error. That is usually transient."
      : status === 401 || status === 403
        ? "Authentication was rejected. Check the secret or provider connection."
        : type === "ExprRuntimeError" || type === "ExprSyntaxError"
          ? "An expression could not be evaluated with the data available at that step."
          : type === "ValidationError"
            ? "The workflow definition is not valid for execution."
            : message;
  const impact =
    input.nodeType === "comm.email"
      ? "The outbound email was not sent."
      : input.nodeType === "data.http"
        ? "The downstream record or request was not completed."
        : "Later steps did not run, so downstream actions did not happen.";
  const recommended = retryable
    ? "Retry from this step. Earlier successful work will be preserved."
    : "Open the failed step, inspect input, and correct configuration before running again.";
  return {
    what: "This workflow needs attention.",
    where,
    why,
    impact,
    recommended,
    retryable,
  };
}
