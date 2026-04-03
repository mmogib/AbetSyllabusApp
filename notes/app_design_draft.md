# ABET-SYLLABUS App Design Draft

Date: 2026-04-02

## Current Decisions

- Delivery target: internet-accessible beta, shared with a small invited group first, then published more broadly.
- Auth model: simple auth for invited testers.
- Processing unit: one input file produces one syllabus.
- Batch behavior: users may submit many files, but each file is processed independently.
- Input support for beta: PDF and DOCX only.
- Extraction strategy: deterministic extraction first.
- AI/LLM role: only used for unresolved required fields after deterministic extraction.
- Review workflow: user reviews and fills only missing or unresolved data.
- In-app editing: no full section-by-section syllabus editing in beta.
- Output formats: generate both DOCX and PDF from the same approved draft.
- Template policy: fixed single template for beta.
- File retention: keep structured draft/output history, but delete original uploaded source files after extraction.

## Chosen Product Approach

Recommended and approved approach: structured pipeline web app.

Why:

- It matches the beta scope closely.
- It keeps deterministic extraction as the default behavior.
- It makes LLM use targeted and explainable.
- It provides a clean path for improving extraction quality over time.

Alternatives considered but not chosen:

- LLM-centric extraction with rules as helper
- Template-specific importers only

## Product Flow

1. User signs in through simple invited authentication.
2. User uploads one or more source files.
3. Each file becomes its own processing job.
4. The app extracts structured syllabus fields from the source document.
5. Missing or low-confidence required fields are sent to the LLM for proposed values.
6. The user sees a review form containing only unresolved or proposed fields.
7. After user confirmation, the app generates one DOCX and one PDF using the fixed departmental template.
8. The app stores the structured draft and generated outputs in user history.
9. The original uploaded source file is deleted after extraction succeeds.

## System Architecture

### 1. Frontend

A small authenticated web UI for:

- upload
- job status
- missing-field review
- download/history

The frontend should not contain extraction logic.

### 2. Application Backend

The backend owns:

- auth/session handling
- upload orchestration
- job creation
- schema validation
- missing-field detection
- LLM fallback calls
- generation triggers

This is the control plane for the product workflow.

### 3. Document Processing Pipeline

The backend pipeline is split into stages:

- text extraction from PDF/DOCX
- deterministic field extraction into a canonical syllabus schema
- confidence and missing-field analysis
- optional LLM proposal generation for unresolved required fields
- final template rendering to DOCX
- PDF conversion from the generated DOCX

### 4. Storage

Persistent storage should keep:

- user accounts and invited access state
- processing jobs
- structured extracted syllabus drafts
- generated DOCX outputs
- generated PDF outputs

Source uploads should only exist temporarily and be deleted after successful extraction.

### 5. Fixed Schema and Fixed Template

The main product contract is a structured syllabus schema.

- Parsers write into the schema.
- Review forms read from the schema.
- Generators read only from the schema.

This keeps parsing concerns separate from document rendering concerns.

## Notes From Sample Review

The sample course-specification inputs and the syllabus template overlap well, but not perfectly:

- input files contain richer accreditation-style metadata
- the target syllabus format is narrower and more teaching-facing

Implication:

- the app needs explicit field mapping rules
- unresolved or non-direct mappings must surface through the review workflow

## Open Items For Next Design Steps

- canonical syllabus schema
- confidence model and missing-field rules
- generation/rendering strategy
- recommended stack for Netlify-friendly deployment
- invited-auth implementation choice
- storage and job-processing model
- test strategy and rollout boundaries
