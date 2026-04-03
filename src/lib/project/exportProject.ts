import type {
  FieldConfidence,
  FieldMeta,
  FieldPath,
  FieldSource,
  FieldStatus,
  SyllabusDraft,
} from '../../types/schema';

export interface ProjectExportInput {
  draft: SyllabusDraft;
  extractedText?: string;
}

export interface ProjectDocumentV1 {
  version: 1;
  savedAt: string;
  draft: SyllabusDraft;
  extractedText?: string;
}

const FIELD_STATUSES: readonly FieldStatus[] = ['resolved', 'missing', 'needs_review'];
const FIELD_SOURCES: readonly FieldSource[] = ['deterministic', 'llm', 'user'];
const FIELD_CONFIDENCE: readonly FieldConfidence[] = ['high', 'medium', 'low'];
const FIELD_PATHS: readonly FieldPath[] = [
  'courseIdentity.department',
  'courseIdentity.courseNumber',
  'courseIdentity.courseTitle',
  'courseIdentity.instructorName',
  'courseIdentity.creditsText',
  'materials.textbook',
  'materials.supplementalMaterials',
  'courseInformation.catalogDescription',
  'courseInformation.prerequisites',
  'courseInformation.designation',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isAllowedFieldPath(path: string): path is FieldPath {
  return FIELD_PATHS.includes(path as FieldPath);
}

function sanitizeFieldMeta(value: unknown): FieldMeta | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const status = stringValue(value.status);
  if (!FIELD_STATUSES.includes(status as FieldStatus)) {
    return undefined;
  }

  const meta: FieldMeta = { status: status as FieldStatus };

  const source = stringValue(value.source);
  if (FIELD_SOURCES.includes(source as FieldSource)) {
    meta.source = source as FieldSource;
  }

  const confidence = stringValue(value.confidence);
  if (FIELD_CONFIDENCE.includes(confidence as FieldConfidence)) {
    meta.confidence = confidence as FieldConfidence;
  }

  const evidence = stringValue(value.evidence);
  if (evidence.trim() !== '') {
    meta.evidence = evidence;
  }

  return meta;
}

function sanitizeDraft(draft: SyllabusDraft): SyllabusDraft {
  const reviewMetadata: SyllabusDraft['reviewMetadata'] = {};

  if (isRecord(draft.reviewMetadata)) {
    for (const [path, value] of Object.entries(draft.reviewMetadata)) {
      if (!isAllowedFieldPath(path)) {
        continue;
      }

      const sanitized = sanitizeFieldMeta(value);
      if (sanitized) {
        reviewMetadata[path] = sanitized;
      }
    }
  }

  return {
    courseIdentity: {
      department: stringValue(draft.courseIdentity.department),
      courseNumber: stringValue(draft.courseIdentity.courseNumber),
      courseTitle: stringValue(draft.courseIdentity.courseTitle),
      instructorName: stringValue(draft.courseIdentity.instructorName),
      creditsText: stringValue(draft.courseIdentity.creditsText),
    },
    materials: {
      textbook: stringValue(draft.materials.textbook),
      supplementalMaterials: stringValue(draft.materials.supplementalMaterials),
    },
    courseInformation: {
      catalogDescription: stringValue(draft.courseInformation.catalogDescription),
      prerequisites: stringValue(draft.courseInformation.prerequisites),
      designation: stringValue(draft.courseInformation.designation),
    },
    learningOutcomes: Array.isArray(draft.learningOutcomes)
      ? draft.learningOutcomes
          .filter((item) => isRecord(item))
          .map((item) => ({
            clo: stringValue(item.clo),
            outcomeCode: stringValue(item.outcomeCode),
          }))
      : [],
    topics: Array.isArray(draft.topics)
      ? draft.topics
          .filter((item) => isRecord(item))
          .map((item) => ({
            title: stringValue(item.title),
            durationText: stringValue(item.durationText),
          }))
      : [],
    reviewMetadata,
    generationMetadata: {
      templateVersion: stringValue(draft.generationMetadata.templateVersion),
      termCode: stringValue(draft.generationMetadata.termCode),
      ...(typeof draft.generationMetadata.generatedAt === 'string' &&
      draft.generationMetadata.generatedAt.trim() !== ''
        ? { generatedAt: draft.generationMetadata.generatedAt }
        : {}),
    },
  };
}

export function exportProjectJson(project: ProjectExportInput): string {
  const document: ProjectDocumentV1 = {
    version: 1,
    savedAt: new Date().toISOString(),
    draft: sanitizeDraft(project.draft),
    ...(typeof project.extractedText === 'string' && project.extractedText.trim() !== ''
      ? { extractedText: project.extractedText }
      : {}),
  };

  return JSON.stringify(document, null, 2);
}
