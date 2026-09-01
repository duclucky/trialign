# Trialign specification

Status: locked candidate specification for the PROJECTS track  
Registry record: `dab8d5af9bb3edc8aab2c89c7bdd8550e72869894268fae370e7cdad56c6d8a2`  
Build handoff: `5fffe95aedce062605a1b7f53d0950369ab17ef9acee22d569203a419488bcc5`

## Product boundary

Trialign is a reference workflow that prospectively locks one public ClinicalTrials.gov primary-outcome baseline, later binds one linked PubMed publication, and asks GenLayer validators whether the publication is materially concordant with the baseline. It exposes a canonical reporting-complete gate after finality.

Trialign does not determine misconduct, clinical validity, regulatory or legal compliance, journal acceptance, publication quality, private-manuscript content, universal PubMed coverage, adoption, or production readiness. An insufficient or unavailable public record is `UNVERIFIABLE`, never evidence of concordance or discrepancy.

## Roles

- Requester: creates a case and is the only actor allowed to attach a PMID or cancel an unattached case.
- Adjudication caller: any nonzero account may trigger adjudication for a publication-attached case; the result affects only the immutable case binding.
- Validators: independently fetch the fixed authoritative endpoints, verify source/entity bindings and evidence sufficiency, then compare outcome meaning.
- Consumer: reads finalized canonical views; it cannot override status or consequence.

## State machine

`EMPTY -> BASELINE_LOCKED -> PUBLICATION_ATTACHED -> REPORTING_COMPLETE | REVIEW_REQUIRED`

`BASELINE_LOCKED -> CANCELLED` is the only recovery path. `UNVERIFIABLE` records an attempt while preserving `PUBLICATION_ATTACHED`, so the gate and retry right remain unchanged. Terminal states reject duplicate adjudication. Every write rejects nonzero value.

## Canonical identifiers and limits

- `case_id`: caller-supplied ASCII slug, 3–64 lowercase letters, digits, or hyphens.
- `nct_id`: exactly `NCT` plus eight digits.
- `pmid`: 1–9 ASCII digits, first digit nonzero.
- `policy_version`: fixed to `1` per case.
- At most eight registered primary outcomes are retained; each receives a stable index-based ID `o1` through `o8`.
- Authoritative bodies and normalized strings are bounded before parsing or storage.

## Baseline lock

`create_case(case_id, nct_id)` derives the sole ClinicalTrials.gov URL from a validated NCT ID. Validators retrieve `/api/v2/studies/{NCTId}`, require exact `identificationModule.nctId`, at least one sufficiently described primary outcome, and a parseable primary-completion date. Transaction time must be strictly earlier than that authoritative deadline; equality is late. The contract stores normalized outcome fields, exact fetched-body SHA-256, source retrieval metadata, requester, policy version, and the deadline. Caller prose and URLs are not accepted.

## Publication attachment

`attach_publication(case_id, pmid)` accepts only the stored requester in `BASELINE_LOCKED`. It validates and stores the PMID; no publication body, verdict, or summary is caller-supplied.

## Adjudication

`adjudicate(case_id)` derives the fixed NCBI BioC endpoint from the stored PMID. Every leader and validator retrieves the exact PMID record and independently verifies:

- HTTP/source response is available and bounded;
- BioC source identifier equals the immutable PMID;
- the exact immutable NCT token occurs in the sourced record;
- title and abstract carry enough detail to compare registered outcomes;
- the fetched body digest is recomputed from the exact bytes used for review.

The semantic rubric covers construct, measure/instrument, aggregation, time point, complete primary-outcome coverage, and explicit scientifically coherent amendment disclosure. Publication instructions are untrusted evidence text and cannot redefine authority, policy, result, or consequence.

Normalized verdicts are `PASS`, `REVIEW_REQUIRED`, and `UNVERIFIABLE`. Discrepancy classes are `OMITTED`, `INTRODUCED`, `DEMOTED`, `PROMOTED`, `MEASURE_CHANGED`, `TIMEPOINT_CHANGED`, `AGGREGATION_CHANGED`, and `UNEXPLAINED_OTHER`.

Before mutation, deterministic settlement checks require exactly one allowed verdict, sufficient source coverage for a terminal verdict, every expected registered outcome exactly once, no extra or duplicate IDs, only allowed classes, no unexplained material discrepancy for `PASS`, and at least one source-grounded discrepancy for `REVIEW_REQUIRED`. The consequence is derived by contract code, not accepted from model prose.

## Canonical consequence

- `PASS`: state becomes `REPORTING_COMPLETE`; `can_advance_reporting(case_id)` returns true.
- `REVIEW_REQUIRED`: state becomes `REVIEW_REQUIRED`; the gate remains false and bounded discrepancy classes are readable.
- `UNVERIFIABLE`: state remains `PUBLICATION_ATTACHED`; the attempt count and safe reason update; retry remains available.

No GEN is accepted, credited, held, transferred, refunded, forfeited, or orphaned.

## Frontend lifecycle

The product discovers EVM wallets through EIP-6963 plus named injected fallbacks, presents a centered chooser, and never silently selects a provider. Reads use a signer-free GenLayer client; writes use the selected provider/account after Studionet switch/add. The UI distinguishes submitted, accepted, finalized, failed, and retry states, then reloads canonical views. The connected address opens an account menu with disconnect; disconnect clears in-memory provider/account state and disables all writes. Local storage is never canonical state.

## Acceptance

Completion requires contract lint/schema recognition, direct and adversarial tests, frontend client/component tests, TypeScript, production build, parser tests for raw and normalized receipt shapes, browser-local RPC/CORS proof, target-network schema/ABI preflight, resumable deployment, finalized semantic and canonical consequence evidence, public-repository hygiene, and copy-ready Portal fields. Local success is not network evidence.
