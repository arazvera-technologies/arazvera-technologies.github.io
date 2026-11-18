# ARAZVERA Public Engineering Proof Lab

**Source-safe browser demonstration and evidence selector (18 November 2026).**

[Live website](https://arazvera-technologies.github.io/buyer-lab/) · [Seven-level public proof résumé](https://github.com/arazvera-technologies/arazvera-engineering-portfolio/blob/main/resumes/ARAZVERA_Buyer_Proof_Resume_20261118.pdf)

## What this proves
- A static GitHub Pages website can display 68 *metadata-only* technical entries (including overlapping/bundled products), filtered across seven internal levels.
- Seven source-free demonstration algorithms execute locally in the visitor's browser: webhook idempotency, tenant-aware reconciliation, workflow audit, agent tool decisions, synthetic release gates, supplier evidence preflight and restore manifest comparison.
- The buyer-matcher performs deterministic keyword mapping from **fictional or sanitized** requirement descriptions to a preliminary shortlist of up to three *private technical starter identifiers*, with public proof links and explicit remaining integration work. It is NOT an AI ranking system or a guarantee of readiness.
- Fourteen reproducible safe/fault JSON output examples are built from the public demo engine. Eight downloadable evidence ZIP packages contain public-only samples, résumé and catalog metadata.
- The website runs without backend accounts. Requirement text is processed locally; there is no submission endpoint, analytics collection or automatic emailing by the matcher.

## Independent repeatable checks
- `node --test tests/buyer_proof_engine.test.mjs tests/buyer_matcher.test.mjs` — 24 unit tests including negative paths, privacy and no-unsupported-fit behavior.
- `node tools/build_buyer_proof_samples.mjs` — reproducible 14 JSON fixtures.
- `python -B tests/buyer_lab_smoke.py` — isolated Chrome headless DOM and screenshot smoke.
- `python -B tests/buyer_lab_interaction_smoke.py` — isolated Chrome DevTools interactions: search, tier selection, PASS/REVIEW/ERROR, request-matcher presets, unsupported requests and markup injection.
- `.github/workflows/buyer-proof-ci.yml` — public GitHub Actions test + fixture diff + ZIP/catalog validation.

## What this does NOT prove
- Public demo algorithms are not the proprietary L1–L7 source engines. A related proof link is not a one-to-one validation of every private SKU.
- Historic SHA/ZIP integrity checks do **not** constitute software licensing clearance, vulnerability-free assurance, independent production security validation, customer acceptance, regulatory certification, actual payment execution or approved software export.
- Counts are inventory labels and test-suite counts; some packages share underlying modules. New customer APIs, schemas, identity, deployment, compliance and written acceptance can require material engineering beyond adapting a config file.

## Privacy and safe use
- Do not paste real personal, contractual, financial, private enterprise or credential data in the browser. Never assume fictional example output is suitable for a live customer.
- The matcher sends **no** outreach or submissions; downloadable reports are generated locally.
- No private source ZIP, private repository URL, client access token or proprietary material is distributed via this static site.

Contact for written, asynchronous scoping after legality and payment eligibility verification: **contact.arazvera@gmail.com**.
