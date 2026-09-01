import {createClient} from "genlayer-js";
import {studionet} from "genlayer-js/chains";
import {TransactionStatus} from "genlayer-js/types";

import type {Eip1193Provider} from "./wallets";
import {normalizeLifecycle} from "./lifecycle";

export type Address = `0x${string}`;

export interface CanonicalCase {
  exists: boolean;
  state: string;
  nct_id?: string;
  pmid?: string;
  baseline_digest?: string;
  publication_digest?: string;
  can_advance_reporting: boolean;
}

export class FinalizedExecutionError extends Error {
  readonly transactionHash: string;

  constructor(transactionHash: string) {
    super("The transaction finalized, but contract execution failed. It will not be replayed.");
    this.name = "FinalizedExecutionError";
    this.transactionHash = transactionHash;
  }
}

export class FinalityUnverifiedError extends Error {
  readonly transactionHash: string;

  constructor(transactionHash: string) {
    super("The transaction reached finality without a positive execution or consensus result. Verify it before retrying.");
    this.name = "FinalityUnverifiedError";
    this.transactionHash = transactionHash;
  }
}

const endpoint = process.env.NEXT_PUBLIC_GENLAYER_READ_ENDPOINT || "/api/genlayer";

function isolatedStudionetChain() {
  return {
    ...studionet,
    rpcUrls: {
      ...studionet.rpcUrls,
      default: {
        ...studionet.rpcUrls.default,
        http: [...studionet.rpcUrls.default.http],
      },
    },
  };
}

export function configuredContractAddress(): Address | null {
  const value = process.env.NEXT_PUBLIC_TRIALIGN_CONTRACT_ADDRESS;
  return value && /^0x[0-9a-fA-F]{40}$/.test(value) ? value as Address : null;
}

export function createTrialignClients(
  provider?: Eip1193Provider,
  account?: Address,
) {
  // genlayer-js 1.1.8 rewrites chain.rpcUrls in place when endpoint is set.
  // Separate chain objects keep the read proxy from leaking into wallet preflight traffic.
  const read = createClient({chain: isolatedStudionetChain(), endpoint});
  const write = provider && account
    ? createClient({chain: isolatedStudionetChain(), account, provider})
    : null;
  return {read, write};
}

export async function readCase(caseId: string): Promise<CanonicalCase> {
  const address = configuredContractAddress();
  if (!address) throw new Error("Contract address is not configured.");
  const {read} = createTrialignClients();
  return await read.readContract({
    address,
    functionName: "get_case",
    args: [caseId],
  }) as unknown as CanonicalCase;
}

export async function writeAndFinalize(
  method: "create_case" | "attach_publication" | "adjudicate" | "cancel_unattached",
  args: string[],
  provider: Eip1193Provider,
  account: Address,
  onAccepted: () => void,
): Promise<{hash: string; finalReceipt: unknown; canonical: CanonicalCase}> {
  const address = configuredContractAddress();
  if (!address) throw new Error("Contract address is not configured.");
  const {read, write} = createTrialignClients(provider, account);
  if (!write) throw new Error("Wallet is disconnected.");
  const hash = await write.writeContract({
    address,
    functionName: method,
    args,
    value: 0n,
  });
  await read.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
  });
  onAccepted();
  const finalReceipt = await read.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
  });
  const lifecycle = normalizeLifecycle(finalReceipt);
  if (lifecycle === "failed") {
    throw new FinalizedExecutionError(hash);
  }
  if (lifecycle !== "finalized") throw new FinalityUnverifiedError(hash);
  return {hash, finalReceipt, canonical: await readCase(args[0])};
}
