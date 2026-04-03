import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { SummaryPanel } from '../../src/components/SummaryPanel';
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

test('renders summary wording and downloads from the summary header', async () => {
  const draft = createResolvedDraft();
  const blob = new Blob(['docx'], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:docx');
  const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function (this: HTMLAnchorElement) {
      expect(document.body.contains(this)).toBe(true);
      expect(this.download).toBe('T252DATA201AbetSyllabus.docx');
    });

  vi.mocked(generateSyllabusDocx).mockResolvedValue(blob);

  render(
    <SummaryPanel
      draft={draft}
      canGenerate
      fileName="T252DATA201AbetSyllabus.docx"
      sourceFileName="DATA 201 Course Specifications.docx"
      openFieldCount={0}
    />,
  );

  expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument();
  expect(screen.queryByText('Parsed Summary')).not.toBeInTheDocument();

  const button = screen.getByRole('button', { name: 'Download DOCX' });
  expect(button).toHaveClass('button--success');

  fireEvent.click(button);

  await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:docx'));

  createObjectURL.mockRestore();
  revokeObjectURL.mockRestore();
  click.mockRestore();
});

test('disables the summary download button until required fields are resolved', () => {
  const draft = createResolvedDraft();

  render(
    <SummaryPanel
      draft={draft}
      canGenerate={false}
      fileName="T252DATA201AbetSyllabus.docx"
      sourceFileName="DATA 201 Course Specifications.docx"
      openFieldCount={2}
    />,
  );

  expect(screen.getByRole('button', { name: 'Download DOCX' })).toBeDisabled();
});
