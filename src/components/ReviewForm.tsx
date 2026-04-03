import { FieldCard } from './FieldCard';
import type { RequiredFieldPath } from '../lib/schema/requiredFields';

export interface ReviewField {
  path: RequiredFieldPath;
  label: string;
  value: string;
  multiline?: boolean;
  meta?: {
    source?: 'deterministic' | 'llm' | 'user';
    confidence?: 'high' | 'medium' | 'low';
    evidence?: string;
  };
}

export interface ReviewFormProps {
  fields: ReviewField[];
  onChange: (path: RequiredFieldPath, value: string) => void;
  onResolve: (path: RequiredFieldPath) => void;
}

export function ReviewForm({ fields, onChange, onResolve }: ReviewFormProps) {
  if (fields.length === 0) {
    return (
      <p className="empty-state">
        All required fields are resolved. Generate the DOCX or export the project
        JSON when ready.
      </p>
    );
  }

  return (
    <div className="review-form">
      {fields.map((field) => (
        <FieldCard
          key={field.path}
          path={field.path}
          label={field.label}
          value={field.value}
          multiline={field.multiline}
          meta={field.meta}
          onChange={onChange}
          onResolve={onResolve}
        />
      ))}
    </div>
  );
}
