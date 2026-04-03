import { getCurrentTermCode } from '../../src/lib/term/academicTerms';
import { createEmptyDraft } from '../../src/lib/schema/defaultDraft';
import { requiredFieldPaths } from '../../src/lib/schema/requiredFields';
import type { FieldPath, SyllabusDraft } from '../../src/types/schema';

const expectedRequiredFieldPaths = [
  'courseIdentity.department',
  'courseIdentity.courseNumber',
  'courseIdentity.courseTitle',
  'courseIdentity.instructorName',
  'courseInformation.catalogDescription',
  'courseInformation.prerequisites',
  'materials.textbook',
] as const satisfies readonly FieldPath[];

const expectedMissingReviewMetadata = {
  'courseIdentity.department': { status: 'missing' },
  'courseIdentity.courseNumber': { status: 'missing' },
  'courseIdentity.courseTitle': { status: 'missing' },
  'courseIdentity.instructorName': { status: 'missing' },
  'courseInformation.catalogDescription': { status: 'missing' },
  'courseInformation.prerequisites': { status: 'missing' },
  'materials.textbook': { status: 'missing' },
} as const;

test('defines the exact required field set', () => {
  const typedPaths: readonly FieldPath[] = requiredFieldPaths;

  expect(typedPaths).toEqual(expectedRequiredFieldPaths);
  expect(new Set(typedPaths).size).toBe(typedPaths.length);
});

test('createEmptyDraft initializes arrays and required review metadata', () => {
  const draft: SyllabusDraft = createEmptyDraft();

  expect(draft.courseIdentity).toEqual({
    department: '',
    courseNumber: '',
    courseTitle: '',
    instructorName: '',
    creditsText: '',
  });
  expect(draft.materials).toEqual({
    textbook: '',
    supplementalMaterials: '',
  });
  expect(draft.courseInformation).toEqual({
    catalogDescription: '',
    prerequisites: '',
    designation: '',
  });
  expect(draft.learningOutcomes).toEqual([]);
  expect(draft.topics).toEqual([]);
  expect(draft.reviewMetadata).toEqual(expectedMissingReviewMetadata);
  expect(draft.generationMetadata).toEqual({
    templateVersion: 'beta-1',
    termCode: getCurrentTermCode(),
  });
});
