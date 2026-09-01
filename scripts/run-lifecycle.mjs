import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

import {config as loadEnv} from "dotenv";
import {createAccount, createClient} from "genlayer-js";
import {studionet} from "genlayer-js/chains";

import {deploymentDecision, sanitizeReceipt} from "./deployment-state.mjs";
import {nextLifecycleAction} from "./lifecycle-state.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = resolve(SCRIPT_DIR, "..");
const PARENT_DIR = resolve(PROJECT_DIR, "..");
const DEPLOYMENT_PATH = join(PROJECT_DIR, "docs", "evidence", "studionet", "deployment.json");
const CHECKPOINT_PATH = join(PROJECT_DIR, "lifecycle.local.json");
const EVIDENCE_PATH = join(PROJECT_DIR, "docs", "evidence", "studionet", "lifecycle.json");
const RPC_URL = "https://studio.genlayer.com/api";
const EXPLORER_URL = "https://explorer-studio.genlayer.com";
const CASE_ID = "trialign-demo-20260901";
const NCT_ID = "NCT05904028";

function utcNow() {
  return new Date().toISOString();
}

function writeJson(path, value) {
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function loadAuthorizedEnvironment() {
  const candidates = [join(PROJECT_DIR, ".env"), join(PARENT_DIR, ".env")];
  const selected = candidates.find((candidate) => existsSync(candidate));
  if (selected) loadEnv({path: selected, quiet: true, override: false});
  return selected ? (selected === candidates[0] ? "project" : "parent") : "none";
}

function privateKey() {
  const value = process.env.STUDIONET_PRIVATE_KEY?.trim();
  if (!value) throw new Error("MISSING_AUTHORIZED_KEY");
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error("INVALID_AUTHORIZED_KEY_FORMAT");
  return value;
}

function safeCase(value) {
  return {
    exists: Boolean(value?.exists),
    state: String(value?.state ?? "EMPTY"),
    requester: value?.requester ? String(value.requester) : null,
    nctId: value?.nct_id ? String(value.nct_id) : null,
    primaryCompletionDeadline: value?.primary_completion_deadline == null
      ? null
      : Number(value.primary_completion_deadline),
    baselineDigest: value?.baseline_digest ? String(value.baseline_digest) : null,
    policyVersion: value?.policy_version == null ? null : Number(value.policy_version),
    canAdvanceReporting: Boolean(value?.can_advance_reporting),
  };
}

async function readCanonical(client, contractAddress) {
  return await client.readContract({
    address: contractAddress,
    functionName: "get_case",
    args: [CASE_ID],
  });
}

async function waitFinalized(client, transactionHash) {
  for (let attempt = 0; attempt < 360; attempt += 1) {
    try {
      const raw = await client.getTransaction({hash: transactionHash});
      if (String(raw.statusName ?? raw.status).toUpperCase() === "FINALIZED") {
        const receipt = sanitizeReceipt(raw);
        const decision = deploymentDecision(receipt);
        if (!decision.mayReadCanonicalState) throw new Error("FINALIZED_CONSENSUS_FAILED");
        return receipt;
      }
    } catch (error) {
      if (error?.message === "FINALIZED_CONSENSUS_FAILED") throw error;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000));
  }
  throw new Error("FINALITY_TIMEOUT");
}

function initializeCheckpoint(deployment, accountAddress, environmentSource) {
  const next = {
    schema: "trialign-lifecycle-checkpoint/1.0",
    network: "Studionet",
    chainId: 61999,
    contractAddress: deployment.contractAddress,
    sourceSha256: deployment.sourceSha256,
    caseId: CASE_ID,
    nctId: NCT_ID,
    accountAddress,
    environmentSource,
    startedAt: utcNow(),
  };
  writeJson(CHECKPOINT_PATH, next);
  return next;
}

function validateCheckpoint(checkpoint, deployment, accountAddress) {
  const matches = checkpoint.network === "Studionet"
    && checkpoint.chainId === 61999
    && checkpoint.contractAddress === deployment.contractAddress
    && checkpoint.sourceSha256 === deployment.sourceSha256
    && checkpoint.caseId === CASE_ID
    && checkpoint.nctId === NCT_ID
    && checkpoint.accountAddress.toLowerCase() === accountAddress.toLowerCase();
  if (!matches) throw new Error("LIFECYCLE_CHECKPOINT_MISMATCH");
}

