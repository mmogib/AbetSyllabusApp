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
- Published the repo at `https://github.com/mmogib/AbetSyllabusApp`.
- Published the live beta at `https://abet-syllabus-app.netlify.app`.

## Verified State

- `npm test` current known passing state: PASS (`25 files`, `76 tests`)
- `npm run typecheck` current known passing state: PASS
- `npx vite build --emptyOutDir false` current known passing state: PASS
- `npm run batch -- "C:\\Users\\mmogi\\Documents\\AbetSyllabusData" MATH` current known passing state: creates/updates the central catalog and a per-run output folder
- `node .cli-dist/batchGenerate.cjs --workspace "<workspaceDir>" --program MATH` current known passing state: PASS after `npx vite build --config vite.cli.config.ts`

## Current Product Truth

This is now a public-beta candidate, not just a prototype. It is suitable for friend-level testing and feedback, but parser coverage is still rule-based and should be treated as actively improving rather than complete.
The project export/import feature still exists in code, but it is intentionally hidden from the current beta UI.
There is now also a deterministic local batch CLI for backlog processing, with no AI usage in v1, a managed external workspace, and a central SQLite catalog.
The managed workspace now expects reference PLO CSV files in `index/`, warns if the selected program still has no cataloged PLO rows, and moves successful source files into `processed/`.

## Highest Priority Next Step

Use friend testing and backlog batch runs to gather concrete failures from new real files:

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
- `tests/parse/courseSpecParser.test.ts`
- `tests/extract/pdfText.test.ts`
- `tests/docx/generateSyllabusDocx.test.ts`
- `tests/cli/batchGenerate.test.ts`
- `output_template/ABETSyllabusTemplate2.docx`
