import type { FieldMeta, FieldPath, SyllabusDraft } from '../../types/schema';
import { requiredFieldPaths } from './requiredFields';
import { getCurrentTermCode } from '../term/academicTerms';

function createMissingFieldMeta(): FieldMeta {
  return {
    status: 'missing',
  };
}

function buildReviewMetadata(): Partial<Record<FieldPath, FieldMeta>> {
  return requiredFieldPaths.reduce<Partial<Record<FieldPath, FieldMeta>>>(
    (metadata, path) => {
      metadata[path] = createMissingFieldMeta();
      return metadata;
    },
    {},
  );
}

export function createEmptyDraft(): SyllabusDraft {
  return {
    courseIdentity: {
      department: '',
      courseNumber: '',
      courseTitle: '',
      instructorName: '',
      creditsText: '',
    },
    materials: {
      textbook: '',
      supplementalMaterials: '',
    },
    courseInformation: {
      catalogDescription: '',
      prerequisites: '',
      corequisites: '',
      designation: '',
    },
    learningOutcomes: [],
    topics: [],
    reviewMetadata: buildReviewMetadata(),
    generationMetadata: {
      templateVersion: 'beta-1',
      termCode: getCurrentTermCode(),
    },
  };
}
