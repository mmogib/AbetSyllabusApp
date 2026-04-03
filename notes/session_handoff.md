# Session Handoff

Date: 2026-04-03

## What Was Completed

- Stabilized parsing and extraction against several real sample files during live review.
- Improved PDF line handling and parser rules for BUS 200, DATA 201, and related layouts.
- Added optional AI suggestions through both `OpenAI` and `OpenRouter`.
- Added academic term handling and generated DOCX filenames such as `T252MATH101AbetSyllabus.docx`.
- Switched the output generator to `output_template/ABETSyllabusTemplate2.docx`.
- Adjusted DOCX generation so template-native numbering and bullets are preserved.
- Published the repo at `https://github.com/mmogib/AbetSyllabusApp`.
- Published the live beta at `https://abet-syllabus-app.netlify.app`.

## Verified State

- `npm test` last known passing state before release prep: `59/59`
- `npm run build` last known passing state before release prep: PASS

## Current Product Truth

This is now a public-beta candidate, not just a prototype. It is suitable for friend-level testing and feedback, but parser coverage is still rule-based and should be treated as actively improving rather than complete.

## Highest Priority Next Step

Use friend testing to gather concrete failures from new real files:

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
- `tests/parse/courseSpecParser.test.ts`
- `tests/extract/pdfText.test.ts`
- `tests/docx/generateSyllabusDocx.test.ts`
- `output_template/ABETSyllabusTemplate2.docx`
