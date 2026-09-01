# Portal fields — publication-blocked draft

This packet is structurally complete but **not submission-ready** until the public repository, successful CI run, production frontend URL, and browser-wallet write lifecycle are available. Replace only the bracketed publication fields from canonical evidence; do not weaken the limitations.

## Title

Trialign

## Category

Projects

## Description

Trialign prospectively locks a ClinicalTrials.gov primary-outcome baseline, binds one PubMed article, and asks GenLayer validators to retrieve both authorities and judge reporting concordance. Deterministic settlement checks require exact outcome coverage before the contract can open its canonical reporting-complete gate; discrepancies keep the gate closed and unavailable evidence remains retryable. Its frontend provides explicit EVM wallet choice, Studionet finality states, and canonical reloads. Trialign does not judge misconduct, clinical validity, or legal compliance.

## Public repository

`[PUBLIC_REPOSITORY_URL_REQUIRED]`

## Production app

`[PRODUCTION_FRONTEND_URL_REQUIRED]`

## Successful CI

`[SUCCESSFUL_CI_RUN_URL_REQUIRED]`

## Primary contract

https://explorer-studio.genlayer.com/address/0xbA8246955bBf41aA5DB5BF2d087C7Df6Fa16DE36

## Deployment transaction

https://explorer-studio.genlayer.com/transactions/0xb8461a9954184c2cf3618041a8613ef73d080b97535f43354d073ede45b38c0b

## Finalized lifecycle evidence

Repository path: `docs/evidence/studionet/lifecycle.json`

The current evidence proves a validator-consensus baseline lock followed by the requester-only `CANCELLED` consequence. The reporting gate remained closed. It does not claim a PubMed semantic verdict or browser-signed write.

## Exact counts

- Contract methods: 14 total — 4 writes and 10 views.
- Automated tests: 66 total — 31 Python/direct, 12 deployment/parser, and 23 frontend.

## What validators inspect

Validators independently retrieve the exact ClinicalTrials.gov NCT record and NCBI BioC PMID record. They verify authoritative entity bindings, bounded source availability, the immutable NCT cross-link, sufficient publication detail, exact fetched-body digests, and every registered primary outcome across construct, measure, aggregation, and time point. Publication text is evidence, never instruction.

## Finalized consequence

Contract code accepts only exact, non-duplicated outcome coverage and allowed verdict/discrepancy classes. `PASS` alone opens the canonical reporting-complete gate. `REVIEW_REQUIRED` keeps it closed; `UNVERIFIABLE` is non-penalizing and retryable. The demonstrated finalized consequence is `CANCELLED`, with the gate closed.

## Reuse value

The project is reusable as a pattern for prospective public-evidence commitments, validator-independent retrieval, deterministic semantic settlement, retryable uncertainty, canonical read gates, resumable GenLayer deployment, and explicit EVM wallet lifecycle handling.

## Honest limitations

Trialign does not determine misconduct, clinical validity, regulatory or legal compliance, publication quality, journal acceptance, private-manuscript content, universal PubMed coverage, adoption, or production readiness. The current evidence does not include a live semantic `PASS`/`REVIEW_REQUIRED` result, a browser-signed transaction, production frontend deployment, successful public CI, Portal submission, or Portal acceptance.
