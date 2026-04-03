import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import {
  OPENROUTER_PROVIDER,
  writeSessionApiKey,
  writeSessionProvider,
} from '../../src/lib/llm/openaiSuggestions';
import App from '../../src/App';

test('keeps an edited unresolved field visible while the user is filling it in', () => {
  render(<App />);

  const input = screen.getByLabelText('Instructor Name');

  fireEvent.change(input, { target: { value: 'Dr. A. Instructor' } });

  expect(screen.getByLabelText('Instructor Name')).toHaveValue('Dr. A. Instructor');
  expect(screen.getByText('7 open')).toBeInTheDocument();
});

test('explicitly resolving a field removes it from the unresolved list and updates status', () => {
  render(<App />);

  const input = screen.getByLabelText('Instructor Name');
  fireEvent.change(input, { target: { value: 'Dr. A. Instructor' } });

  const resolveButton = screen
    .getAllByRole('button', { name: 'Mark resolved' })
    .find((button) => !button.hasAttribute('disabled'));

  expect(resolveButton).toBeDefined();
  fireEvent.click(resolveButton!);

  expect(screen.queryByLabelText('Instructor Name')).not.toBeInTheDocument();
  expect(screen.getByText('6 open')).toBeInTheDocument();
  expect(screen.queryByLabelText('Review status')).not.toBeInTheDocument();
});

test('clearing a field returns it to missing state without hiding it first', () => {
  render(<App />);

  const input = screen.getByLabelText('Instructor Name');

  fireEvent.change(input, { target: { value: 'Dr. A. Instructor' } });
  fireEvent.change(screen.getByLabelText('Instructor Name'), { target: { value: '' } });

  expect(screen.getByLabelText('Instructor Name')).toHaveValue('');
  expect(screen.getByText('7 open')).toBeInTheDocument();
});

test('applies ai suggestions into the unresolved review flow', async () => {
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
                    suggestion: 'Dr. Ada Lovelace',
                    evidence: ['Course Instructor/Coordinator: Dr. Ada Lovelace'],
                  },
                ],
              }),
            },
          ],
        },
      ],
    }),
  });

  vi.stubGlobal('fetch', fetchMock);
  writeSessionApiKey('sk-test');

  render(<App />);

  const file = new File(
    [
      [
        'Department: ICS',
        'Course Code: ICS 321',
        'Course Title: Software Engineering I',
        'Catalog Course Description: Introduction to software engineering.',
        '4. Pre-requisites for this course (if any): ICS 253',
        '1. Required Textbooks',
        'Software Engineering, 10th Edition',
      ].join('\n'),
    ],
    'course-spec.txt',
    { type: 'text/plain' },
  );

  fireEvent.change(screen.getByLabelText('Source file'), {
    target: { files: [file] },
  });

  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Suggest with AI' })).toBeEnabled();
  });

  fireEvent.click(screen.getByRole('button', { name: 'Suggest with AI' }));

  await waitFor(() => {
    expect(screen.getByLabelText('Instructor Name')).toHaveValue('Dr. Ada Lovelace');
  });
});

test('applies openrouter ai suggestions into the unresolved review flow', async () => {
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
                  suggestion: 'Dr. Grace Hopper',
                  evidence: ['Course Instructor/Coordinator: Dr. Grace Hopper'],
                },
              ],
            }),
          },
        },
      ],
    }),
  });

  vi.stubGlobal('fetch', fetchMock);
  writeSessionProvider(OPENROUTER_PROVIDER);
  writeSessionApiKey('or-test');

  render(<App />);

  const file = new File(
    [
      [
        'Department: ICS',
        'Course Code: ICS 321',
        'Course Title: Software Engineering I',
        'Catalog Course Description: Introduction to software engineering.',
        '4. Pre-requisites for this course (if any): ICS 253',
        '1. Required Textbooks',
        'Software Engineering, 10th Edition',
      ].join('\n'),
    ],
    'course-spec.txt',
    { type: 'text/plain' },
  );

  fireEvent.change(screen.getByLabelText('Source file'), {
    target: { files: [file] },
  });

  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Suggest with AI' })).toBeEnabled();
  });

  fireEvent.click(screen.getByRole('button', { name: 'Suggest with AI' }));

  await waitFor(() => {
    expect(screen.getByLabelText('Instructor Name')).toHaveValue('Dr. Grace Hopper');
  });
});
