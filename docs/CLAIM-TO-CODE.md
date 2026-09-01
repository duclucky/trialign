# Claim-to-code map

| Public claim | State transition / code surface | Canonical view | Required test | Evidence item |
|---|---|---|---|---|
| Locks a prospective registered baseline | `create_case`: `EMPTY -> BASELINE_LOCKED`; fixed ClinicalTrials.gov parser | `get_case`, `get_baseline_outcomes` | exact NCT, required fields, immutable digest, deadline −1/equality/+1 with stale state, unavailable source | sanitized finalized create receipt + state read + source-binding record |
| Checks one publication against that baseline | `attach_publication`, `adjudicate`; fixed NCBI BioC parser | `get_case`, `get_attempt` | exact PMID/NCT, sufficiency, injection, commitment mismatch, validator independence | finalized attachment/adjudication receipts + canonical reads |
| Distinguishes concordance, discrepancy, and uncertainty | normalized schema plus deterministic settlement checks | `get_case`, `get_attempt`, `get_discrepancy_classes` | all verdicts/classes, missing/extra/duplicate IDs, invalid enums, malformed output | direct corpus and network semantic result |
| Enforces reporting completion | terminal transition after validator consensus | `can_advance_reporting` | finality boundary, duplicate terminal call, state reload | finalized PASS or honest non-PASS consequence read |
| Provides a real browser workflow | wallet registry, separate read/write clients, transaction state machine, canonical reload | same contract views | chooser, network switch/add, disconnect, lifecycle statuses, failed/retry, CORS | browser-local capture and console/network check |

Claims without all five columns are excluded from README and Portal text.
