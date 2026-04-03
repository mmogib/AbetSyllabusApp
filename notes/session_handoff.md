# Session Handoff

Date: 2026-04-03

## What Was Completed

- Stabilized parsing and extraction against several real sample files during live review.
- Improved PDF line handling and parser rules for BUS 200, DATA 201, and related layouts.
- Added optional AI suggestions through both `OpenAI` and `OpenRouter`.
- Added academic term handling and generated DOCX filenames such as `T252MATH101AbetSyllabus.docx`.
- Switched the output generator to `output_template/ABETSyllabusTemplate2.docx`.
- Adjusted DOCX generation so template-native numbering and bullets are preserved.
- Hid the non-functional project export/import panel from the public beta UI while keeping the code in place.
- Added a deterministic local batch CLI for backlog processing.
- Added a managed workspace flow and central SQLite catalog for the batch CLI.
- Revised the workspace so `index/` is the stable home for PLO CSV files and `processed/` receives successfully handled source files.
- Added a separate catalog query CLI with named reports, raw SQL, CSV export into `exports/`, and built-in help.
- Designed and installed a local Codex skill for CLO-PLO review and application at `C:\Users\mmogi\.codex\skills\clo-plo-mapping-review`.
- Updated the CLO-PLO skill so export now performs an initial mapping pass:
  - one Markdown file per course
  - `Approve: yes` by default
  - AI-generated `Final PLOs`
  - rationale in `Notes`
- Applied a reviewed mapping file into the live catalog for `MATH 208`.
- Published the repo at `https://github.com/mmogib/AbetSyllabusApp`.
- Published the live beta at `https://abet-syllabus-app.netlify.app`.

## Verified State

- `npm test` current known passing state: PASS (`25 files`, `76 tests`)
- `npm run typecheck` current known passing state: PASS
- `npx vite build --emptyOutDir false` current known passing state: PASS
- `npm run batch -- "C:\\Users\\mmogi\\Documents\\AbetSyllabusData" MATH` current known passing state: creates/updates the central catalog and a per-run output folder
- `node .cli-dist/batchGenerate.cjs --workspace "<workspaceDir>" --program MATH` current known passing state: PASS after `npx vite build --config vite.cli.config.ts`
- CLO-PLO skill current known script verification:
  - `export_review.py`: PASS on disposable workspace and real workspace exports
  - `validate_review.py`: PASS on exported files using the new format
  - `apply_review.py`: PASS on disposable workspace and live apply for `MATH 208`

Note:
- I did not rerun the full app test/build suite during this final closing pass. The passing app verification above is the most recent known state from earlier in the session.

## Current Product Truth

This is now a public-beta candidate, not just a prototype. It is suitable for friend-level testing and feedback, but parser coverage is still rule-based and should be treated as actively improving rather than complete.
The project export/import feature still exists in code, but it is intentionally hidden from the current beta UI.
There is now also a deterministic local batch CLI for backlog processing, with no AI usage in v1, a managed external workspace, and a central SQLite catalog.
The managed workspace now expects reference PLO CSV files in `index/`, warns if the selected program still has no cataloged PLO rows, and moves successful source files into `processed/`.
The CLO-PLO skill is usable now, but its initial mapping quality depends on the quality of the stored `course_clos.clo_text` values in the catalog.

## Highest Priority Next Step

Clean upstream CLO text before scaling CLO-PLO mapping work.

Specifically:
- inspect noisy `course_clos.clo_text` values in the catalog
- patch the parser/extraction path so CLO rows contain only the CLO statement
- reprocess affected courses into the managed workspace/catalog
- then re-evaluate the exported CLO-PLO mappings

In parallel, continue using friend testing and backlog batch runs to gather concrete failures from new real files:

- exact source file name
- exact bad parsed value or generated DOCX text
- what the correct value should have been

Then patch the specific failure and add a regression test before changing unrelated behavior.

## Important Files

- `src/App.tsx`
- `src/lib/extract/pdfText.ts`
- `src/lib/extract/docxText.ts`
- `src/lib/parse/courseSpecParser.ts`
- `src/lib/llm/openaiSuggestions.ts`
- `src/lib/term/academicTerms.ts`
- `src/lib/docx/generateSyllabusDocx.ts`
- `src/cli/batchGenerate.ts`
- `src/cli/batchGenerateCore.ts`
- `src/cli/nodeAdapters.ts`
- `src/cli/workspace.ts`
- `src/cli/catalogDb.ts`
- `src/cli/ploCatalog.ts`
- `C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\SKILL.md`
- `C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\scripts\export_review.py`
- `C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\scripts\validate_review.py`
- `C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\scripts\apply_review.py`
- `tests/parse/courseSpecParser.test.ts`
- `tests/extract/pdfText.test.ts`
- `tests/docx/generateSyllabusDocx.test.ts`
- `tests/cli/batchGenerate.test.ts`
- `output_template/ABETSyllabusTemplate2.docx`

## Suggested Next Session Agenda

1. Query the catalog for noisy CLO rows, starting with `MATH 208`
2. Trace the bad CLO text back to the extraction/parser stage
3. Patch the parser so CLOs exclude assessment/delivery/table residue
4. Add targeted regression tests for the affected layout
5. Re-run the affected source files through the batch pipeline
6. Re-export CLO-PLO review files only after the stored CLO text is clean
