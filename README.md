# Trialign

Trialign is a GenLayer product for one narrow trust question: did a publication report the primary outcomes that a clinical trial registered prospectively?

It locks a public ClinicalTrials.gov primary-outcome baseline before the authoritative completion deadline, binds one PubMed identifier, and lets validators retrieve and compare the fixed public sources. Deterministic settlement checks run before any terminal state is written. A complete, concordant result opens a canonical reporting gate; a material discrepancy keeps it closed; unavailable or insufficient evidence remains retryable and non-accusatory.

Trialign does **not** determine misconduct, clinical validity, regulatory or legal compliance, publication quality, or journal acceptance.

## Current verified status

- Track: `PROJECTS`
- Network: GenLayer Studionet, chain ID `61999`
- Contract: [`0xbA8246955bBf41aA5DB5BF2d087C7Df6Fa16DE36`](https://explorer-studio.genlayer.com/address/0xbA8246955bBf41aA5DB5BF2d087C7Df6Fa16DE36)
- Deployment: [`0xb846…c0b`](https://explorer-studio.genlayer.com/transactions/0xb8461a9954184c2cf3618041a8613ef73d080b97535f43354d073ede45b38c0b), `FINALIZED`, `MAJORITY_AGREE`
- Contract surface: 14 public methods — 4 writes and 10 views
- Automated checks: 67 tests — 32 Python/direct, 12 deployment/parser, and 23 frontend
- Demonstrated canonical consequence: `CANCELLED` after a finalized baseline lock; the reporting gate remained closed

The current network evidence proves deployment, validator-consensus baseline retrieval, requester-only cancellation, and canonical reads. It does not claim a live PubMed semantic adjudication, a `PASS` result, browser-signed writes, hosted production frontend, adoption, or Portal acceptance.

## Contract lifecycle

```text
EMPTY -> BASELINE_LOCKED -> PUBLICATION_ATTACHED -> REPORTING_COMPLETE
                                               \-> REVIEW_REQUIRED

BASELINE_LOCKED -> CANCELLED
PUBLICATION_ATTACHED -- insufficient evidence --> PUBLICATION_ATTACHED (retryable)
```

The four writes are:

1. `create_case(case_id, nct_id)` — validators fetch and lock the ClinicalTrials.gov baseline.
2. `attach_publication(case_id, pmid)` — the requester binds one PMID.
3. `adjudicate(case_id)` — validators fetch the fixed NCBI BioC record and compare outcome meaning.
4. `cancel_unattached(case_id)` — requester-only recovery before a publication is attached.

The ten views expose validation helpers, policy version, canonical case state, the locked baseline, bounded discrepancy classes, attempt metadata, and the reporting gate. See [`docs/abi.json`](docs/abi.json) for the generated ABI.

## Validator inspection and consequence

For a baseline lock, validators inspect the exact ClinicalTrials.gov NCT binding, primary-completion date, and one to eight sufficiently described primary outcomes. For adjudication, they independently retrieve the exact PMID from NCBI BioC, verify the stored NCT cross-link, reject unavailable, mismatched, underspecified, or instruction-like evidence, and compare every registered outcome across construct, measure, aggregation, and time point.

Contract code then requires exact outcome coverage, no extra or duplicate IDs, allowed verdicts/classes, sufficient evidence for a terminal verdict, and a discrepancy for `REVIEW_REQUIRED`. Only `PASS` changes the case to `REPORTING_COMPLETE` and makes `can_advance_reporting` true. Unverifiable evidence cannot open the gate.

## Frontend

The Next.js frontend discovers EVM wallets through EIP-6963 and named injected fallbacks, presents an explicit wallet chooser, switches/adds Studionet before writes, distinguishes submitted/accepted/finalized/failed/retry states, and reloads canonical contract state. Reads use a same-origin, method-allowlisted proxy; writes stay on the selected EVM wallet provider. Disconnect clears the in-memory account/provider binding and disables writes.

## Run locally

Requirements: Python 3.12, Node.js, npm, and a compatible browser wallet for write testing.

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
npm ci
npm ci --prefix frontend
Copy-Item frontend/.env.example frontend/.env.local
```

Set only public frontend values in `frontend/.env.local`. Never place a private key anywhere in the frontend environment. Then run:

```powershell
$env:PYTHONUTF8 = "1"
npm run check
npm --prefix frontend run dev
```

For authorized, resumable Studionet operations, `npm run network:preflight`, `npm run network:deploy`, `npm run network:verify`, and `npm run network:lifecycle` discover the signing key from the ignored project `.env` first and then the ignored parent workspace `.env`. They save only sanitized, allowlisted evidence.

## Evidence and design records

- [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md) — locked scope and state machine
- [`docs/CLAIM-TO-CODE.md`](docs/CLAIM-TO-CODE.md) — claim-to-transition/view/test/evidence map
- [`docs/EVIDENCE-AUTHORITY-MATRIX.md`](docs/EVIDENCE-AUTHORITY-MATRIX.md) — authoritative input bindings
- [`docs/evidence/studionet/deployment.json`](docs/evidence/studionet/deployment.json) — sanitized deployment evidence
- [`docs/evidence/studionet/lifecycle.json`](docs/evidence/studionet/lifecycle.json) — sanitized finalized lifecycle and consequence
- [`docs/evidence/studionet/browser-local.json`](docs/evidence/studionet/browser-local.json) — browser-local RPC, wallet, canonical-read, and disconnect boundary

## Reuse value

Trialign is a reference for prospective public-evidence commitments, validator-independent retrieval, fail-closed semantic settlement, retryable uncertainty, canonical read gates, resumable GenLayer deployment, and explicit browser-wallet lifecycle handling. The same pattern can support other reporting-concordance workflows where both the pre-event baseline and later artifact have fixed authoritative public origins.

## License

[MIT](LICENSE)
