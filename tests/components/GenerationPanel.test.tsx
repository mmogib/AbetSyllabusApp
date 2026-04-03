import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { GenerationPanel } from '../../src/components/GenerationPanel';
import { createEmptyDraft } from '../../src/lib/schema/defaultDraft';
import { generateSyllabusDocx } from '../../src/lib/docx/generateSyllabusDocx';

vi.mock('../../src/lib/docx/generateSyllabusDocx', () => ({
  generateSyllabusDocx: vi.fn(),
}));

function createResolvedDraft() {
  const draft = createEmptyDraft();

  draft.courseIdentity.department = 'Mathematics';
  draft.courseIdentity.courseNumber = 'DATA 201';
  draft.courseIdentity.courseTitle = 'Probability for Data Science';
  draft.courseIdentity.instructorName = 'Dr. Mohammed Alshahrani';
  draft.courseIdentity.creditsText = '3-0-3';
  draft.materials.textbook = 'None';
  draft.courseInformation.catalogDescription = 'An introduction to probability.';
  draft.courseInformation.prerequisites = 'STAT 201';
  draft.reviewMetadata = {
    'courseIdentity.department': {
      status: 'resolved',
      source: 'deterministic',
      confidence: 'high',
    },
    'courseIdentity.courseNumber': {
      status: 'resolved',
      source: 'deterministic',
      confidence: 'high',
    },
    'courseIdentity.courseTitle': {
      status: 'resolved',
      source: 'deterministic',
      confidence: 'high',
    },
    'courseIdentity.instructorName': {
      status: 'resolved',
      source: 'user',
    },
    'courseIdentity.creditsText': {
      status: 'resolved',
      source: 'user',
    },
    'courseInformation.catalogDescription': {
      status: 'resolved',
      source: 'llm',
    },
    'courseInformation.prerequisites': {
      status: 'resolved',
      source: 'user',
    },
    'materials.textbook': {
      status: 'resolved',
      source: 'deterministic',
      confidence: 'high',
    },
  };

  return draft;
}

const termOptions = [
  { code: '251', label: 'T251' },
  { code: '252', label: 'T252' },
  { code: '253', label: 'T253' },
];

test('appends the download anchor before clicking and revokes it asynchronously', async () => {
  const draft = createResolvedDraft();
  const blob = new Blob(['docx'], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:docx');
  const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(document.body.contains(this)).toBe(true);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    expect(this.download).toBe('T252DATA201AbetSyllabus.docx');
  });
  const appendChild = vi.spyOn(document.body, 'appendChild');
  const removeChild = vi.spyOn(document.body, 'removeChild');

  vi.mocked(generateSyllabusDocx).mockResolvedValue(blob);

  render(
    <GenerationPanel
      draft={draft}
      canGenerate
      termCode="252"
      termOptions={termOptions}
      onTermChange={() => {}}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Download DOCX' }));

  expect(revokeObjectURL).not.toHaveBeenCalled();
  await waitFor(() => expect(appendChild).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(click).toHaveBeenCalledTimes(1));

  await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:docx'));
  expect(removeChild).toHaveBeenCalledTimes(1);
  expect(document.body.querySelector('a[download]')).toBeNull();

  createObjectURL.mockRestore();
  revokeObjectURL.mockRestore();
  click.mockRestore();
  appendChild.mockRestore();
  removeChild.mockRestore();
});

test('renders a term dropdown and forwards term changes', () => {
  const draft = createResolvedDraft();
  const onTermChange = vi.fn();

  render(
    <GenerationPanel
      draft={draft}
      canGenerate
      termCode="252"
      termOptions={termOptions}
      onTermChange={onTermChange}
    />,
  );

  fireEvent.change(screen.getByLabelText('Term'), {
    target: { value: '253' },
  });

  expect(onTermChange).toHaveBeenCalledWith('253');
});
