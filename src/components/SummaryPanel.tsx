import { useState } from 'react';
import { generateSyllabusDocx } from '../lib/docx/generateSyllabusDocx';
import { downloadBlob } from '../utils/download';
import type { SyllabusDraft } from '../types/schema';

export interface SummaryPanelProps {
  draft: SyllabusDraft;
  canGenerate: boolean;
  fileName: string;
  sourceFileName: string;
  openFieldCount: number;
}

export function SummaryPanel({
  draft,
  canGenerate,
  fileName,
  sourceFileName,
  openFieldCount,
}: SummaryPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('Ready to download a DOCX file.');

  async function handleGenerate() {
    if (!canGenerate || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setStatus('Generating DOCX...');

    try {
      const blob = await generateSyllabusDocx(draft);
      downloadBlob({ blob, fileName });
      setStatus('DOCX ready for download.');
    } catch {
      setStatus('DOCX generation failed.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="summary-panel" aria-labelledby="summary-panel-title">
      <div className="section-heading">
        <div>
          <h2 id="summary-panel-title">Summary</h2>
          <p>
            Review the key detected course information before download.
            {' '}
            <strong>{sourceFileName}</strong>
          </p>
        </div>
        <div className="summary-panel__actions">
          <span className="review-panel__count">{openFieldCount} open</span>
          <button
            type="button"
            className="button button--success"
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Download DOCX'}
          </button>
        </div>
      </div>

      <dl className="summary-grid">
        <div>
          <dt>Department</dt>
          <dd>{draft.courseIdentity.department || 'Not detected'}</dd>
        </div>
        <div>
          <dt>Course Number</dt>
          <dd>{draft.courseIdentity.courseNumber || 'Not detected'}</dd>
        </div>
        <div>
          <dt>Course Title</dt>
          <dd>{draft.courseIdentity.courseTitle || 'Not detected'}</dd>
        </div>
        <div>
          <dt>Instructor</dt>
          <dd>{draft.courseIdentity.instructorName || 'Not detected'}</dd>
        </div>
        <div className="summary-grid__wide">
          <dt>Catalog Description</dt>
          <dd>{draft.courseInformation.catalogDescription || 'Not detected'}</dd>
        </div>
      </dl>

      <p className="summary-panel__status" role="status" aria-live="polite">
        {canGenerate ? status : 'Resolve all required fields before downloading.'}
      </p>
    </section>
  );
}
