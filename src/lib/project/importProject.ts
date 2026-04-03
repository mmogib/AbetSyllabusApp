import { createEmptyDraft } from '../schema/defaultDraft';
import type {
  FieldConfidence,
  FieldMeta,
  FieldPath,
  FieldSource,
  FieldStatus,
  SyllabusDraft,
} from '../../types/schema';
import type { ProjectDocumentV1 } from './exportProject';

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
const ISO_TIMESTAMP_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid project JSON: ${label} must be a string.`);
  }

  return value;
}

function isAllowedFieldPath(path: string): path is FieldPath {
  return FIELD_PATHS.includes(path as FieldPath);
}

function parseFieldMeta(value: unknown): FieldMeta | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const status = asString(value.status, 'reviewMetadata.status');
  if (!FIELD_STATUSES.includes(status as FieldStatus)) {
    throw new Error('Invalid project JSON: reviewMetadata.status is invalid.');
  }

  const meta: FieldMeta = { status: status as FieldStatus };

  if (typeof value.source === 'string') {
    if (!FIELD_SOURCES.includes(value.source as FieldSource)) {
      throw new Error('Invalid project JSON: reviewMetadata.source is invalid.');
    }

    meta.source = value.source as FieldSource;
  }

  if (typeof value.confidence === 'string') {
    if (!FIELD_CONFIDENCE.includes(value.confidence as FieldConfidence)) {
      throw new Error('Invalid project JSON: reviewMetadata.confidence is invalid.');
    }

    meta.confidence = value.confidence as FieldConfidence;
  }

  if (typeof value.evidence === 'string' && value.evidence.trim() !== '') {
    meta.evidence = value.evidence;
  }

  return meta;
}

function isIsoTimestamp(value: string): boolean {
  return ISO_TIMESTAMP_RE.test(value) && !Number.isNaN(Date.parse(value));
}

function parseDraft(value: unknown): SyllabusDraft {
  if (!isRecord(value)) {
    throw new Error('Invalid project JSON: draft must be an object.');
  }

  const draft = createEmptyDraft();

  if (!isRecord(value.courseIdentity)) {
    throw new Error('Invalid project JSON: courseIdentity must be an object.');
  }
  if (!isRecord(value.materials)) {
    throw new Error('Invalid project JSON: materials must be an object.');
  }
  if (!isRecord(value.courseInformation)) {
    throw new Error('Invalid project JSON: courseInformation must be an object.');
  }
  if (!Array.isArray(value.learningOutcomes)) {
    throw new Error('Invalid project JSON: learningOutcomes must be an array.');
  }
  if (!Array.isArray(value.topics)) {
    throw new Error('Invalid project JSON: topics must be an array.');
  }
  if (value.reviewMetadata !== undefined && !isRecord(value.reviewMetadata)) {
    throw new Error('Invalid project JSON: reviewMetadata must be an object.');
  }
  if (value.generationMetadata !== undefined && !isRecord(value.generationMetadata)) {
    throw new Error('Invalid project JSON: generationMetadata must be an object.');
  }

  draft.courseIdentity.department = asString(value.courseIdentity.department, 'courseIdentity.department');
  draft.courseIdentity.courseNumber = asString(value.courseIdentity.courseNumber, 'courseIdentity.courseNumber');
  draft.courseIdentity.courseTitle = asString(value.courseIdentity.courseTitle, 'courseIdentity.courseTitle');
  draft.courseIdentity.instructorName = asString(value.courseIdentity.instructorName, 'courseIdentity.instructorName');
  draft.courseIdentity.creditsText = asString(value.courseIdentity.creditsText, 'courseIdentity.creditsText');

  draft.materials.textbook = asString(value.materials.textbook, 'materials.textbook');
  draft.materials.supplementalMaterials = asString(
    value.materials.supplementalMaterials,
    'materials.supplementalMaterials',
  );

  draft.courseInformation.catalogDescription = asString(
    value.courseInformation.catalogDescription,
    'courseInformation.catalogDescription',
  );
  draft.courseInformation.prerequisites = asString(
    value.courseInformation.prerequisites,
    'courseInformation.prerequisites',
  );
  draft.courseInformation.corequisites = asString(
    value.courseInformation.corequisites ?? '',
    'courseInformation.corequisites',
  );
  draft.courseInformation.designation = asString(value.courseInformation.designation, 'courseInformation.designation');

  draft.learningOutcomes = value.learningOutcomes.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Invalid project JSON: learningOutcomes[${index}] must be an object.`);
    }

    return {
      clo: asString(item.clo, `learningOutcomes[${index}].clo`),
      outcomeCode: asString(item.outcomeCode, `learningOutcomes[${index}].outcomeCode`),
    };
  });

  draft.topics = value.topics.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Invalid project JSON: topics[${index}] must be an object.`);
    }

    return {
      title: asString(item.title, `topics[${index}].title`),
      durationText: asString(item.durationText, `topics[${index}].durationText`),
    };
  });

  draft.reviewMetadata = {};
  if (isRecord(value.reviewMetadata)) {
    for (const [path, meta] of Object.entries(value.reviewMetadata)) {
      if (!isAllowedFieldPath(path)) {
        throw new Error(`Invalid project JSON: reviewMetadata key "${path}" is not allowed.`);
      }

      const parsed = parseFieldMeta(meta);
      if (parsed) {
        draft.reviewMetadata[path] = parsed;
      }
    }
  }

  if (isRecord(value.generationMetadata)) {
    draft.generationMetadata.templateVersion = asString(
      value.generationMetadata.templateVersion,
      'generationMetadata.templateVersion',
    );
    draft.generationMetadata.termCode = asString(
      value.generationMetadata.termCode,
      'generationMetadata.termCode',
    );

    if (typeof value.generationMetadata.generatedAt === 'string') {
      draft.generationMetadata.generatedAt = value.generationMetadata.generatedAt;
    }
  }

  return draft;
}

export function importProjectJson(json: string): ProjectDocumentV1 {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid project JSON: malformed JSON.');
  }

  if (!isRecord(parsed)) {
    throw new Error('Invalid project JSON: top-level value must be an object.');
  }

  if (parsed.version !== 1) {
    throw new Error('Invalid project JSON: unsupported version.');
  }

  const savedAt = asString(parsed.savedAt, 'savedAt');
  if (!isIsoTimestamp(savedAt)) {
    throw new Error('Invalid project JSON: savedAt must be a valid ISO timestamp.');
  }

  const draft = parseDraft(parsed.draft);

  const result: ProjectDocumentV1 = {
    version: 1,
    savedAt,
    draft,
  };

  if (typeof parsed.extractedText === 'string' && parsed.extractedText.trim() !== '') {
    result.extractedText = parsed.extractedText;
  } else if (parsed.extractedText !== undefined && typeof parsed.extractedText !== 'string') {
    throw new Error('Invalid project JSON: extractedText must be a string.');
  }

  return result;
}
