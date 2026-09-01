import assert from "node:assert/strict";
import test from "node:test";

import {
  deploymentDecision,
  sanitizeReceipt,
} from "../scripts/deployment-state.mjs";

test("normalizes a simplified successful deployment receipt", () => {
  const safe = sanitizeReceipt({
    hash: "0xabc",
    status: "FINALIZED",
    txExecutionResultName: "FINISHED_WITH_RETURN",
    contractAddress: "0x1111111111111111111111111111111111111111",
    node_config: { private: "must-not-leak" },
  });

  assert.deepEqual(safe, {
    transactionHash: "0xabc",
    status: "FINALIZED",
    executionResult: "FINISHED_WITH_RETURN",
    contractAddress: "0x1111111111111111111111111111111111111111",
  });
  assert.equal(JSON.stringify(safe).includes("node_config"), false);
});

test("normalizes a raw nested receipt without retaining validator data", () => {
  const safe = sanitizeReceipt({
    transaction: {
      hash: "0xdef",
      status: "FINALIZED",
      tx_execution_result_name: "FINISHED_WITH_RETURN",
      contract_address: "0x2222222222222222222222222222222222222222",
      consensus_data: { validators: ["private"] },
    },
    trace: { secret: true },
  });

  assert.deepEqual(safe, {
    transactionHash: "0xdef",
    status: "FINALIZED",
    executionResult: "FINISHED_WITH_RETURN",
    contractAddress: "0x2222222222222222222222222222222222222222",
  });
  assert.equal(JSON.stringify(safe).includes("validators"), false);
});

test("normalizes the current genlayer-js transaction shape", () => {
  const safe = sanitizeReceipt({
    txId: "0xsdk",
    statusName: "FINALIZED",
    txExecutionResultName: "FINISHED_WITH_RETURN",
    txDataDecoded: {
      type: "deploy",
      contractAddress: "0x4444444444444444444444444444444444444444",
    },
    data: { node_config: { private: true } },
  });

  assert.deepEqual(safe, {
    transactionHash: "0xsdk",
    status: "FINALIZED",
    executionResult: "FINISHED_WITH_RETURN",
    contractAddress: "0x4444444444444444444444444444444444444444",
  });
});

test("normalizes Studionet consensus fields when execution-name is absent", () => {
  const safe = sanitizeReceipt({
    hash: "0xcurrent",
    statusName: "FINALIZED",
    result: 6,
    result_name: "MAJORITY_AGREE",
    recipient: "0x5555555555555555555555555555555555555555",
    consensus_history: {private: true},
  });

  assert.deepEqual(safe, {
    transactionHash: "0xcurrent",
    status: "FINALIZED",
    consensusResult: "MAJORITY_AGREE",
    contractAddress: "0x5555555555555555555555555555555555555555",
  });
  assert.deepEqual(deploymentDecision(safe), {
    phase: "FINALIZED_CONSENSUS_ACCEPTED",
    mayReadCanonicalState: true,
    mayRedeploy: false,
    resumeCondition: "Verify deployed code and canonical views.",
  });
});

test("does not confuse finality with successful execution", () => {
  const safe = sanitizeReceipt({
    hash: "0xfail",
    status: "FINALIZED",
    txExecutionResultName: "FINISHED_WITH_ERROR",
  });

  assert.deepEqual(deploymentDecision(safe), {
    phase: "FINALIZED_FAILED",
    mayReadCanonicalState: false,
    mayRedeploy: false,
    resumeCondition: "Resolve the execution error; do not replay this finalized write.",
  });
});

test("resumes a submitted transaction instead of redeploying", () => {
  const safe = sanitizeReceipt({ hash: "0xpending", status: "ACCEPTED" });

  assert.deepEqual(deploymentDecision(safe), {
    phase: "SUBMITTED",
    mayReadCanonicalState: false,
    mayRedeploy: false,
    resumeCondition: "Wait for the existing transaction to finalize.",
  });
});

test("permits canonical verification only after successful finalization", () => {
  const safe = sanitizeReceipt({
    hash: "0xok",
    status: "FINALIZED",
    txExecutionResultName: "FINISHED_WITH_RETURN",
    contractAddress: "0x3333333333333333333333333333333333333333",
  });

  assert.deepEqual(deploymentDecision(safe), {
    phase: "FINALIZED_SUCCESS",
    mayReadCanonicalState: true,
    mayRedeploy: false,
    resumeCondition: "Verify deployed code and canonical views.",
  });
});

test("rejects malformed receipts instead of guessing", () => {
  assert.throws(() => sanitizeReceipt({ status: "FINALIZED" }), /transaction hash/i);
  assert.throws(
    () =>
      sanitizeReceipt({
        hash: "0xambiguous",
        status: "FINALIZED",
        txExecutionResultName: "MYSTERY",
      }),
    /execution or consensus result/i,
  );
});
