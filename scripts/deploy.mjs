import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

import { deploymentDecision, sanitizeReceipt } from "./deployment-state.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = resolve(SCRIPT_DIR, "..");
const PARENT_DIR = resolve(PROJECT_DIR, "..");
const SOURCE_PATH = join(PROJECT_DIR, "contracts", "trialign.py");
const CHECKPOINT_PATH = join(PROJECT_DIR, "deployment.local.json");
const EVIDENCE_PATH = join(
  PROJECT_DIR,
  "docs",
  "evidence",
  "studionet",
  "deployment.json",
);
const RPC_URL = "https://studio.genlayer.com/api";
const EXPLORER_URL = "https://explorer-studio.genlayer.com";
const EXPECTED_CHAIN_ID = 61999;
const ALLOWED_COMMANDS = new Set(["preflight", "deploy", "verify"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function utcNow() {
  return new Date().toISOString();
}

function sourceCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: PROJECT_DIR,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    throw new Error("SOURCE_COMMIT_UNAVAILABLE");
  }
}

function runtimeDependency(source) {
  const firstLine = source.split(/\r?\n/, 1)[0];
  const match = firstLine.match(/^#\s*(\{.*\})\s*$/);
  if (!match) throw new Error("RUNTIME_DEPENDENCY_UNAVAILABLE");
  const depends = JSON.parse(match[1]).Depends;
  if (typeof depends !== "string" || !depends.startsWith("py-genlayer:")) {
    throw new Error("RUNTIME_DEPENDENCY_UNAVAILABLE");
  }
  return depends;
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8" });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function loadAuthorizedEnvironment() {
  const candidates = [join(PROJECT_DIR, ".env"), join(PARENT_DIR, ".env")];
  const selected = candidates.find((candidate) => existsSync(candidate));
  if (selected) {
    loadEnv({ path: selected, quiet: true, override: false });
  }
  return selected ? (selected === candidates[0] ? "project" : "parent") : "none";
}

function readPrivateKey() {
  const value = process.env.STUDIONET_PRIVATE_KEY?.trim();
  if (!value) {
    throw new Error("MISSING_AUTHORIZED_KEY");
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error("INVALID_AUTHORIZED_KEY_FORMAT");
  }
  return value;
}

function publicSummary(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function safeFailure(error) {
  const known = new Set([
    "MISSING_AUTHORIZED_KEY",
    "INVALID_AUTHORIZED_KEY_FORMAT",
    "CHECKPOINT_SOURCE_MISMATCH",
    "CHECKPOINT_NETWORK_MISMATCH",
    "FINALIZED_EXECUTION_FAILED",
    "MISSING_CONTRACT_ADDRESS",
    "DEPLOYED_CODE_MISMATCH",
    "CHAIN_ID_MISMATCH",
    "NO_DEPLOYMENT_CHECKPOINT",
    "UNVERIFIED_CHECKPOINT",
    "RPC_CHAIN_ID_UNAVAILABLE",
    "SCHEMA_PREFLIGHT_UNAVAILABLE",
    "SCHEMA_METHODS_MISSING",
    "SOURCE_COMMIT_UNAVAILABLE",
    "RUNTIME_DEPENDENCY_UNAVAILABLE",
  ]);
  const category = known.has(error?.message) ? error.message : "NETWORK_OR_SDK_FAILURE";
  publicSummary({
    ok: false,
    category,
    resumeCondition:
      category === "NETWORK_OR_SDK_FAILURE"
        ? "Check official Studionet status, then rerun the same command; an existing checkpoint is recovered before any new write."
        : "Resolve the named condition, then rerun the same command.",
  });
}

function createReadClient() {
  return createClient({ chain: studionet, endpoint: RPC_URL });
}

async function preflight(source) {
  const client = createReadClient();
  let rawChainId;
  try {
    rawChainId = await client.request({ method: "eth_chainId" });
  } catch {
    throw new Error("RPC_CHAIN_ID_UNAVAILABLE");
  }
  const chainId =
    typeof rawChainId === "string" ? Number.parseInt(rawChainId, 16) : Number(rawChainId);
  if (chainId !== EXPECTED_CHAIN_ID) {
    throw new Error("CHAIN_ID_MISMATCH");
  }
  let schema;
  try {
    schema = await client.getContractSchemaForCode(source);
  } catch {
    throw new Error("SCHEMA_PREFLIGHT_UNAVAILABLE");
  }
  const methods = schema?.methods && typeof schema.methods === "object"
    ? Object.keys(schema.methods)
    : [];
  if (!methods.includes("get_policy_version") || !methods.includes("create_case")) {
    throw new Error("SCHEMA_METHODS_MISSING");
  }
  return {
    ok: true,
    network: "Studionet",
    chainId,
    rpcUrl: RPC_URL,
    sourceSha256: sha256(source),
    schemaMethodCount: methods.length,
    requiredMethodsPresent: true,
    checkedAt: utcNow(),
  };
}

function validateCheckpoint(checkpoint, sourceSha256) {
  if (checkpoint.network !== "Studionet" || checkpoint.chainId !== EXPECTED_CHAIN_ID) {
    throw new Error("CHECKPOINT_NETWORK_MISMATCH");
  }
  if (checkpoint.sourceSha256 !== sourceSha256) {
    throw new Error("CHECKPOINT_SOURCE_MISMATCH");
  }
}

async function finalizeExisting(client, checkpoint) {
  if (!checkpoint.transactionHash) {
    throw new Error("UNVERIFIED_CHECKPOINT");
  }
  let safeReceipt;
  for (let attempt = 0; attempt < 360; attempt += 1) {
    try {
      const receipt = await client.getTransaction({hash: checkpoint.transactionHash});
      if (String(receipt.statusName ?? receipt.status).toUpperCase() === "FINALIZED") {
        safeReceipt = sanitizeReceipt(receipt);
        break;
      }
    } catch {
      // The submitted hash is authoritative. A transient lookup failure is
      // retried; it never authorizes a replacement transaction.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000));
  }
  if (!safeReceipt) throw new Error("NETWORK_OR_SDK_FAILURE");
  const decision = deploymentDecision(safeReceipt);
  const updated = {
    ...checkpoint,
    phase: decision.phase,
    finalizedAt: utcNow(),
    receipt: safeReceipt,
  };
  writeJson(CHECKPOINT_PATH, updated);
  if (!decision.mayReadCanonicalState) {
    throw new Error("FINALIZED_EXECUTION_FAILED");
  }
  return updated;
}

async function verifyDeployment(client, checkpoint, source) {
  const address = checkpoint.receipt?.contractAddress ?? checkpoint.contractAddress;
  if (!address) {
    throw new Error("MISSING_CONTRACT_ADDRESS");
  }
  const deployedCode = await client.getContractCode(address);
  if (sha256(deployedCode) !== sha256(source)) {
    throw new Error("DEPLOYED_CODE_MISMATCH");
  }
  const [policyVersion, emptyCase] = await Promise.all([
    client.readContract({ address, functionName: "get_policy_version", args: [] }),
    client.readContract({ address, functionName: "get_case", args: ["verification-only"] }),
  ]);
  const policyVersionJson = JSON.stringify(policyVersion);
  const emptyCaseSha256 = sha256(JSON.stringify(emptyCase));
  const verifiedAt = utcNow();
  const evidence = {
    schema: "trialign-deployment-evidence/1.0",
    network: "Studionet",
    chainId: EXPECTED_CHAIN_ID,
    rpcUrl: RPC_URL,
    explorerBaseUrl: EXPLORER_URL,
    contractAddress: address,
    transactionHash: checkpoint.transactionHash,
    transactionStatus: checkpoint.receipt.status,
    executionResult: checkpoint.receipt.executionResult ?? null,
    consensusResult: checkpoint.receipt.consensusResult ?? null,
    sourceCommit: sourceCommit(),
    sourceSha256: sha256(source),
    deployedCodeSha256: sha256(deployedCode),
    runtimeDependency: runtimeDependency(source),
    policyVersion: JSON.parse(policyVersionJson),
    emptyCaseSha256,
    finalizedAt: checkpoint.finalizedAt,
    verifiedAt,
    claims: {
      finalizedExecution: true,
      consensusAccepted: checkpoint.receipt.consensusResult === "MAJORITY_AGREE",
      canonicalViewsReadable: true,
      semanticAdjudicationResult: null,
      canonicalConsequence: null,
    },
    limitations: [
      "This record proves deployment finality and readable canonical views only.",
      "A semantic adjudication and its canonical consequence require separate lifecycle evidence.",
    ],
  };
  writeJson(EVIDENCE_PATH, evidence);
  const verified = {
    ...checkpoint,
    phase: "VERIFIED_SUCCESS",
    contractAddress: address,
    verifiedAt,
    evidencePath: "docs/evidence/studionet/deployment.json",
  };
  writeJson(CHECKPOINT_PATH, verified);
  return evidence;
}

async function deploy(source, environmentSource) {
  const sourceSha256 = sha256(source);
  const account = createAccount(readPrivateKey());
  const client = createClient({ chain: studionet, endpoint: RPC_URL, account });
  let checkpoint;

  if (existsSync(CHECKPOINT_PATH)) {
    checkpoint = readJson(CHECKPOINT_PATH);
    validateCheckpoint(checkpoint, sourceSha256);
  } else {
    const transactionHash = await client.deployContract({ code: source, args: [] });
    checkpoint = {
      schema: "trialign-deployment-checkpoint/1.0",
      phase: "SUBMITTED",
      network: "Studionet",
      chainId: EXPECTED_CHAIN_ID,
      sourceSha256,
      deployerAddress: account.address,
      transactionHash,
      environmentSource,
      submittedAt: utcNow(),
    };
    writeJson(CHECKPOINT_PATH, checkpoint);
  }

  if (checkpoint.phase === "FINALIZED_FAILED") {
    throw new Error("FINALIZED_EXECUTION_FAILED");
  }
  if (checkpoint.phase !== "VERIFIED_SUCCESS") {
    checkpoint = await finalizeExisting(client, checkpoint);
  }
  return verifyDeployment(client, checkpoint, source);
}

async function verify(source) {
  if (!existsSync(CHECKPOINT_PATH)) {
    throw new Error("NO_DEPLOYMENT_CHECKPOINT");
  }
  const checkpoint = readJson(CHECKPOINT_PATH);
  validateCheckpoint(checkpoint, sha256(source));
  if (checkpoint.phase !== "VERIFIED_SUCCESS") {
    throw new Error("UNVERIFIED_CHECKPOINT");
  }
  return verifyDeployment(createReadClient(), checkpoint, source);
}

async function main() {
  const command = process.argv[2] ?? "preflight";
  if (!ALLOWED_COMMANDS.has(command)) {
    throw new Error("UNKNOWN_COMMAND");
  }
  const source = readFileSync(SOURCE_PATH, "utf8");
  const environmentSource = loadAuthorizedEnvironment();
  if (command === "preflight") {
    publicSummary(await preflight(source));
  } else if (command === "deploy") {
    publicSummary(await deploy(source, environmentSource));
  } else {
    publicSummary(await verify(source));
  }
}

main().catch((error) => {
  safeFailure(error);
  process.exitCode = 1;
});
