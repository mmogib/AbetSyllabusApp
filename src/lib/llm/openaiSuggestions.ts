export const OPENAI_PROVIDER = 'openai';
export const OPENROUTER_PROVIDER = 'openrouter';
export type AiProvider = typeof OPENAI_PROVIDER | typeof OPENROUTER_PROVIDER;

export const AI_PROVIDER_SESSION_STORAGE_KEY = 'abet-syllabus.aiProvider';
export const OPENAI_API_KEY_SESSION_STORAGE_KEY = 'abet-syllabus.openaiApiKey';
export const OPENROUTER_API_KEY_SESSION_STORAGE_KEY = 'abet-syllabus.openrouterApiKey';

export const OPENAI_RESPONSES_API_URL = 'https://api.openai.com/v1/responses';
export const OPENAI_SUGGESTION_MODEL = 'gpt-4.1-mini';
export const OPENROUTER_CHAT_COMPLETIONS_API_URL =
  'https://openrouter.ai/api/v1/chat/completions';
export const OPENROUTER_SUGGESTION_MODEL = 'openrouter/free';

export interface SuggestionPromptInput {
  extractedText: string;
  unresolvedFields: string[];
}

export interface FieldSuggestionResponse {
  fieldPath: string;
  suggestion: string | 'insufficient evidence';
  evidence: string[];
}

export interface SuggestionResponseContract {
  suggestions: FieldSuggestionResponse[];
}

export interface RequestFieldSuggestionsInput extends SuggestionPromptInput {
  apiKey: string;
  provider?: AiProvider;
  fetchImpl?: typeof fetch;
}

function formatUnresolvedFields(unresolvedFields: string[]): string {
  if (unresolvedFields.length === 0) {
    return 'None';
  }

  return unresolvedFields.join(', ');
}

function buildSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      suggestions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            fieldPath: { type: 'string' },
            suggestion: { type: 'string' },
            evidence: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['fieldPath', 'suggestion', 'evidence'],
        },
      },
    },
    required: ['suggestions'],
  };
}

function getApiKeyStorageKey(provider: AiProvider): string {
  return provider === OPENROUTER_PROVIDER
    ? OPENROUTER_API_KEY_SESSION_STORAGE_KEY
    : OPENAI_API_KEY_SESSION_STORAGE_KEY;
}

function isAiProvider(value: string): value is AiProvider {
  return value === OPENAI_PROVIDER || value === OPENROUTER_PROVIDER;
}

export function buildSuggestionPrompt(input: SuggestionPromptInput): string {
  return [
    'You are helping fill unresolved syllabus fields.',
    'Return JSON that matches this contract:',
    '  { "suggestions": [{ "fieldPath": string, "suggestion": string | "insufficient evidence", "evidence": string[] }] }',
    'Rules:',
    '  - Return exactly one suggestion per unresolved field.',
    '  - Use "insufficient evidence" when the extracted text does not support a suggestion.',
    '  - Use only evidence from the extracted text.',
    `Unresolved fields: ${formatUnresolvedFields(input.unresolvedFields)}`,
    input.extractedText.trim(),
  ].join('\n\n');
}

function extractOpenAiResponseText(payload: unknown): string {
  if (
    payload !== null &&
    typeof payload === 'object' &&
    'output_text' in payload &&
    typeof payload.output_text === 'string'
  ) {
    return payload.output_text;
  }

  if (
    payload === null ||
    typeof payload !== 'object' ||
    !('output' in payload) ||
    !Array.isArray(payload.output)
  ) {
    return '';
  }

  const contentTexts = payload.output.flatMap((item) => {
    if (
      item === null ||
      typeof item !== 'object' ||
      !('content' in item) ||
      !Array.isArray(item.content)
    ) {
      return [];
    }

    return item.content.flatMap((contentItem: unknown) => {
      if (
        contentItem !== null &&
        typeof contentItem === 'object' &&
        'type' in contentItem &&
        contentItem.type === 'output_text' &&
        'text' in contentItem &&
        typeof contentItem.text === 'string'
      ) {
        return [contentItem.text];
      }

      return [];
    });
  });

  return contentTexts.join('\n').trim();
}

function extractOpenRouterResponseText(payload: unknown): string {
  if (
    payload === null ||
    typeof payload !== 'object' ||
    !('choices' in payload) ||
    !Array.isArray(payload.choices)
  ) {
    return '';
  }

  const choice = payload.choices[0];
  if (
    choice === null ||
    typeof choice !== 'object' ||
    !('message' in choice) ||
    choice.message === null ||
    typeof choice.message !== 'object' ||
    !('content' in choice.message)
  ) {
    return '';
  }

  if (typeof choice.message.content === 'string') {
    return choice.message.content.trim();
  }

  return '';
}

