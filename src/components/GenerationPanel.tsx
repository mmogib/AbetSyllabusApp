import { useState } from 'react';
import type { SyllabusDraft } from '../types/schema';
import { generateSyllabusDocx } from '../lib/docx/generateSyllabusDocx';
import { buildAbetSyllabusFileName, type TermOption } from '../lib/term/academicTerms';
import { downloadBlob } from '../utils/download';

export interface GenerationPanelProps {
  draft: SyllabusDraft;
  canGenerate: boolean;
  termCode: string;
  termOptions: TermOption[];
  onTermChange: (termCode: string) => void;
  fileName?: string;
}

export function GenerationPanel({
  draft,
  canGenerate,
  termCode,
  termOptions,
  onTermChange,
  fileName,
}: GenerationPanelProps) {
  const [status, setStatus] = useState('Ready to generate a DOCX file.');
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    if (!canGenerate || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setStatus('Generating DOCX...');

    try {
      const blob = await generateSyllabusDocx(draft);
      downloadBlob({
        blob,
        fileName:
          fileName ??
          buildAbetSyllabusFileName(termCode, draft.courseIdentity.courseNumber),
      });
      setStatus('DOCX ready for download.');
    } catch {
      setStatus('DOCX generation failed.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="generation-panel" aria-labelledby="generation-panel-title">
      <div className="section-heading">
        <div>
          <h2 id="generation-panel-title">Generate DOCX</h2>
          <p>Download a browser-built syllabus DOCX from the resolved draft.</p>
        </div>
      </div>

      <label className="generation-panel__field" htmlFor="generation-panel-term">
        <span>Term</span>
        <select
          id="generation-panel-term"
          value={termCode}
          onChange={(event) => onTermChange(event.target.value)}
        >
          {termOptions.map((termOption) => (
            <option key={termOption.code} value={termOption.code}>
              {termOption.label}
            </option>
          ))}
        </select>
      </label>

      <div className="generation-panel__actions">
        <button type="button" onClick={handleGenerate} disabled={!canGenerate || isGenerating}>
          {isGenerating ? 'Generating...' : 'Download DOCX'}
        </button>
      </div>

      <p className="generation-panel__status" role="status" aria-live="polite">
        {canGenerate ? status : 'Resolve all required fields before generating.'}
      </p>
    </section>
  );
}
