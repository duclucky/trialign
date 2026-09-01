# Value-destination matrix

Trialign is intentionally no-value.

| Asset | Accepted | Payer | Locked state | Release/refund/forfeit | Terminal and retry behavior | Proof |
|---|---:|---|---|---|---|---|
| GEN | No | None | None | None | Every public write requires zero value; duplicate, late, failed, and retry paths cannot change accounting | no payable decorators; no purse/credit/balance fields; metadata and negative tests |
