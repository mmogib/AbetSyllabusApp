# ABET Syllabus App: Working Notes

## Current Product Direction

- Client-only static web app.
- Companion local batch CLI for backlog processing.
- No backend, no auth, no server storage.
- Input: local `PDF`, `DOCX`, or `TXT`.
- Deterministic extraction first.
- Optional AI suggestions through browser-session API keys only.
- Review unresolved or low-confidence fields before generation.
- Primary output: in-browser generated `DOCX`.
- Secondary output path: local batch CLI outputs to `success/`, `review/`, `report.csv`, and `report.json`.
- Hidden for now: project export/import remains in code but is not exposed in the beta UI.

## Current Status

The app is now ready for friend-level beta testing.

Public endpoints:
- GitHub: `https://github.com/mmogib/AbetSyllabusApp`
- Netlify: `https://abet-syllabus-app.netlify.app`

Working pieces:
- upload flow for local source files
- browser-side extraction for `PDF`, `DOCX`, and `TXT`
- hardened deterministic parsing across the main sample set worked during the current cycle
- targeted review UI for unresolved fields
- optional AI suggestions with `OpenAI` or `OpenRouter`
- term selection with generated filenames like `T252MATH101AbetSyllabus.docx`
- DOCX generation using `output_template/ABETSyllabusTemplate2.docx`
- deterministic batch CLI for folder processing with CSV/JSON reports and review artifacts
- managed external CLI workspace plus central SQLite catalog for processing history and academic data
- `index/` holds reference inputs like PLO CSV files, while `processed/` holds successfully handled source files
- both CLI entrypoints now expose `--help`: batch generation and catalog querying

Known limitations:
- parsing is much better, but still rule-based and sample-sensitive
- some unseen PDF layouts will still need extraction/parser adjustments
- AI suggestions run client-side, so provider keys are exposed to the browser session
- there is still no backend persistence, collaboration, or audit trail
- project export/import is not currently exposed in the public UI
- SQLite support relies on Node's experimental `node:sqlite` module in the current environment

## Most Recent Delivery

The app was moved from the original placeholder document output to the new departmental design template by:
- switching DOCX generation to `output_template/ABETSyllabusTemplate2.docx`
- remapping the generator to the new multi-table structure
- preserving template-native numbering and bullets for topics and supplemental materials
- keeping the existing field model without introducing new syllabus fields

Recent stabilization work also included:
- stronger PDF line handling in `src/lib/extract/pdfText.ts`
- expanded parser coverage in `src/lib/parse/courseSpecParser.ts`
- OpenRouter support alongside OpenAI in `src/lib/llm/openaiSuggestions.ts`
- academic term utilities and filename generation in `src/lib/term/academicTerms.ts`
- contextual AI panels and hidden project panel in `src/App.tsx`
- shared browser/Node extraction and DOCX cores plus `src/cli/batchGenerate.ts`
- managed workspace handling in `src/cli/workspace.ts`
- central catalog schema and persistence in `src/cli/catalogDb.ts`

## Current Priorities

1. Run broader friend testing against additional real course files
2. Collect exact field-level failures from new samples
3. Patch extraction/parsing regressions with targeted tests
4. Use the batch CLI with the managed workspace and inspect the SQLite catalog plus per-run reports
5. Improve review/error messaging where failures are still confusing

## Restart Instruction

When resuming, start with:

1. Run `npm test`
2. Run `npm run build`
3. Test any newly reported sample files in `input_samples/`
4. Patch the exact extraction/parser failure before changing unrelated features
5. Keep the DOCX output aligned with `ABETSyllabusTemplate2.docx`
6. For backlog runs, use `npm run batch -- "<workspaceDir>" <MATH|AS|DATA>` or the direct Node CLI entry with `--workspace` and `--program`
