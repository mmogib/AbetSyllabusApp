import type { ReviewState } from '../lib/review/buildReviewState';

export interface StatusPanelProps {
  reviewState: ReviewState;
}

export function StatusPanel({ reviewState }: StatusPanelProps) {
  const unresolvedCount = reviewState.unresolvedFields.length;

  return (
    <aside className="status-panel" aria-label="Review status">
      <span className="status-panel__label">Review status</span>
      <strong className="status-panel__value">
        {reviewState.canGenerate ? 'Ready to generate' : `${unresolvedCount} field${unresolvedCount === 1 ? '' : 's'} open`}
      </strong>
      <span className="status-panel__detail">
        {reviewState.canGenerate
          ? 'All required fields have enough information to continue.'
          : 'Resolve the open fields below to unlock generation.'}
      </span>
    </aside>
  );
}
