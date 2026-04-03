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
