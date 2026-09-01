# Write-method safety cards

## `create_case`

- Caller: any nonzero EOA becomes the immutable requester.
- Allowed: unused valid case/NCT, zero value, authoritative sufficient baseline, transaction time strictly before primary-completion deadline.
- Forbidden: duplicate/malformed identifier, source/entity mismatch, missing outcome, equality/late time, any value.
- Idempotency: duplicate rejects before web work or mutation.
- Effect: stores exact baseline digest, normalized fields, requester, deadline, policy; no value.
- Views: `get_case`, `get_baseline_outcomes`.
- Negative tests: wrong value, duplicate, deadline −1/equality/+1 while phase is stale, 503, wrong NCT, malformed/missing outcome, digest mismatch.

## `attach_publication`

- Caller: stored requester only.
- Allowed: `BASELINE_LOCKED`, valid unused PMID, zero value.
- Forbidden: wrong caller/state, duplicate, malformed PMID, any value.
- Temporal: N/A; legality depends on immutable state, not time.
- Idempotency: duplicate rejects without mutation.
- Effect: stores PMID only; no verdict or value.
- Views: `get_case`.
- Negative tests: wrong caller/state, duplicate, malformed PMID, value.

## `adjudicate`

- Caller: any nonzero account; effect is isolated to the bound case.
- Allowed: `PUBLICATION_ATTACHED`, nonterminal, zero value, authoritative sufficient linked sources, valid consensus result.
- Forbidden: wrong state, terminal duplicate, source/entity/digest mismatch, invalid output, value.
- Temporal: N/A; the selected mechanism has no adjudication deadline.
- Idempotency: terminal duplicates reject; `UNVERIFIABLE` increments a bounded attempt and preserves retry.
- Effect: only validated `PASS`/`REVIEW_REQUIRED` becomes terminal; uncertainty changes no hard state or gate; no value.
- Views: `get_case`, `get_attempt`, `get_discrepancy_classes`, `can_advance_reporting`.
- Negative tests: source 503, wrong PMID/NCT, insufficient abstract, injection, valid-digest but wrong origin/entity binding, extra/missing/duplicate outcomes, invalid enum/class consistency, duplicate terminal call, state unchanged before valid settlement.

## `cancel_unattached`

- Caller: stored requester only.
- Allowed: `BASELINE_LOCKED`, zero value.
- Forbidden: wrong caller/state, publication attached, terminal/duplicate, value.
- Temporal: N/A; recovery is allowed only before publication interest is attached.
- Idempotency: duplicate rejects without mutation.
- Effect: state becomes `CANCELLED`; no value.
- Views: `get_case`, `can_advance_reporting`.
- Negative tests: wrong caller/state, after attachment, duplicate, value, state unchanged on rejection.
