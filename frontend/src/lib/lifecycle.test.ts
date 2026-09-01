import { describe, expect, it } from "vitest";

import { normalizeLifecycle, shouldReloadCanonicalState } from "./lifecycle";


describe("transaction lifecycle", () => {
  it.each([
    ["SUBMITTED", "submitted"],
    ["ACCEPTED", "accepted"],
    ["FINALIZED_FAILED", "failed"],
    ["UNDETERMINED", "retry"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeLifecycle({status: input})).toBe(expected);
  });

  it("reloads canonical state only after a final boundary", () => {
    expect(shouldReloadCanonicalState("accepted")).toBe(false);
    expect(shouldReloadCanonicalState("finalized")).toBe(true);
    expect(shouldReloadCanonicalState("failed")).toBe(true);
  });

  it("keeps finality distinct from failed execution", () => {
    expect(normalizeLifecycle({
      statusName: "FINALIZED",
      txExecutionResultName: "FINISHED_WITH_ERROR",
    })).toBe("failed");
    expect(normalizeLifecycle({
      statusName: "FINALIZED",
      txExecutionResultName: "FINISHED_WITH_RETURN",
    })).toBe("finalized");
  });

  it("requires positive execution or consensus evidence at finality", () => {
    expect(normalizeLifecycle({statusName: "FINALIZED"})).toBe("retry");
    expect(normalizeLifecycle({
      statusName: "FINALIZED",
      result_name: "MAJORITY_AGREE",
    })).toBe("finalized");
    expect(normalizeLifecycle({
      statusName: "FINALIZED",
      result_name: "MAJORITY_DISAGREE",
    })).toBe("failed");
  });

  it("normalizes the simplified Studio receipt field names emitted by genlayer-js", () => {
    expect(normalizeLifecycle({
      status: 7,
      status_name: "FINALIZED",
      result: 6,
      result_name: "MAJORITY_AGREE",
    })).toBe("finalized");
  });
});
