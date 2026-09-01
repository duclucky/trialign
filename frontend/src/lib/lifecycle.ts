export type Lifecycle = "idle" | "submitted" | "accepted" | "finalized" | "failed" | "retry";

export function normalizeLifecycle(receipt: unknown): Lifecycle {
  const value = receipt as {
    status?: unknown;
    statusName?: unknown;
    txExecutionResultName?: unknown;
    tx_execution_result_name?: unknown;
    resultName?: unknown;
    result_name?: unknown;
    result?: {status?: unknown};
  };
  const execution = String(
    value?.txExecutionResultName ?? value?.tx_execution_result_name ?? "",
  ).toUpperCase();
  const status = String(
    value?.statusName ?? value?.status ?? value?.result?.status ?? "",
  ).toUpperCase();
  const consensus = String(value?.resultName ?? value?.result_name ?? "").toUpperCase();
  if (execution === "FINISHED_WITH_ERROR") return "failed";
  if (
    consensus.includes("DISAGREE") ||
    consensus.includes("NO_MAJORITY") ||
    consensus.includes("TIMEOUT") ||
    consensus.includes("VIOLATION")
  ) {
    return "failed";
  }
  if (status.includes("FINALIZED_FAILED") || status.includes("FAIL") || status.includes("REVERT")) {
    return "failed";
  }
  if (status.includes("FINALIZED")) {
    return execution === "FINISHED_WITH_RETURN" || consensus === "MAJORITY_AGREE"
      ? "finalized"
      : "retry";
  }
  if (status.includes("ACCEPTED")) return "accepted";
  if (status.includes("UNDETERMINED") || status.includes("CANCEL") || status.includes("RETRY")) {
    return "retry";
  }
  if (status.includes("SUBMIT") || status.includes("PENDING") || status.includes("ACTIVATED")) {
    return "submitted";
  }
  return "idle";
}

export function shouldReloadCanonicalState(status: Lifecycle): boolean {
  return status === "finalized" || status === "failed";
}
