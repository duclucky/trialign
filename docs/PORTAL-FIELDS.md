# Portal fields — publication-blocked draft

This packet is structurally complete but **not submission-ready** until the public repository, successful CI run, production frontend URL, and browser-wallet write lifecycle are available. Replace only the bracketed publication fields from canonical evidence; do not weaken the limitations.

## Title

Trialign

## Category

Projects

## Logo

`frontend/public/trialign-logo.svg`

## One-liner

Compare a clinical trial's registered outcomes with what its publication actually reports.

## Short description

Trialign helps clinical research teams, evidence reviewers, and reproducibility auditors compare prospectively registered primary outcomes with a linked publication. GenLayer validators retrieve the fixed ClinicalTrials.gov and PubMed sources, while contract code keeps the canonical reporting gate closed unless evidence coverage and concordance checks pass. Use it when a review needs a shared, inspectable result instead of one party's spreadsheet or summary. Trialign does not judge misconduct, clinical validity, or legal compliance.

## Availability

Preview — deployed on GenLayer Studio.

## How to try

1. Open `[PRODUCTION_FRONTEND_URL_REQUIRED]`. Until it is published, follow the local setup in the repository README and open `http://localhost:3000`.
2. Install or unlock a compatible EVM wallet such as MetaMask, Rabby, or OKX. The wallet needs enough Studionet GEN for transaction fees; Trialign sends zero GEN to the contract.
3. Confirm the header says `Studionet · 61999 · RPC verified`. If it says unavailable, stop and retry later rather than submitting a transaction.
4. Select **Connect wallet**, choose one of the wallets detected in the centered modal, and approve adding or switching to Studionet if your wallet asks.
5. In **Case ID**, enter a unique lowercase value such as `trialign-review-260901-a`. Change the final suffix if that case already exists.
6. In **NCT ID**, enter `NCT05340465`, then select **Create case** and approve the wallet transaction.
7. Watch the status move through **Submitted**, **Accepted**, and a positively verified **Finalized** result. Confirm the canonical panel reloads to `BASELINE_LOCKED` and the NCT is `NCT05340465`.
8. In **PMID**, enter `41430711`, select **Attach publication**, approve it, and again wait for positive finality and the canonical reload.
9. Select **Adjudicate**, approve the transaction, and wait for validators to retrieve the fixed PubMed BioC record and compare all four registered primary outcomes.
10. Read the canonical result after finalization: `REPORTING_COMPLETE` opens the reporting gate; `REVIEW_REQUIRED` keeps it closed; `PUBLICATION_ATTACHED` with a retry message means the public evidence was `UNVERIFIABLE` and no terminal claim was made.
11. Open the displayed Explorer link for every submitted transaction and confirm the contract address matches `0xbA8246955bBf41aA5DB5BF2d087C7Df6Fa16DE36`.
12. Use **Reload canonical case** once more. Browser status text or a transaction hash is not the result; the reloaded contract state is.
13. Open the connected account menu and select **Disconnect**. Confirm all four write controls become disabled.

## Public repository

`[PUBLIC_REPOSITORY_URL_REQUIRED]`

## Production app

`[PRODUCTION_FRONTEND_URL_REQUIRED]`

## Successful CI

`[SUCCESSFUL_CI_RUN_URL_REQUIRED]`

## Primary contract

https://explorer-studio.genlayer.com/address/0xbA8246955bBf41aA5DB5BF2d087C7Df6Fa16DE36

## Deployment transaction

https://explorer-studio.genlayer.com/tx/0xb8461a9954184c2cf3618041a8613ef73d080b97535f43354d073ede45b38c0b

## Finalized lifecycle evidence

Repository path: `docs/evidence/studionet/lifecycle.json`

The current evidence proves a validator-consensus baseline lock followed by the requester-only `CANCELLED` consequence. The reporting gate remained closed. It does not claim a PubMed semantic verdict or browser-signed write.

## Exact counts

- Contract methods: 14 total — 4 writes and 10 views.
- Automated tests: 75 total — 39 Python/direct, 12 deployment/parser, and 24 frontend.

## What validators inspect

Validators independently retrieve the exact ClinicalTrials.gov NCT record and NCBI BioC PMID record. They verify authoritative entity bindings, bounded source availability, the immutable NCT cross-link, sufficient publication detail, exact fetched-body digests, and every registered primary outcome across construct, measure, aggregation, and time point. Publication text is evidence, never instruction.

## Finalized consequence

Contract code accepts only exact, non-duplicated outcome coverage and allowed verdict/discrepancy classes. `PASS` alone opens the canonical reporting-complete gate. `REVIEW_REQUIRED` keeps it closed; `UNVERIFIABLE` is non-penalizing and retryable. The demonstrated finalized consequence is `CANCELLED`, with the gate closed.

## Reuse value

The project is reusable as a pattern for prospective public-evidence commitments, validator-independent retrieval, deterministic semantic settlement, retryable uncertainty, canonical read gates, resumable GenLayer deployment, and explicit EVM wallet lifecycle handling.

## Honest limitations

Trialign does not determine misconduct, clinical validity, regulatory or legal compliance, publication quality, journal acceptance, private-manuscript content, universal PubMed coverage, adoption, or production readiness. The current evidence does not include a live semantic `PASS`/`REVIEW_REQUIRED` result, a browser-signed transaction, production frontend deployment, successful public CI, Portal submission, or Portal acceptance.
