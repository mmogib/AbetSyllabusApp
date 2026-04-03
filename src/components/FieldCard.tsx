import type { RequiredFieldPath } from '../lib/schema/requiredFields';

export interface FieldCardProps {
  path: RequiredFieldPath;
  label: string;
  value: string;
  multiline?: boolean;
  meta?: {
    source?: 'deterministic' | 'llm' | 'user';
    confidence?: 'high' | 'medium' | 'low';
    evidence?: string;
  };
  onChange: (path: RequiredFieldPath, value: string) => void;
  onResolve: (path: RequiredFieldPath) => void;
}

export function FieldCard({
  path,
  label,
  value,
  multiline = false,
  meta,
  onChange,
  onResolve,
}: FieldCardProps) {
  const inputId = `field-${path}`;
  const canResolve = value.trim() !== '';

  return (
    <article className="field-card">
      <div className="field-card__header">
        <label htmlFor={inputId}>{label}</label>
        <span className="field-card__path">{path}</span>
      </div>

      {multiline ? (
        <textarea
          id={inputId}
          value={value}
          onChange={(event) => onChange(path, event.target.value)}
          rows={4}
        />
      ) : (
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(event) => onChange(path, event.target.value)}
        />
      )}

      {meta?.source === 'llm' ? (
        <p className="field-card__hint">
          Suggested by AI{meta.confidence ? ` (${meta.confidence} confidence)` : ''}. Review before resolving.
        </p>
      ) : null}

      {meta?.evidence ? (
        <p className="field-card__evidence">{meta.evidence}</p>
      ) : null}

      <div className="field-card__actions">
        <button
          type="button"
          onClick={() => onResolve(path)}
          disabled={!canResolve}
        >
          Mark resolved
        </button>
      </div>
    </article>
  );
}
