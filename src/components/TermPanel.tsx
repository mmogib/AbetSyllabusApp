import type { TermOption } from '../lib/term/academicTerms';

export interface TermPanelProps {
  termCode: string;
  termOptions: TermOption[];
  onTermChange: (termCode: string) => void;
}

export function TermPanel({ termCode, termOptions, onTermChange }: TermPanelProps) {
  return (
    <section className="term-panel" aria-labelledby="term-panel-title">
      <div className="section-heading">
        <div>
          <h2 id="term-panel-title">Term</h2>
          <p>Each syllabus must be generated for a specific academic term.</p>
        </div>
      </div>

      <label className="term-panel__field" htmlFor="term-panel-select">
        <span>Academic term</span>
        <select
          id="term-panel-select"
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
    </section>
  );
}
