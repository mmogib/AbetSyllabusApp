import { createEmptyDraft } from '../../src/lib/schema/defaultDraft';
import { buildReviewState } from '../../src/lib/review/buildReviewState';

test('marks empty required fields as needing review', () => {
  const draft = createEmptyDraft();

  const result = buildReviewState(draft);

  expect(result.unresolvedFields).toContain('courseIdentity.courseNumber');
  expect(result.unresolvedFields).toContain('courseIdentity.instructorName');
  expect(result.unresolvedFields).toContain('courseInformation.catalogDescription');
  expect(result.canGenerate).toBe(false);
});

test('can generate when all required fields are resolved', () => {
  const draft = createEmptyDraft();

  draft.courseIdentity.department = 'Mathematics';
  draft.courseIdentity.courseNumber = 'MATH 201';
  draft.courseIdentity.courseTitle = 'Probability';
  draft.courseIdentity.instructorName = 'A. Instructor';
  draft.courseInformation.catalogDescription = 'Introductory probability';
  draft.courseInformation.prerequisites = 'MATH 101';
  draft.materials.textbook = 'Probability text';

  draft.reviewMetadata['courseIdentity.department'] = {
    status: 'resolved',
    source: 'deterministic',
    confidence: 'high',
  };
  draft.reviewMetadata['courseIdentity.courseNumber'] = {
    status: 'resolved',
    source: 'deterministic',
    confidence: 'high',
  };
  draft.reviewMetadata['courseIdentity.courseTitle'] = {
    status: 'resolved',
    source: 'deterministic',
    confidence: 'high',
  };
  draft.reviewMetadata['courseIdentity.instructorName'] = {
    status: 'resolved',
    source: 'user',
  };
  draft.reviewMetadata['courseInformation.catalogDescription'] = {
    status: 'resolved',
    source: 'llm',
  };
  draft.reviewMetadata['courseInformation.prerequisites'] = {
    status: 'resolved',
    source: 'user',
  };
  draft.reviewMetadata['materials.textbook'] = {
    status: 'resolved',
    source: 'deterministic',
    confidence: 'high',
  };

  const result = buildReviewState(draft);

  expect(result.unresolvedFields).toEqual([]);
  expect(result.canGenerate).toBe(true);
});

test('non-empty values without metadata stay unresolved', () => {
  const draft = createEmptyDraft();

  draft.courseIdentity.department = 'Mathematics';
  draft.courseIdentity.courseNumber = 'MATH 201';
  draft.reviewMetadata['courseIdentity.department'] = {
    status: 'resolved',
    source: 'deterministic',
    confidence: 'high',
  };

  const result = buildReviewState(draft);

  expect(result.unresolvedFields).toContain('courseIdentity.courseNumber');
  expect(result.canGenerate).toBe(false);
});

test('needs-review metadata keeps non-empty values unresolved without deterministic high confidence', () => {
  const draft = createEmptyDraft();

  draft.courseIdentity.courseNumber = 'MATH 201';
  draft.reviewMetadata['courseIdentity.courseNumber'] = {
    status: 'needs_review',
    source: 'deterministic',
    confidence: 'medium',
  };

  const result = buildReviewState(draft);

  expect(result.unresolvedFields).toContain('courseIdentity.courseNumber');
  expect(result.canGenerate).toBe(false);
});

test('whitespace-only values stay unresolved even when marked resolved', () => {
  const draft = createEmptyDraft();

  draft.courseIdentity.department = '   ';
  draft.reviewMetadata['courseIdentity.department'] = {
    status: 'resolved',
    source: 'user',
  };

  const result = buildReviewState(draft);

  expect(result.unresolvedFields).toContain('courseIdentity.department');
  expect(result.canGenerate).toBe(false);
});

test('deterministic high-confidence values auto-resolve without explicit resolved status', () => {
  const draft = createEmptyDraft();

  draft.courseIdentity.department = 'Mathematics';
  draft.reviewMetadata['courseIdentity.department'] = {
    status: 'needs_review',
    source: 'deterministic',
    confidence: 'high',
  };

  const result = buildReviewState(draft);

  expect(result.unresolvedFields).not.toContain('courseIdentity.department');
  expect(result.canGenerate).toBe(false);
});
