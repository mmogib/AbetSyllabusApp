import { requiredFieldPaths, type RequiredFieldPath } from '../schema/requiredFields';
import { isHighConfidenceDeterministic } from './confidence';
import type { SyllabusDraft } from '../../types/schema';

export interface ReviewState {
  unresolvedFields: RequiredFieldPath[];
  canGenerate: boolean;
}

function readDraftField(draft: SyllabusDraft, path: RequiredFieldPath): string {
  const value = path.split('.').reduce<unknown>((current, key) => {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, draft);

  return typeof value === 'string' ? value : '';
}

function isRequiredFieldResolved(draft: SyllabusDraft, path: RequiredFieldPath): boolean {
  const value = readDraftField(draft, path);
  const meta = draft.reviewMetadata[path];

  if (value.trim() === '') {
    return false;
  }

  if (path === 'courseIdentity.instructorName') {
    return true;
  }

  return meta?.status === 'resolved' || isHighConfidenceDeterministic(meta);
}

export function buildReviewState(draft: SyllabusDraft): ReviewState {
  const unresolvedFields = requiredFieldPaths.filter((path) => !isRequiredFieldResolved(draft, path));

  return {
    unresolvedFields,
    canGenerate: unresolvedFields.length === 0,
  };
}