function sanitizeSuggestionResponse(payload: unknown): SuggestionResponseContract {
  if (
    payload === null ||
    typeof payload !== 'object' ||
    !('suggestions' in payload) ||
    !Array.isArray(payload.suggestions)
  ) {
    throw new Error('AI provider returned an invalid suggestion payload.');
  }

  return {
    suggestions: payload.suggestions.flatMap((suggestion) => {
      if (
        suggestion === null ||
        typeof suggestion !== 'object' ||
        typeof suggestion.fieldPath !== 'string' ||
        typeof suggestion.suggestion !== 'string' ||
        !Array.isArray(suggestion.evidence)
      ) {
        return [];
      }

      return [
        {
          fieldPath: suggestion.fieldPath,
          suggestion:
            suggestion.suggestion.trim() === ''
              ? 'insufficient evidence'
              : suggestion.suggestion.trim(),
          evidence: suggestion.evidence
            .filter(
              (evidenceItem: unknown): evidenceItem is string =>
                typeof evidenceItem === 'string',
            )
            .map((evidenceItem: string) => evidenceItem.trim())
            .filter(Boolean),
        },
      ];
    }),
  };
}

async function requestOpenAiSuggestions(
  input: RequestFieldSuggestionsInput,
  fetchImpl: typeof fetch,
): Promise<SuggestionResponseContract> {
  const response = await fetchImpl(OPENAI_RESPONSES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: OPENAI_SUGGESTION_MODEL,
      input: buildSuggestionPrompt(input),
      text: {
        format: {
          type: 'json_schema',
          name: 'syllabus_field_suggestions',
          schema: buildSchema(),
        },
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      typeof payload?.error?.message === 'string'
        ? payload.error.message
        : 'OpenAI suggestion request failed.',
    );
  }

  const responseText = extractOpenAiResponseText(payload);
  if (responseText === '') {
    throw new Error('OpenAI returned an empty suggestion response.');
  }

  return sanitizeSuggestionResponse(JSON.parse(responseText));
}

function buildOpenRouterHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey.trim()}`,
  };

  if (typeof window !== 'undefined' && window.location?.origin) {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'ABET Syllabus Beta';
  }

  return headers;
}

async function requestOpenRouterSuggestions(
  input: RequestFieldSuggestionsInput,
  fetchImpl: typeof fetch,
): Promise<SuggestionResponseContract> {
  const response = await fetchImpl(OPENROUTER_CHAT_COMPLETIONS_API_URL, {
    method: 'POST',
    headers: buildOpenRouterHeaders(input.apiKey),
    body: JSON.stringify({
      model: OPENROUTER_SUGGESTION_MODEL,
      messages: [
        {
          role: 'user',
          content: buildSuggestionPrompt(input),
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'syllabus_field_suggestions',
          strict: true,
          schema: buildSchema(),
        },
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      typeof payload?.error?.message === 'string'
        ? payload.error.message
        : 'OpenRouter suggestion request failed.',
    );
  }

  const responseText = extractOpenRouterResponseText(payload);
  if (responseText === '') {
    throw new Error('OpenRouter returned an empty suggestion response.');
  }

  return sanitizeSuggestionResponse(JSON.parse(responseText));
}

export async function requestFieldSuggestions(
  input: RequestFieldSuggestionsInput,
): Promise<SuggestionResponseContract> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const provider = input.provider ?? OPENAI_PROVIDER;

  if (provider === OPENROUTER_PROVIDER) {
    return requestOpenRouterSuggestions(input, fetchImpl);
  }

  return requestOpenAiSuggestions(input, fetchImpl);
}

export function readSessionProvider(): AiProvider {
  try {
    if (typeof window === 'undefined') {
      return OPENAI_PROVIDER;
    }

    const storedProvider =
      window.sessionStorage.getItem(AI_PROVIDER_SESSION_STORAGE_KEY) ?? '';
    return isAiProvider(storedProvider) ? storedProvider : OPENAI_PROVIDER;
  } catch {
    return OPENAI_PROVIDER;
  }
}

export function writeSessionProvider(provider: AiProvider): void {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(AI_PROVIDER_SESSION_STORAGE_KEY, provider);
  } catch {
    return;
  }
}

export function readSessionApiKey(provider: AiProvider = readSessionProvider()): string {
  try {
    if (typeof window === 'undefined') {
      return '';
    }

    return window.sessionStorage.getItem(getApiKeyStorageKey(provider)) ?? '';
  } catch {
    return '';
  }
}

export function writeSessionApiKey(
  apiKey: string,
  provider: AiProvider = readSessionProvider(),
): void {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    const trimmed = apiKey.trim();
    const storageKey = getApiKeyStorageKey(provider);

    if (trimmed === '') {
      window.sessionStorage.removeItem(storageKey);
      return;
    }

    window.sessionStorage.setItem(storageKey, trimmed);
  } catch {
    return;
  }
}