async function run() {
  if (!existsSync(DEPLOYMENT_PATH)) throw new Error("VERIFIED_DEPLOYMENT_REQUIRED");
  const deployment = readJson(DEPLOYMENT_PATH);
  if (!deployment.claims?.finalizedExecution || !deployment.claims?.canonicalViewsReadable) {
    throw new Error("VERIFIED_DEPLOYMENT_REQUIRED");
  }
  const environmentSource = loadAuthorizedEnvironment();
  const account = createAccount(privateKey());
  const client = createClient({chain: studionet, endpoint: RPC_URL, account});
  let checkpoint = existsSync(CHECKPOINT_PATH)
    ? readJson(CHECKPOINT_PATH)
    : initializeCheckpoint(deployment, account.address, environmentSource);
  validateCheckpoint(checkpoint, deployment, account.address);

  for (let transition = 0; transition < 8; transition += 1) {
    const canonical = await readCanonical(client, deployment.contractAddress);
    const action = nextLifecycleAction(canonical, checkpoint);
    if (canonical?.exists && canonical.requester
      && String(canonical.requester).toLowerCase() !== account.address.toLowerCase()) {
      throw new Error("CASE_REQUESTER_MISMATCH");
    }

    if (action === "SUBMIT_CREATE") {
      checkpoint.createTransactionHash = await client.writeContract({
        address: deployment.contractAddress,
        functionName: "create_case",
        args: [CASE_ID, NCT_ID],
        value: 0n,
      });
      checkpoint.createSubmittedAt = utcNow();
      writeJson(CHECKPOINT_PATH, checkpoint);
      continue;
    }
    if (action === "RECOVER_CREATE") {
      checkpoint.createReceipt = await waitFinalized(client, checkpoint.createTransactionHash);
      checkpoint.createFinalizedAt = utcNow();
      writeJson(CHECKPOINT_PATH, checkpoint);
      continue;
    }
    if (action === "SUBMIT_CANCEL") {
      checkpoint.baselineCanonical = safeCase(canonical);
      checkpoint.cancelTransactionHash = await client.writeContract({
        address: deployment.contractAddress,
        functionName: "cancel_unattached",
        args: [CASE_ID],
        value: 0n,
      });
      checkpoint.cancelSubmittedAt = utcNow();
      writeJson(CHECKPOINT_PATH, checkpoint);
      continue;
    }
    if (action === "RECOVER_CANCEL") {
      checkpoint.cancelReceipt = await waitFinalized(client, checkpoint.cancelTransactionHash);
      checkpoint.cancelFinalizedAt = utcNow();
      writeJson(CHECKPOINT_PATH, checkpoint);
      continue;
    }
    if (action === "COMPLETE") {
      if (!checkpoint.createReceipt || !checkpoint.cancelReceipt || !checkpoint.baselineCanonical) {
        throw new Error("INCOMPLETE_LIFECYCLE_PROOF");
      }
      const finalCanonical = safeCase(canonical);
      if (finalCanonical.state !== "CANCELLED" || finalCanonical.canAdvanceReporting) {
        throw new Error("CANONICAL_CONSEQUENCE_MISMATCH");
      }
      const evidence = {
        schema: "trialign-studionet-lifecycle-evidence/1.0",
        network: "Studionet",
        chainId: 61999,
        rpcUrl: RPC_URL,
        explorerBaseUrl: EXPLORER_URL,
        contractAddress: deployment.contractAddress,
        caseId: CASE_ID,
        nctId: NCT_ID,
        createTransaction: checkpoint.createReceipt,
        cancelTransaction: checkpoint.cancelReceipt,
        baselineCanonical: checkpoint.baselineCanonical,
        finalCanonical,
        sourceAuthority: "https://clinicaltrials.gov/api/v2/studies/NCT05904028",
        finalizedAt: checkpoint.cancelFinalizedAt,
        verifiedAt: utcNow(),
        claims: {
          baselineRetrievalConsensusAccepted: true,
          finalizedExecution: true,
          semanticAdjudicationResult: null,
          canonicalConsequence: "CANCELLED",
          reportingGateOpen: false,
        },
        limitations: [
          "This is the requester-only cancellation branch after a validator-consensus baseline lock.",
          "It does not claim a live PubMed semantic adjudication, PASS, REVIEW_REQUIRED, adoption, or browser-signed transaction.",
        ],
      };
      writeJson(EVIDENCE_PATH, evidence);
      checkpoint.phase = "VERIFIED_SUCCESS";
      checkpoint.verifiedAt = evidence.verifiedAt;
      checkpoint.evidencePath = "docs/evidence/studionet/lifecycle.json";
      writeJson(CHECKPOINT_PATH, checkpoint);
      process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
      return;
    }
  }
  throw new Error("LIFECYCLE_TRANSITION_LIMIT");
}

run().catch((error) => {
  const known = new Set([
    "MISSING_AUTHORIZED_KEY",
    "INVALID_AUTHORIZED_KEY_FORMAT",
    "VERIFIED_DEPLOYMENT_REQUIRED",
    "LIFECYCLE_CHECKPOINT_MISMATCH",
    "CASE_REQUESTER_MISMATCH",
    "FINALIZED_CONSENSUS_FAILED",
    "FINALITY_TIMEOUT",
    "INCOMPLETE_LIFECYCLE_PROOF",
    "CANONICAL_CONSEQUENCE_MISMATCH",
    "LIFECYCLE_TRANSITION_LIMIT",
  ]);
  const category = known.has(error?.message) ? error.message : "NETWORK_OR_SDK_FAILURE";
  process.stdout.write(`${JSON.stringify({
    ok: false,
    category,
    resumeCondition: "Rerun npm run network:lifecycle; the checkpoint recovers existing hashes before any new write.",
  }, null, 2)}\n`);
  process.exitCode = 1;
});
