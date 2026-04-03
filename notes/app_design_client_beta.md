# ABET-SYLLABUS Client-Only Beta Spec

Date: 2026-04-02

## Product Goal

Build a very simple, low-cost beta of the ABET-SYLLABUS app that runs entirely in the browser as a static web app.

The app should:

- accept PDF and DOCX course-specification files
- extract as much syllabus data as possible deterministically
- optionally use an LLM for unresolved required fields
- ask the user only for missing or unresolved data
- generate a DOCX syllabus as the primary artifact
- support a guided manual PDF conversion path
- avoid backend infrastructure, accounts, databases, and shared storage

## Approved Constraints

- Deployment: static frontend on Netlify or similar
- Processing model: client-only
- Auth: none
- Input model: one input file produces one syllabus
- Batch behavior: optional multiple-file handling later, but each file remains independent
- Input formats: PDF and DOCX
- Extraction strategy: deterministic first
- LLM role: optional assistant only for unresolved required fields
- LLM dependency: app must still work if the user provides no API key
- Review behavior: collect only missing or unresolved data
- In-app editing: no full syllabus editor
- Primary output: DOCX
- Secondary output: PDF via guided manual conversion outside the app
- Persistence: downloadable project file
- API key policy:
  - default session-only in memory
  - optional remember-on-this-device setting
  - explicit forget-key action
  - API key must never be included in exported project files

## Why This Scope

This scope is intentionally optimized for:

- near-zero recurring cost
- low operational complexity
- private local document handling
- fast beta validation with colleagues

It trades away:

- user accounts
- shared history
- centralized storage
- background workers
- automatic high-fidelity PDF generation

## User Workflow

1. User opens the static web app.
2. User uploads a PDF or DOCX course-specification file.
3. The browser extracts text locally.
4. Deterministic parsers map extracted content into the app's syllabus schema.
5. The review engine identifies required fields that are missing or ambiguous.
6. If the user has provided an OpenAI API key, the app requests LLM suggestions only for unresolved required fields.
7. The app shows a compact review form containing only unresolved or proposed fields.
8. The user confirms or edits those fields.
9. The app generates a DOCX syllabus locally.
10. The user downloads the DOCX.
11. The app provides guidance for producing a PDF manually from the DOCX.
12. The user may export a local project file and later reload it in the app.

## Architecture

### 1. Static Frontend

A single-page web app, likely React-based, deployed as static assets only.

Responsibilities:

- upload UI
- extraction status UI
- missing-field review UI
- API key session management UI
- DOCX generation/download UI
- project export/import UI

### 2. Browser Extraction Layer

Runs entirely in the browser.

Responsibilities:

- read PDF text
- read DOCX text
- normalize raw extracted text
- expose structural hints useful to deterministic parsers

This layer should aim for practical text extraction, not perfect document fidelity.

### 3. Deterministic Parsing Layer

Transforms extracted text into a structured draft using:

- heading matching
- table-like section parsing
- label/value extraction
- normalization rules

This layer should target the real sample formats first.

### 4. Canonical Syllabus Schema

All extraction and generation should go through one normalized model.

Suggested groups:

- `course_identity`
- `materials`
- `course_information`
- `learning_outcomes`
- `topics`
- `review_metadata`
- `generation_metadata`

Only fields required by the final syllabus output should be part of the main user-facing draft.

### 5. Optional LLM Assistant

The LLM is not the main extraction engine.

Its role is limited to:

- unresolved required fields
- ambiguous required fields
- suggested values grounded in extracted text

Rules:

- no API key means no LLM calls
- app remains fully usable without LLM
- LLM output must always require user confirmation

### 6. Local Project Persistence

The app should support:

- export project file
- import project file

The project file should contain:

- extracted structured draft
- review state
- source metadata useful for reopening the job
- generated artifact metadata if needed

The project file must not contain:

- API keys

## Review Logic

The review form should be driven by required target fields, not by every extracted field.

Per required field:

1. If deterministic extraction is clear and high-confidence, accept it automatically.
2. If the value is missing or ambiguous, mark it for review.
3. If an API key is available, ask the LLM for a suggested value with brief supporting evidence.
4. Show the user only unresolved or suggested fields.
5. Block DOCX generation until all required fields are resolved.

## Confidence Model

Keep confidence simple and rule-based for beta.

- `high`: direct heading/label match with a clean parsed value
- `medium`: nearby heading or partial structural match
- `low`: conflicting candidates, inferred grouping, or weak text match

Only `high` confidence deterministic values should bypass review automatically.

## Output Strategy

### DOCX

Primary artifact for the beta.

The browser should generate the DOCX locally from the approved structured draft and a fixed syllabus template model.

### PDF

Not generated as a first-class pipeline artifact in beta.

Instead, the app should provide:

- a clear message that DOCX is the canonical beta output
- instructions for manual conversion to PDF
- possibly a print-friendly preview later, but not as a required first-beta feature

## Key Product Boundaries

The beta is not:

- a multi-user managed web platform
- a full online syllabus editor
- a document repository
- an enterprise workflow system

The beta is:

- a local-in-browser syllabus drafting assistant
- deterministic-first
- optionally AI-assisted
- output-focused

## Recommended Build Order

1. Static app shell and upload flow
2. Canonical schema and required-field rules
3. PDF and DOCX browser text extraction
4. Deterministic parsers for sample formats
5. Review engine for missing/ambiguous fields
6. Optional API key session flow
7. LLM suggestion layer for unresolved fields
8. Review form UI
9. DOCX generation
10. Project export/import
11. PDF guidance UX

## Open Questions For Next Planning Step

- exact frontend stack
- browser libraries for PDF/DOCX extraction
- browser DOCX generation approach
- structure of exported project file
- exact syllabus schema fields required by the fixed template
- how batch processing should behave in a client-only app
