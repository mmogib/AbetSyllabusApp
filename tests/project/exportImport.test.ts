import { createEmptyDraft } from '../../src/lib/schema/defaultDraft';
import { exportProjectJson } from '../../src/lib/project/exportProject';
import { importProjectJson } from '../../src/lib/project/importProject';

test('round-trips a project without api keys', () => {
  const draft = createEmptyDraft();
  draft.courseIdentity.department = 'Mathematics';
  draft.courseIdentity.courseNumber = 'DATA 201';
  draft.courseIdentity.courseTitle = 'Probability for Data Science';
  draft.courseIdentity.instructorName = 'Dr. Mohammed Alshahrani';
  draft.courseIdentity.creditsText = '3-0-3';
  draft.materials.textbook = 'None';
  draft.courseInformation.catalogDescription = 'An introduction to probability.';
  draft.courseInformation.prerequisites = 'STAT 201';
  draft.generationMetadata.termCode = '252';
  draft.reviewMetadata['courseIdentity.courseNumber'] = {
    status: 'resolved',
    source: 'user',
  };
  (draft as any).openaiApiKey = 'sk-secret-should-not-export';
  (draft as any).sessionApiKey = 'sk-session-should-not-export';

  const json = exportProjectJson({
    draft,
    extractedText: 'Course Title: Probability for Data Science',
  });

  const parsed = importProjectJson(json);

  expect(parsed.version).toBe(1);
  expect(parsed.savedAt).toMatch(/T/);
  expect(parsed.draft.courseIdentity.courseNumber).toBe('DATA 201');
  expect(parsed.draft.courseInformation.prerequisites).toBe('STAT 201');
  expect(parsed.draft.generationMetadata.termCode).toBe('252');
  expect(parsed.extractedText).toBe('Course Title: Probability for Data Science');
  expect(json).not.toContain('openaiApiKey');
  expect(json).not.toContain('sessionApiKey');
  expect(json).not.toContain('sk-secret-should-not-export');
  expect(json).not.toContain('OPENAI');
});

test('excludes invalid reviewMetadata keys during export', () => {
  const draft = createEmptyDraft();
  draft.reviewMetadata['courseIdentity.courseNumber'] = {
    status: 'resolved',
    source: 'user',
  };
  (draft.reviewMetadata as Record<string, unknown>)['bogus.path'] = {
    status: 'resolved',
    source: 'user',
  };

  const json = exportProjectJson({ draft });

  expect(json).toContain('courseIdentity.courseNumber');
  expect(json).not.toContain('bogus.path');
});

test('rejects invalid reviewMetadata keys and metadata values on import', () => {
  expect(() =>
    importProjectJson(
      JSON.stringify({
        version: 1,
        savedAt: '2026-04-02T10:11:12Z',
        draft: {
          ...createEmptyDraft(),
          reviewMetadata: {
            ['__proto__']: {
              status: 'resolved',
              source: 'user',
            },
          },
        },
      }),
    ),
  ).toThrow('reviewMetadata key "__proto__" is not allowed');

  expect(() =>
    importProjectJson(
      JSON.stringify({
        version: 1,
        savedAt: '2026-04-02T10:11:12Z',
        draft: {
          ...createEmptyDraft(),
          reviewMetadata: {
            'courseIdentity.courseNumber': {
              status: 'resolved',
              source: 'machine',
            },
          },
        },
      }),
    ),
  ).toThrow('reviewMetadata.source is invalid');

  expect(() =>
    importProjectJson(
      JSON.stringify({
        version: 1,
        savedAt: '2026-04-02T10:11:12Z',
        draft: {
          ...createEmptyDraft(),
          reviewMetadata: {
            'courseIdentity.courseNumber': {
              status: 'resolved',
              confidence: 'certain',
            },
          },
        },
      }),
    ),
  ).toThrow('reviewMetadata.confidence is invalid');

  expect(() =>
    importProjectJson(
      JSON.stringify({
        version: 1,
        savedAt: '2026-04-02T10:11:12Z',
        draft: {
          ...createEmptyDraft(),
          generationMetadata: {
            templateVersion: 'beta-1',
            termCode: 252,
          },
        },
      }),
    ),
  ).toThrow('generationMetadata.termCode must be a string');
});

test('rejects obviously invalid project input', () => {
  expect(() => importProjectJson('{not json')).toThrow('malformed JSON');
  expect(() =>
    importProjectJson(
      JSON.stringify({
        version: 1,
        savedAt: 'not-a-date',
        draft: {},
      }),
    ),
  ).toThrow('savedAt must be a valid ISO timestamp');

  expect(() =>
    importProjectJson(
      JSON.stringify({
        version: 1,
        savedAt: '2026-04-02T10:11:12Z',
        draft: {
          ...createEmptyDraft(),
        },
        extractedText: 123,
      }),
    ),
  ).toThrow('extractedText must be a string');
});
