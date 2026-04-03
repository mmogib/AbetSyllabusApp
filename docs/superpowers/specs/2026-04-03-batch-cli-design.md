# Batch CLI Design

Date: 2026-04-03

## Goal

Add a local Node CLI to this repository that batch-processes course specification files from a folder and generates ABET syllabus DOCX files into a structured output directory.

The CLI is intended for backlog processing of older files. It must favor deterministic behavior, clear reporting, and safe failure handling over aggressive automatic recovery.

## Product Positioning

The existing web app remains the interactive path for one-off processing and review.

The batch CLI is a separate local workflow for:
- high-volume folder processing
- structured success/review/failure reporting
- creating deterministic artifacts that can later be inspected by a human or by Codex

Version 1 of the CLI will not use AI.

## Scope

In scope:
- process `PDF`, `DOCX`, and `TXT` files from an input directory
- optionally recurse through subfolders
- extract text using existing extraction code
- parse using existing deterministic parser
- compute review state using existing required-field logic
- generate DOCX only when required fields are resolved
- write a structured report in both `CSV` and `JSON`
- copy unresolved source files into a review folder
- write extracted text artifacts for files needing review
- default term code from the existing academic-term utility, with optional override

Out of scope for v1:
- AI assistance
- backend services
- concurrency or worker pools
- retry queues
- database persistence
- automatic correction of unresolved files

## CLI Contract

Primary command shape:

```bash
npm run batch -- --input ./input_samples --output ./batch_output
```

Initial options:
- `--input <dir>`: required source directory
- `--output <dir>`: required output directory
- `--term <code>`: optional; defaults to the current computed term
- `--recursive <true|false>`: optional; default `true`
- `--copy-review-sources <true|false>`: optional; default `true`
- `--write-extracted-text <true|false>`: optional; default `true`

Supported input files:
- `.pdf`
- `.docx`
- `.txt`

Unsupported files are ignored and should not fail the run.

## Output Structure

The CLI writes into a user-provided output root:

```text
<output>/
  success/
    T252MATH101AbetSyllabus.docx
    ...
  review/
    original-file.pdf
    original-file.extracted.txt
    ...
  report.csv
  report.json
```

Rules:
- `success/` contains only generated DOCX files for complete records
- `review/` contains copied source files that need manual review when `--copy-review-sources=true`
- `review/` also contains extracted text snapshots when `--write-extracted-text=true`
- reports are always written

## Processing Pipeline

For each supported source file:

1. Discover the file from the input directory.
2. Detect the format from the file extension.
3. Extract raw text using the existing extractor for that format.
4. Parse the extracted text into the existing syllabus draft shape.
5. Build review state using existing required-field logic.
6. If the draft can generate, write DOCX to `success/`.
7. If the draft cannot generate, do not write DOCX. Mark the result as `needs_review`.
8. If configured, copy the source file and extracted text into `review/`.
9. Append a row/object to the reports.
10. Continue even if another file fails.

## Status Model

Each processed file receives one of these statuses:
- `success`: DOCX generated
- `needs_review`: extraction and parsing completed, but required fields remain unresolved
- `failed`: extraction/parsing/generation threw an error

Behavior by status:
- `success`: write DOCX, write report entry
- `needs_review`: no DOCX, write report entry, optionally copy source and extracted text to `review/`
- `failed`: no DOCX, write report entry with error message, optionally copy source file to `review/`

## Reporting

The CLI writes both `report.csv` and `report.json`.

Required fields in each record:
- `sourceFile`
- `relativeSourcePath`
- `status`
- `termCode`
- `courseNumber`
- `courseTitle`
- `outputFile`
- `unresolvedFieldCount`
- `unresolvedFields`
- `extractedTextFile`
- `errorMessage`

Purpose of each format:
- `CSV`: quick human review, sorting, and filtering
- `JSON`: future tooling, dashboards, and automated follow-up workflows

## Term Handling

The CLI will use the same academic-term utility as the web app.

Rules:
- if `--term` is passed, use it
- otherwise use the current computed term

In v1, the term is primarily output identity context and file naming context. It is not expected to change the body content of the generated DOCX.

## Safety and Correctness Rules

The CLI must remain deterministic in v1.

Rules:
- no AI calls
- no hidden recovery that changes unresolved fields automatically
- do not generate DOCX for unresolved records
- never stop the entire batch because of one bad file
- write enough artifacts that a human or Codex can inspect the failure later

This keeps batch processing auditable and cheap while still producing high-value triage output.

## Code Reuse Strategy

The CLI must reuse existing code paths rather than duplicating logic.

Expected reused modules:
- text extraction in `src/lib/extract/*`
- parsing in `src/lib/parse/courseSpecParser.ts`
- review-state logic in `src/lib/review/buildReviewState.ts`
- DOCX generation in `src/lib/docx/generateSyllabusDocx.ts`
- term helpers in `src/lib/term/academicTerms.ts`

The CLI should be an orchestration layer around these modules.

## Implementation Shape

Expected new code areas:
- `src/cli/batchGenerate.ts` as the entry point
- a small helper module for file discovery and report writing if needed

Expected package-level integration:
- add an npm script such as `batch`

The design should avoid introducing a large CLI framework unless the implementation clearly needs one. Plain Node argument parsing is sufficient for v1.

## Error Handling

The CLI should capture and report:
- unsupported file format skips
- extraction failures
- parser/runtime exceptions
- DOCX generation failures
- filesystem write failures

Each error should be isolated to the current file when possible and recorded in the report.

The CLI should print a final console summary:
- total files discovered
- total processed
- successes
- needs review
- failures
- output folder path

## Testing Strategy

CLI tests should focus on orchestration rather than re-testing the entire parser/extractor stack.

Required first-wave tests:
- batch success with a complete `.txt` sample
- batch review case with a missing-field sample
- report generation for both `CSV` and `JSON`
- output-folder structure creation
- default-term filename behavior

Avoid making the CLI tests depend heavily on PDF integration details. Existing extractor/parser tests already cover those lower layers.

## Future Extensions

Potential later phases, not included in v1:
- optional AI-assisted batch review
- retry-only mode for failed files
- resume mode
- selective processing by extension or glob
- concurrent processing
- summary dashboard or HTML report

## Success Criteria

The batch CLI is considered complete for v1 when:
- a user can point it at a folder of real files
- complete files produce DOCX outputs in `success/`
- incomplete/problem files are surfaced in `review/` and reports
- the run never silently fabricates missing required data
- the reports are detailed enough for human/Codex follow-up
