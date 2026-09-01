# Official alignment snapshot

Retrieved: 2026-09-01 UTC  
Target: PROJECTS on Studionet

## Primary sources

- https://docs.genlayer.com/developers/intelligent-contracts/first-contract — supports the exact Depends header, one `gl.Contract` subclass, public decorators, and typed persistent storage; does not prove target-network deployment.
- https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle — supports independent validator verification and supported equivalence patterns; does not prove Trialign's semantic stability.
- https://docs.genlayer.com/developers/intelligent-contracts/testing — supports Python 3.12+, direct mode, mocks, and Studio/network testing; direct mode does not prove consensus or Studionet behavior.
- https://docs.genlayer.com/developers/intelligent-contracts/tooling-setup — supports `genvm-lint`, direct tests, project structure, and GenLayerJS frontend setup; examples are not deployment evidence.
- https://docs.genlayer.com/developers/intelligent-contracts/features/value-transfers — supports payable/value semantics and 1 GEN = 10^18; Trialign accepts no value.
- https://docs.genlayer.com/api-references/genlayer-js — supports signer-free reads, wallet-backed writes, network connection, receipt waiting, and finalized status; it does not prove browser CORS or a successful transaction.
- https://docs.genlayer.com/developers/networks — supports Studionet RPC, chain ID 61999, GEN, and Explorer base; parameters remain subject to preflight recheck.
- https://clinicaltrials.gov/data-api/about-api — supports the ClinicalTrials.gov API family; it does not prove a particular study is sufficient.
- https://www.ncbi.nlm.nih.gov/research/bionlp/APIs/BioC-PubMed/ — supports the PubMed BioC API family; it does not prove every PMID has sufficient abstract detail or an NCT cross-link.

## Drift assessment

No material drift was found against the frozen Forge handoff. Current official docs use the same Depends family and preserve independent validator verification. The build remains blocked from network claims until schema/lint/direct tests, live source probes, browser-local RPC checks, and Studionet finality are observed.
