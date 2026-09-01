const EXPECTED_NCT_ID = "NCT05904028";

export function nextLifecycleAction(canonicalCase, checkpoint) {
  const state = canonicalCase?.state ?? "EMPTY";
  if (canonicalCase?.exists && canonicalCase.nct_id !== EXPECTED_NCT_ID) {
    throw new Error("Existing case NCT mismatch.");
  }
  if (!canonicalCase?.exists || state === "EMPTY") {
    return checkpoint.createTransactionHash ? "RECOVER_CREATE" : "SUBMIT_CREATE";
  }
  if (state === "BASELINE_LOCKED") {
    return checkpoint.cancelTransactionHash ? "RECOVER_CANCEL" : "SUBMIT_CANCEL";
  }
  if (state === "CANCELLED") return "COMPLETE";
  throw new Error(`Unexpected existing state: ${state}.`);
}
