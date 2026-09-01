# Evidence authority matrix

| Input | Controller and canonical objective | Required bindings | Availability and exact-content proof | Safe failure |
|---|---|---|---|---|
| Case configuration | Transaction sender; bind case ID, requester, NCT, policy, deployment revision | sender, case, state, network, contract revision, policy version | Canonical contract state; no party prose enters judgment | Revert |
| ClinicalTrials.gov baseline | NLM ClinicalTrials.gov; capture prospective primary outcomes for exact NCT | fixed HTTPS origin/path, exact NCT, documented protocol fields, retrieval time, authoritative completion date | HTTP success, bounded exact body, JSON object, exact NCT, at least one complete outcome; SHA-256 recomputed from reviewed bytes | Explicit nonterminal failure; no case created |
| Publication configuration | Stored requester; bind one PMID to one locked case | sender, case, NCT, state, policy version, numeric PMID | Canonical contract state; no supplied abstract, URL, summary, verdict, or consequence | Revert |
| NCBI publication | NCBI BioC; retrieve exact PMID record linked to locked NCT | fixed HTTPS origin/path, exact PMID source ID, exact NCT token, bounded title/abstract, retrieval time | HTTP success, bounded exact body, parseable BioC, exact entity and cross-link, sufficient outcome details; SHA-256 recomputed from reviewed bytes | `UNVERIFIABLE`; state/gate unchanged and retry allowed |

Hashes prove byte stability, not origin. Authority comes from a fixed validator-accessible HTTPS origin plus exact identifier checks and independent retrieval. Neither source proves sponsor-entered scientific data is accurate. Any record text that requests a verdict, policy change, payment, or authority change is untrusted content.
