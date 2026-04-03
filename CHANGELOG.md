# Changelog

## Unreleased

- Added a deterministic local batch CLI for backlog processing.
- Added a managed workspace layout rooted outside the repo for CLI runtime data.
- Added a central SQLite catalog for processing history, courses, term records, requisites, CLOs, and program-scoped PLO definitions.
- Normalized managed workspace PLO CSV files into `catalog/plo/` and switched the CLI bundle to an SSR/node build so `node:sqlite` works in real runs.
- Reused shared browser/Node extraction and DOCX generation cores so the batch path and web app stay aligned.
- Added `report.csv` and `report.json` outputs plus `success/` and `review/` folders for batch runs.
- Added Node-side PDF worker bootstrapping so batch PDF extraction works against the current sample corpus.

## 0.1.0 - 2026-04-03

- First public beta release.
- Added deterministic PDF, DOCX, and TXT extraction with review-first editing.
- Added term selection, editable instructor override, and in-browser DOCX generation from the departmental template.
- Added optional AI suggestions with OpenAI and OpenRouter session-key support.
- Made AI assistance contextual and hid the non-functional project panel from the beta UI.
- Published the app on GitHub and Netlify for external testing.
