import { useState, type ChangeEvent } from 'react';
import type { SyllabusDraft } from '../types/schema';
import { exportProjectJson } from '../lib/project/exportProject';
import { importProjectJson } from '../lib/project/importProject';
import { downloadBlob } from '../utils/download';

export interface ProjectPanelProps {
  draft: SyllabusDraft;
  extractedText?: string;
  onImport?: (projectJson: ReturnType<typeof importProjectJson>) => void;
}

export function ProjectPanel({ draft, extractedText, onImport }: ProjectPanelProps) {
  const [jsonText, setJsonText] = useState('');
  const [status, setStatus] = useState('Ready to export or import a local project file.');

  async function handleExport() {
    const json = exportProjectJson({ draft, extractedText });
    downloadBlob({
      blob: new Blob([json], { type: 'application/json' }),
      fileName: 'abet-syllabus-project.json',
    });
    setStatus('Project export ready.');
  }

  function handleImportText() {
    try {
      const parsed = importProjectJson(jsonText);
      onImport?.(parsed);
      setStatus('Project imported successfully.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Project import failed.');
    }
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      setJsonText(text);
      const parsed = importProjectJson(text);
      onImport?.(parsed);
      setStatus(`Project imported from ${file.name}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Project import failed.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <section className="project-panel" aria-labelledby="project-panel-title">
      <div className="section-heading">
        <div>
          <h2 id="project-panel-title">Project</h2>
          <p>Export or import a working draft as a local JSON file.</p>
        </div>
      </div>

      <div className="project-panel__actions">
        <button type="button" onClick={handleExport}>
          Export JSON
        </button>
      </div>

      <label className="project-panel__field" htmlFor="project-panel-file">
        <span>Import JSON file</span>
        <input
          id="project-panel-file"
          type="file"
          accept=".json,application/json"
          onChange={handleImportFile}
        />
      </label>

      <label className="project-panel__field" htmlFor="project-panel-json">
        <span>Import JSON</span>
        <textarea
          id="project-panel-json"
          value={jsonText}
          onChange={(event) => setJsonText(event.target.value)}
          rows={8}
          spellCheck={false}
          placeholder='{"version":1,"savedAt":"2026-04-02T00:00:00.000Z","draft":{...}}'
        />
      </label>

      <div className="project-panel__actions">
        <button type="button" onClick={handleImportText} disabled={jsonText.trim() === ''}>
          Import JSON
        </button>
      </div>

      <p className="project-panel__status" role="status" aria-live="polite">
        {status}
      </p>
    </section>
  );
}
