# Compatibility matrix

Observed: 2026-09-01 UTC. These are pinned build facts, not reusable Forge policy.

| Boundary | Pinned fact | Primary source | Required observed check |
|---|---|---|---|
| GenVM runtime | `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` | GenLayer “Your First Contract” | contract header import, `genvm-lint check`, schema extraction, direct deploy |
| Contract API | one named `gl.Contract`, `@gl.public.view`, `@gl.public.write`, typed storage, `TreeMap`/`DynArray` | GenLayer contract structure docs | linter prints recognized `TrialignContract`; ABI snapshot |
| Equivalence | independent evidence and custom bounded validator through supported equivalence API | GenLayer Equivalence Principle | direct leader/validator agreement and malicious leader rejection; target capability probe |
| Linter | `genvm-linter==0.11.0` | official linter docs and PyPI index | Python 3.12 venv, version output, lint/schema success |
| Direct test SDK | `genlayer-test==0.29.2` | official testing docs and PyPI index | Python 3.12 direct tests with strict mocks/pickling where supported |
| Browser client | `genlayer-js==1.1.8` | official GenLayerJS docs and npm registry | contract schema ABI round-trip, read, write, FINALIZED wait, execution-result parsing |
| Target network | Studionet GenLayer RPC `https://studio.genlayer.com/api`, chain ID `61999`, currency `GEN` | official Networks page | allowlisted `eth_chainId`, safe RPC health/schema probe, wallet switch/add |
| Explorer | `https://explorer-studio.genlayer.com` | official Networks page | deployed contract and transaction routes return expected public page |
| ClinicalTrials.gov | `https://clinicaltrials.gov/api/v2/studies/{NCTId}` | ClinicalTrials.gov API documentation | bounded live probe, parser fixture, exact NCT/date/outcome checks |
| NCBI BioC | `https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pubmed.cgi/BioC_json/{PMID}/unicode` | NCBI BioC API | bounded live probe, parser fixture, exact PMID/NCT checks |
| Receipt parser | raw and simplified `waitForTransactionReceipt(... FINALIZED ...)` shapes | official GenLayerJS docs | fixtures for submitted, accepted, finalized-success, finalized-failed, and semantic `UNVERIFIABLE` |

Material drift blocks deployment until this matrix is revised and re-proven. “Latest” is not a compatibility result.
