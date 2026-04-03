import { createAppState } from '../../src/state/appState';
import { resolveDraftField, updateDraftField } from '../../src/state/actions';

test('non-empty edits keep user-entered fields in needs_review state', () => {
  const nextState = updateDraftField(
    createAppState(),
    'courseIdentity.instructorName',
    'Dr. A. Instructor',
  );

  expect(nextState.draft.reviewMetadata['courseIdentity.instructorName']).toEqual({
    status: 'needs_review',
    source: 'user',
  });
});

test('clearing a user-edited field returns it to missing state', () => {
  const editedState = updateDraftField(
    createAppState(),
    'courseIdentity.instructorName',
    'Dr. A. Instructor',
  );
  const nextState = updateDraftField(
    editedState,
    'courseIdentity.instructorName',
    '',
  );

  expect(nextState.draft.reviewMetadata['courseIdentity.instructorName']).toEqual({
    status: 'missing',
  });
});

test('resolving a user-edited field marks it resolved', () => {
  const editedState = updateDraftField(
    createAppState(),
    'courseIdentity.instructorName',
    'Dr. A. Instructor',
  );
  const nextState = resolveDraftField(editedState, 'courseIdentity.instructorName');

  expect(nextState.draft.reviewMetadata['courseIdentity.instructorName']).toEqual({
    status: 'resolved',
    source: 'user',
  });
});
