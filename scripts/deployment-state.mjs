const FINALIZED = "FINALIZED";
const SUCCESS = "FINISHED_WITH_RETURN";
const FAILURE = "FINISHED_WITH_ERROR";
const CONSENSUS_SUCCESS = "MAJORITY_AGREE";
const CONSENSUS_FAILURES = new Set([
  "MAJORITY_DISAGREE",
  "NO_MAJORITY",
  "DISAGREE",
  "TIMEOUT",
  "DETERMINISTIC_VIOLATION",
]);

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.length > 0);
}

function normalizeEnum(value) {
  return typeof value === "string" ? value.trim().toUpperCase() : undefined;
}

/**
 * Project a transaction receipt onto an explicit public allowlist.
 * Raw validator configuration, traces, consensus payloads and error bodies are
 * deliberately never copied into the returned object.
 */
export function sanitizeReceipt(receipt) {
  if (!receipt || typeof receipt !== "object") {
    throw new Error("Receipt must be an object.");
  }

  const nested =
    receipt.transaction && typeof receipt.transaction === "object"
      ? receipt.transaction
      : {};
  const transactionHash = firstString(
    receipt.hash,
    receipt.transactionHash,
    receipt.transaction_hash,
    receipt.txId,
    nested.hash,
    nested.transactionHash,
    nested.transaction_hash,
  );
  if (!transactionHash) {
    throw new Error("Receipt is missing a transaction hash.");
  }

  const status = normalizeEnum(
    firstString(receipt.statusName, receipt.status, nested.statusName, nested.status),
  );
  if (!status) {
    throw new Error("Receipt is missing transaction status.");
  }

  const executionResult = normalizeEnum(
    firstString(
      receipt.txExecutionResultName,
      receipt.tx_execution_result_name,
      nested.txExecutionResultName,
      nested.tx_execution_result_name,
    ),
  );
  const consensusResult = normalizeEnum(
    firstString(
      receipt.resultName,
      receipt.result_name,
      nested.resultName,
      nested.result_name,
    ),
  );
  if (
    status === FINALIZED &&
    executionResult !== SUCCESS &&
    executionResult !== FAILURE &&
    consensusResult !== CONSENSUS_SUCCESS &&
    !CONSENSUS_FAILURES.has(consensusResult)
  ) {
    throw new Error("Finalized receipt has no recognized execution or consensus result.");
  }

  const contractAddress = firstString(
    receipt.contractAddress,
    receipt.contract_address,
    nested.contractAddress,
    nested.contract_address,
    receipt.txDataDecoded?.contractAddress,
    receipt.txDataDecoded?.contract_address,
    nested.txDataDecoded?.contractAddress,
    nested.txDataDecoded?.contract_address,
    receipt.recipient,
    receipt.to_address,
    nested.recipient,
    nested.to_address,
  );

  return {
    transactionHash,
    status,
    ...(executionResult ? { executionResult } : {}),
    ...(consensusResult ? { consensusResult } : {}),
    ...(contractAddress ? { contractAddress } : {}),
  };
}

export function deploymentDecision(safeReceipt) {
  if (safeReceipt.status !== FINALIZED) {
    return {
      phase: "SUBMITTED",
      mayReadCanonicalState: false,
      mayRedeploy: false,
      resumeCondition: "Wait for the existing transaction to finalize.",
    };
  }

  if (safeReceipt.executionResult === FAILURE) {
    return {
      phase: "FINALIZED_FAILED",
      mayReadCanonicalState: false,
      mayRedeploy: false,
      resumeCondition: "Resolve the execution error; do not replay this finalized write.",
    };
  }

  if (CONSENSUS_FAILURES.has(safeReceipt.consensusResult)) {
    return {
      phase: "FINALIZED_FAILED",
      mayReadCanonicalState: false,
      mayRedeploy: false,
      resumeCondition: "Resolve the consensus failure; do not replay this finalized write.",
    };
  }

  if (safeReceipt.executionResult === SUCCESS) {
    return {
      phase: "FINALIZED_SUCCESS",
      mayReadCanonicalState: true,
      mayRedeploy: false,
      resumeCondition: "Verify deployed code and canonical views.",
    };
  }

  if (safeReceipt.consensusResult === CONSENSUS_SUCCESS) {
    return {
      phase: "FINALIZED_CONSENSUS_ACCEPTED",
      mayReadCanonicalState: true,
      mayRedeploy: false,
      resumeCondition: "Verify deployed code and canonical views.",
    };
  }

  throw new Error("Receipt cannot be classified safely.");
}
