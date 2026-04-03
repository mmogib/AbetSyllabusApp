# AbetSyllabusApp

Client-only web app for turning KFUPM-style course specification files into ABET syllabus DOCX output.

## Status

This repository is ready for public beta testing, not final production. The app runs fully in the browser and is designed for fast iteration on real departmental samples.

Current capabilities:
- upload local `PDF`, `DOCX`, or `TXT` course specification files
- extract and parse course identity, credits, description, prerequisites, CLOs, topics, and materials
- review unresolved or low-confidence fields before generation
- optionally request AI suggestions with `OpenAI` or `OpenRouter`
- generate DOCX output using the departmental template in `output_template/ABETSyllabusTemplate2.docx`
- generate filenames in the form `T252MATH101AbetSyllabus.docx`
- batch-process folders of source files into `success/`, `review/`, `report.csv`, and `report.json`

## Product Constraints

- No backend
- No auth
- No server storage
- API keys are stored in browser session only
- AI usage is optional
- project export/import remains in code but is hidden from the public beta UI for now

## Local Development

Requirements:
- `Node.js` 20+
- `npm`

Run locally:

```bash
npm install
npm run dev
```

Verification:

```bash
npm test
npm run build
```

## Batch CLI

Backlog processing is available through a managed workspace:

```bash
npm run batch -- "C:\\Users\\mmogi\\Documents\\AbetSyllabusData" MATH
```

Recommended runtime root:

```text
C:\Users\mmogi\Documents\AbetSyllabusData
```

Behavior:
- deterministic only in v1, with no AI calls
- bootstraps or reuses a managed workspace rooted at the provided workspace path
- normalizes detected PLO CSV files into `catalog/plo/`
- imports program-specific PLO rows from CSV files for `MATH`, `AS`, or `DATA`
- stores processing history and academic data in a central SQLite catalog
- generates DOCX only for files whose required fields are fully resolved
- copies review-needed source files into per-run `review/`
- writes both `report.csv` and `report.json` for each run

Output structure:

```text
<workspace>/
  catalog/
    abet_syllabus_catalog.sqlite
    plo/
  inbox/
  runs/
    <timestamp>/
      output/
        success/
        review/
        report.csv
        report.json
  exports/
  logs/
```

Optional flags:
- `--workspace <path>`
- `--program <MATH|AS|DATA>`
- `--catalog-db <path>`
- `--output <path>`
- `--term 252`
- `--recursive false`
- `--copy-review-sources false`
- `--write-extracted-text false`

For direct Node invocation after building the CLI bundle:

```bash
npx vite build --config vite.cli.config.ts
node .cli-dist/batchGenerate.cjs --workspace "C:\\Users\\mmogi\\Documents\\AbetSyllabusData" --program MATH
```

## Release Workflow

Simple versioned releases are handled with `npm version`.

Available commands:

```bash
npm run release:patch
npm run release:minor
npm run release:major
```

What each release command does:
- runs verification first: `npm test`, `npm run typecheck`, and `npx vite build --emptyOutDir false`
- bumps the app version in `package.json` and `package-lock.json`
- creates the release commit and git tag such as `v0.1.1`
- pushes the current branch and tags to GitHub

Release commands should be run from a clean git worktree.

## Deployment

This is a static Vite app and is configured for Netlify:
- build command: `npm run build`
- publish directory: `dist`

If you connect the repository to Netlify, the included `netlify.toml` should be enough for a standard deploy.

Current public endpoints:
- GitHub repository: `https://github.com/mmogib/AbetSyllabusApp`
- Live site: `https://abet-syllabus-app.netlify.app`

## Testing Workflow

The fastest way to improve parser coverage is to test a real file, compare the parsed output with the source, and then patch the exact failure with a regression test.

## Repository Notes

- Main template: `output_template/ABETSyllabusTemplate2.docx`
- Parser entry point: `src/lib/parse/courseSpecParser.ts`
- PDF extraction entry point: `src/lib/extract/pdfText.ts`
- DOCX generation entry point: `src/lib/docx/generateSyllabusDocx.ts`
- Batch CLI entry point: `src/cli/batchGenerate.ts`
- SQLite catalog schema: `src/cli/catalogDb.ts`
