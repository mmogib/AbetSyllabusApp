import type { AppState } from './appState';
import type { ProjectDocumentV1 } from '../lib/project/exportProject';
import { requiredFieldPaths, type RequiredFieldPath } from '../lib/schema/requiredFields';
import type { FieldPath } from '../types/schema';
import type { FieldSuggestionResponse } from '../lib/llm/openaiSuggestions';

function updateNestedValue(
  current: unknown,
  pathSegments: string[],
  value: string,
): unknown {
  const [head, ...rest] = pathSegments;

  if (!head) {
    return value;
  }

  const currentObject =
    current !== null && typeof current === 'object'
      ? (current as Record<string, unknown>)
      : {};

  if (rest.length === 0) {
    return {
      ...currentObject,
      [head]: value,
    };
  }

  return {
    ...currentObject,
    [head]: updateNestedValue(currentObject[head], rest, value),
  };
}

function readDraftValue(state: AppState['draft'], path: RequiredFieldPath): string {
  const value = path.split('.').reduce<unknown>((current, key) => {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, state);

  return typeof value === 'string' ? value : '';
}

export function updateDraftField(
  state: AppState,
  path: FieldPath,
  value: string,
): AppState {
  const draft = updateNestedValue(state.draft, path.split('.'), value) as AppState['draft'];
  const trimmedValue = value.trim();
  const metadata =
    trimmedValue === ''
      ? { status: 'missing' as const }
      : { status: 'needs_review' as const, source: 'user' as const };

  return {
    ...state,
    draft: {
      ...draft,
      reviewMetadata: {
        ...draft.reviewMetadata,
        [path]: metadata,
      },
    },
  };
}

export function resolveDraftField(state: AppState, path: FieldPath): AppState {
  return {
    ...state,
    draft: {
      ...state.draft,
      reviewMetadata: {
        ...state.draft.reviewMetadata,
        [path]: { status: 'resolved', source: 'user' },
      },
    },
  };
}

export interface UploadedDraftPayload {
  draft: AppState['draft'];
  extractedText: string;
  sourceFileName: string;
}

export function applyUploadedDraft(
  state: AppState,
  payload: UploadedDraftPayload,
): AppState {
  const reviewMetadata = requiredFieldPaths.reduce<AppState['draft']['reviewMetadata']>(
    (metadata, path) => {
      metadata[path] =
        readDraftValue(payload.draft, path).trim() === ''
          ? { status: 'missing' }
          : {
              status: 'resolved',
              source: 'deterministic',
              confidence: 'high',
            };
      return metadata;
    },
    {},
  );

  return {
    ...state,
    draft: {
      ...payload.draft,
      reviewMetadata,
    },
    extractedText: payload.extractedText,
    sourceFileName: payload.sourceFileName,
  };
}

export function importProjectIntoState(
  state: AppState,
  project: ProjectDocumentV1,
): AppState {
  return {
    ...state,
    draft: project.draft,
    extractedText: project.extractedText ?? '',
    sourceFileName: null,
  };
}

export function updateGenerationTermCode(
  state: AppState,
  termCode: string,
): AppState {
  return {
    ...state,
    draft: {
      ...state.draft,
      generationMetadata: {
        ...state.draft.generationMetadata,
        termCode,
      },
    },
  };
}

export function applyFieldSuggestions(
  state: AppState,
  suggestions: readonly FieldSuggestionResponse[],
): AppState {
  let draft = state.draft;
  const reviewMetadata = {
    ...state.draft.reviewMetadata,
  };

  for (const suggestion of suggestions) {
    if (
      suggestion.suggestion === 'insufficient evidence' ||
      suggestion.suggestion.trim() === ''
    ) {
      continue;
    }

    const fieldPath = suggestion.fieldPath as FieldPath;
    draft = updateNestedValue(
      draft,
      fieldPath.split('.'),
      suggestion.suggestion.trim(),
    ) as AppState['draft'];
    reviewMetadata[fieldPath] = {
      status: 'needs_review',
      source: 'llm',
      confidence: 'medium',
      evidence: suggestion.evidence.join('\n'),
    };
  }

  return {
    ...state,
    draft: {
      ...draft,
      reviewMetadata,
    },
  };
}
