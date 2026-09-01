import assert from "node:assert/strict";
import test from "node:test";

import {nextLifecycleAction} from "../scripts/lifecycle-state.mjs";

const empty = {exists: false, state: "EMPTY", can_advance_reporting: false};

test("submits the baseline write only once", () => {
  assert.equal(nextLifecycleAction(empty, {}), "SUBMIT_CREATE");
  assert.equal(nextLifecycleAction(empty, {createTransactionHash: "0xcreate"}), "RECOVER_CREATE");
});

test("moves an owned baseline to the cancellation consequence", () => {
  const baseline = {
    exists: true,
    state: "BASELINE_LOCKED",
    nct_id: "NCT05904028",
    can_advance_reporting: false,
  };
  assert.equal(nextLifecycleAction(baseline, {}), "SUBMIT_CANCEL");
  assert.equal(
    nextLifecycleAction(baseline, {cancelTransactionHash: "0xcancel"}),
    "RECOVER_CANCEL",
  );
});

test("recognizes the terminal canonical consequence", () => {
  assert.equal(nextLifecycleAction({
    exists: true,
    state: "CANCELLED",
    nct_id: "NCT05904028",
    can_advance_reporting: false,
  }, {}), "COMPLETE");
});

test("refuses a mismatched or unexpected existing case", () => {
  assert.throws(() => nextLifecycleAction({
    exists: true,
    state: "BASELINE_LOCKED",
    nct_id: "NCT00000001",
  }, {}), /NCT mismatch/);
  assert.throws(() => nextLifecycleAction({
    exists: true,
    state: "PUBLICATION_ATTACHED",
    nct_id: "NCT05904028",
  }, {}), /unexpected existing state/i);
});
