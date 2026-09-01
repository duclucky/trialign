# Trialign implementation plan

Execution mode: inline, test-driven, with a checkpoint after every risky boundary.

1. Lock specification and compatibility evidence.
   - Files: `docs/SPECIFICATION.md`, authority/claim/compatibility/safety/value matrices, `docs/SPEC-LOCK.json`.
   - Verify: hashes match and project/track/registry binding is exact.
2. Establish reproducible toolchain and contract RED tests.
   - Files: `requirements.txt`, `pyproject.toml`, `tests/direct/test_trialign_contract.py`, parser/metadata tests.
   - RED: missing contract and missing state behaviors fail for the intended reasons.
3. Implement the smallest contract that passes deterministic lifecycle tests.
   - Files: `contracts/trialign.py`.
   - GREEN: identity, authorization, state, time, idempotency, no-value, parser, settlement, malicious-output, injection, and all proof-corpus cases.
4. Add deployment parsing and resumable checkpoints test-first.
   - Files: `scripts/deploy.py`, `scripts/preflight.py`, `tests/test_receipts.py`, `tests/test_deployment_state.py`.
   - GREEN: raw/simplified receipt shapes, accepted/finalized separation, semantic result versus canonical consequence, no replay of known transactions.
5. Implement browser clients and UI test-first.
   - Files: `frontend/src/lib/*`, `frontend/src/components/*`, `frontend/src/app/*`.
   - RED/GREEN: EIP-6963 plus injected discovery, explicit chooser, switch/add, separate read/write clients, disconnect, lifecycle states, retry, canonical reload, keyboard/focus/responsive/reduced-motion behavior.
6. Run aggregate local verification.
   - Command: `npm run check`.
   - Required: lint/schema, all Python tests, frontend tests/typecheck/build, claim/static/secret checks.
7. Preflight and deploy resumably to Studionet.
   - Verify live official configuration, source endpoints, RPC chain/schema, ABI round-trip, credential presence without disclosure, and validator capability.
   - Record only allowlisted safe fields; recover finalized work instead of replaying writes.
8. Exercise one real finalized lifecycle and browser-local flow.
   - Distinguish submission, accepted, finalized execution, semantic verdict, and canonical consequence; capture sanitized state and Explorer links.
9. Lock evidence, review public hygiene, prepare repository and copy-ready Portal fields.
   - Do not click final Portal Submit.
