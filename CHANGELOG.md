# Changelog

## Unreleased

- Added a deterministic local batch CLI for backlog processing.
- Added a managed workspace layout rooted outside the repo for CLI runtime data.
- Added a central SQLite catalog for processing history, courses, term records, requisites, CLOs, and program-scoped PLO definitions.
- Switched the CLI bundle to an SSR/node build so `node:sqlite` works in real runs.
- Revised the managed workspace so `index/` supplies PLO CSV files, successful source files move into `processed/`, and missing program PLO definitions only trigger a warning.
- Added a catalog query CLI with named reports, raw SQL inspection, CSV exports into `exports/`, and built-in help output.
- Reused shared browser/Node extraction and DOCX generation cores so the batch path and web app stay aligned.
- Added `report.csv` and `report.json` outputs plus `success/` and `review/` folders for batch runs.
- Added Node-side PDF worker bootstrapping so batch PDF extraction works against the current sample corpus.
- Added a local Codex CLO-PLO review skill with export, validate, and apply scripts.
- Updated the CLO-PLO review export format so each course file now starts with:
  - `Approve: yes`
  - initial `Final PLOs`
  - rationale in `Notes`
- Added transactional application of reviewed CLO-PLO mappings into `course_clo_plo_mappings`.
- Verified live application of reviewed mappings for `MATH 208`.

## 0.1.0 - 2026-04-03

- First public beta release.
- Added deterministic PDF, DOCX, and TXT extraction with review-first editing.
- Added term selection, editable instructor override, and in-browser DOCX generation from the departmental template.
- Added optional AI suggestions with OpenAI and OpenRouter session-key support.
- Made AI assistance contextual and hid the non-functional project panel from the beta UI.
- Published the app on GitHub and Netlify for external testing.
