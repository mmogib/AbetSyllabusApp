# AbetSyllabusApp

Client-only web app for turning KFUPM-style course specification files into ABET syllabus DOCX output.

## Status

This repository is ready for public beta testing, not final production. The app runs fully in the browser and is designed for fast iteration on real departmental samples.

Current capabilities:
- upload local `PDF`, `DOCX`, or `TXT` course specification files
- extract and parse course identity, credits, description, prerequisites, CLOs, topics, and materials
- review unresolved or low-confidence fields before generation
- optionally request AI suggestions with `OpenAI` or `OpenRouter`
- export/import local project JSON files
- generate DOCX output using the departmental template in `output_template/ABETSyllabusTemplate2.docx`
- generate filenames in the form `T252MATH101AbetSyllabus.docx`

## Product Constraints

- No backend
- No auth
- No server storage
- API keys are stored in browser session only
- AI usage is optional

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
