import {beforeEach, describe, expect, it, vi} from "vitest";

const {createClient} = vi.hoisted(() => ({createClient: vi.fn()}));
vi.mock("genlayer-js", () => ({createClient}));
vi.mock("genlayer-js/chains", () => ({studionet: {id: 61999}}));
vi.mock("genlayer-js/types", () => ({TransactionStatus: {ACCEPTED: "ACCEPTED", FINALIZED: "FINALIZED"}}));

import {FinalityUnverifiedError, FinalizedExecutionError, writeAndFinalize} from "./contract";

const address = "0x1111111111111111111111111111111111111111" as const;
const hash = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("contract lifecycle wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_TRIALIGN_CONTRACT_ADDRESS", "0x2222222222222222222222222222222222222222");
  });

  it.each([
    ["create_case", ["study-a", "NCT01234567"]],
    ["attach_publication", ["study-a", "12345678"]],
    ["adjudicate", ["study-a"]],
    ["cancel_unattached", ["study-a"]],
  ] as const)("submits %s, waits accepted then finalized, and reloads canonical state", async (method, args) => {
    const waitForTransactionReceipt = vi.fn()
      .mockResolvedValueOnce({status: "ACCEPTED"})
      .mockResolvedValueOnce({status: "FINALIZED", txExecutionResultName: "FINISHED_WITH_RETURN"});
    const readContract = vi.fn().mockResolvedValue({
      exists: true,
      state: "BASELINE_LOCKED",
      can_advance_reporting: false,
    });
    const read = {waitForTransactionReceipt, readContract};
    const write = {writeContract: vi.fn().mockResolvedValue(hash)};
    createClient.mockImplementation((config: {provider?: unknown}) => config.provider ? write : read);
    const accepted = vi.fn();
    const provider = {request: vi.fn()};

    const result = await writeAndFinalize(method, [...args], provider, address, accepted);

    expect(write.writeContract).toHaveBeenCalledWith(expect.objectContaining({
      functionName: method,
      args: [...args],
      value: 0n,
    }));
    expect(waitForTransactionReceipt.mock.calls.map(([item]) => item.status)).toEqual([
      "ACCEPTED",
      "FINALIZED",
    ]);
    expect(accepted).toHaveBeenCalledOnce();
    expect(readContract).toHaveBeenCalledWith(expect.objectContaining({
      functionName: "get_case",
      args: ["study-a"],
    }));
    expect(result.canonical.state).toBe("BASELINE_LOCKED");
  });

  it("does not read canonical state after finalized execution failure", async () => {
    const waitForTransactionReceipt = vi.fn()
      .mockResolvedValueOnce({statusName: "ACCEPTED"})
      .mockResolvedValueOnce({
        statusName: "FINALIZED",
        txExecutionResultName: "FINISHED_WITH_ERROR",
      });
    const readContract = vi.fn();
    const read = {waitForTransactionReceipt, readContract};
    const write = {writeContract: vi.fn().mockResolvedValue(hash)};
    createClient.mockImplementation((config: {provider?: unknown}) => config.provider ? write : read);

    await expect(writeAndFinalize(
      "adjudicate",
      ["study-a"],
      {request: vi.fn()},
      address,
      vi.fn(),
    )).rejects.toBeInstanceOf(FinalizedExecutionError);
    expect(readContract).not.toHaveBeenCalled();
  });

  it("does not call a finalized receipt successful without positive result evidence", async () => {
    const waitForTransactionReceipt = vi.fn()
      .mockResolvedValueOnce({statusName: "ACCEPTED"})
      .mockResolvedValueOnce({statusName: "FINALIZED"});
    const readContract = vi.fn();
    const read = {waitForTransactionReceipt, readContract};
    const write = {writeContract: vi.fn().mockResolvedValue(hash)};
    createClient.mockImplementation((config: {provider?: unknown}) => config.provider ? write : read);

    await expect(writeAndFinalize(
      "adjudicate",
      ["study-a"],
      {request: vi.fn()},
      address,
      vi.fn(),
    )).rejects.toBeInstanceOf(FinalityUnverifiedError);
    expect(readContract).not.toHaveBeenCalled();
  });
});
