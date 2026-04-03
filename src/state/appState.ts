import { buildReviewState, type ReviewState } from '../lib/review/buildReviewState';
import type { RequiredFieldPath } from '../lib/schema/requiredFields';
import { createEmptyDraft } from '../lib/schema/defaultDraft';
import type { FieldMeta, SyllabusDraft } from '../types/schema';

export interface ReviewFieldView {
  path: RequiredFieldPath;
  label: string;
  value: string;
  multiline?: boolean;
  meta?: FieldMeta;
}

export interface ReviewSlice {
  reviewState: ReviewState;
  fields: ReviewFieldView[];
}

export interface AppState {
  draft: SyllabusDraft;
  extractedText: string;
  sourceFileName: string | null;
}

const reviewFieldLabels: Record<
  RequiredFieldPath,
  { label: string; multiline?: boolean }
> = {
  'courseIdentity.department': { label: 'Department' },
  'courseIdentity.courseNumber': { label: 'Course Number' },
  'courseIdentity.courseTitle': { label: 'Course Title' },
  'courseIdentity.instructorName': { label: 'Instructor Name' },
  'courseInformation.catalogDescription': {
    label: 'Catalog Description',
    multiline: true,
  },
  'courseInformation.prerequisites': { label: 'Prerequisites' },
  'materials.textbook': { label: 'Textbook' },
};

function readDraftValue(draft: SyllabusDraft, path: RequiredFieldPath): string {
  const value = path.split('.').reduce<unknown>((current, key) => {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, draft);

  return typeof value === 'string' ? value : '';
}

function readDraftMeta(draft: SyllabusDraft, path: RequiredFieldPath): FieldMeta | undefined {
  return draft.reviewMetadata[path];
}

export function createAppState(seedDraft: SyllabusDraft = createEmptyDraft()): AppState {
  return {
    draft: seedDraft,
    extractedText: '',
    sourceFileName: null,
  };
}

export function getReviewState(state: AppState): ReviewState {
  return buildReviewState(state.draft);
}

export function getReviewFields(draft: SyllabusDraft): ReviewFieldView[] {
  return getReviewSlice(draft).fields;
}

export function getReviewSlice(draft: SyllabusDraft): ReviewSlice {
  const reviewState = buildReviewState(draft);

  return {
    reviewState,
    fields: reviewState.unresolvedFields
      .filter((path) => path !== 'courseIdentity.instructorName')
      .map((path) => ({
        path,
        label: reviewFieldLabels[path].label,
        value: readDraftValue(draft, path),
        multiline: reviewFieldLabels[path].multiline,
        meta: readDraftMeta(draft, path),
      })),
  };
}
