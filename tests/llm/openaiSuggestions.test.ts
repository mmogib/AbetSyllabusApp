import {
  OPENAI_PROVIDER,
  OPENROUTER_PROVIDER,
  buildSuggestionPrompt,
  readSessionProvider,
  readSessionApiKey,
  requestFieldSuggestions,
  writeSessionProvider,
  writeSessionApiKey,
} from '../../src/lib/llm/openaiSuggestions';

test('builds a prompt scoped to unresolved fields', () => {
  const prompt = buildSuggestionPrompt({
    extractedText: 'Course Title: Probability for Data Science',
    unresolvedFields: ['courseIdentity.instructorName'],
  });

  expect(prompt).toContain('courseIdentity.instructorName');
  expect(prompt).toContain('Course Title: Probability for Data Science');
  expect(prompt).toContain('Return JSON that matches this contract');
  expect(prompt).toContain('one suggestion per unresolved field');
});

test('builds a prompt even when no unresolved fields are present', () => {
  const prompt = buildSuggestionPrompt({
    extractedText: 'Course Title: Probability for Data Science',
    unresolvedFields: [],
  });

  expect(prompt).toContain('Unresolved fields: None');
});

test('session api key helpers round-trip through sessionStorage', () => {
  writeSessionApiKey('  sk-test-key  ');

  expect(readSessionApiKey()).toBe('sk-test-key');

  writeSessionApiKey('');

  expect(readSessionApiKey()).toBe('');
});

test('session api key helpers fail closed when storage is denied', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage');

  try {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('Denied', 'SecurityError');
      },
    });

    expect(readSessionApiKey()).toBe('');
    expect(() => writeSessionApiKey('sk-test-key')).not.toThrow();
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(window, 'sessionStorage', originalDescriptor);
    }
  }
});

test('session provider helpers round-trip through sessionStorage', () => {
  writeSessionProvider(OPENROUTER_PROVIDER);

  expect(readSessionProvider()).toBe(OPENROUTER_PROVIDER);

  writeSessionProvider(OPENAI_PROVIDER);

  expect(readSessionProvider()).toBe(OPENAI_PROVIDER);
});

test('requests structured field suggestions from the responses api', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                suggestions: [
                  {
                    fieldPath: 'courseIdentity.instructorName',
                    suggestion: 'Dr. Mohammed Alshahrani',
                    evidence: ['Course Instructor/Coordinator: Dr. Mohammed Alshahrani'],
                  },
                ],
              }),
            },
          ],
        },
      ],
    }),
  });

  const response = await requestFieldSuggestions(
    {
      apiKey: 'sk-test',
      extractedText:
        'Course Instructor/Coordinator: Dr. Mohammed Alshahrani',
      unresolvedFields: ['courseIdentity.instructorName'],
      fetchImpl: fetchMock,
    },
  );

  expect(fetchMock).toHaveBeenCalledOnce();
  expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.openai.com/v1/responses');
  expect(response.suggestions).toEqual([
    {
      fieldPath: 'courseIdentity.instructorName',
      suggestion: 'Dr. Mohammed Alshahrani',
      evidence: ['Course Instructor/Coordinator: Dr. Mohammed Alshahrani'],
    },
  ]);
});

test('requests structured field suggestions from openrouter chat completions', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  fieldPath: 'courseIdentity.instructorName',
                  suggestion: 'Dr. Ada Lovelace',
                  evidence: ['Course Instructor/Coordinator: Dr. Ada Lovelace'],
                },
              ],
            }),
          },
        },
      ],
    }),
  });

  const response = await requestFieldSuggestions({
    provider: OPENROUTER_PROVIDER,
    apiKey: 'or-test',
    extractedText: 'Course Instructor/Coordinator: Dr. Ada Lovelace',
    unresolvedFields: ['courseIdentity.instructorName'],
    fetchImpl: fetchMock,
  });

  expect(fetchMock).toHaveBeenCalledOnce();
  expect(fetchMock.mock.calls[0]?.[0]).toBe('https://openrouter.ai/api/v1/chat/completions');
  expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
    headers: expect.objectContaining({
      Authorization: 'Bearer or-test',
    }),
  });
  expect(fetchMock.mock.calls[0]?.[1]?.body).toContain('"model":"openrouter/free"');
  expect(response.suggestions).toEqual([
    {
      fieldPath: 'courseIdentity.instructorName',
      suggestion: 'Dr. Ada Lovelace',
      evidence: ['Course Instructor/Coordinator: Dr. Ada Lovelace'],
    },
  ]);
});
