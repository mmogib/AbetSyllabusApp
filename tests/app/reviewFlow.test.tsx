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

  const input = screen.getByLabelText('Department');

  fireEvent.change(input, { target: { value: 'ICS' } });

  expect(screen.getByLabelText('Department')).toHaveValue('ICS');
  expect(screen.getByText('7 open')).toBeInTheDocument();
});

test('editing the instructor field above summary updates it without using the review list', async () => {
  render(<App />);

  const file = new File(
    [
      [
        'Department: ICS',
        'Course Code: ICS 321',
        'Course Title: Software Engineering I',
        'Course Instructor/Coordinator: Dr. Ada Lovelace',
        'Catalog Course Description: Introduction to software engineering.',
      ].join('\n'),
    ],
    'course-spec.txt',
    { type: 'text/plain' },
  );

  fireEvent.change(screen.getByLabelText('Source file'), {
    target: { files: [file] },
  });

  const input = await screen.findByLabelText('Instructor name');
  fireEvent.change(input, { target: { value: 'Dr. A. Instructor' } });

  expect(screen.getByLabelText('Instructor name')).toHaveValue('Dr. A. Instructor');
  expect(screen.getAllByText('2 open').length).toBeGreaterThan(0);
  expect(screen.queryByLabelText('Review status')).not.toBeInTheDocument();
});

test('clearing a field returns it to missing state without hiding it first', async () => {
  render(<App />);

  const file = new File(
    [
      [
        'Department: ICS',
        'Course Code: ICS 321',
        'Course Title: Software Engineering I',
        'Course Instructor/Coordinator: Dr. Ada Lovelace',
        'Catalog Course Description: Introduction to software engineering.',
      ].join('\n'),
    ],
    'course-spec.txt',
    { type: 'text/plain' },
  );

  fireEvent.change(screen.getByLabelText('Source file'), {
    target: { files: [file] },
  });

  const input = await screen.findByLabelText('Instructor name');

  fireEvent.change(input, { target: { value: 'Dr. A. Instructor' } });
  fireEvent.change(screen.getByLabelText('Instructor name'), { target: { value: '' } });

  expect(screen.getByLabelText('Instructor name')).toHaveValue('');
  expect(screen.getAllByText('3 open').length).toBeGreaterThan(0);
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

  fireEvent.click(await screen.findByRole('button', { name: 'Use AI Assistance' }));

  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Suggest with AI' })).toBeEnabled();
  });

  fireEvent.click(screen.getByRole('button', { name: 'Suggest with AI' }));

  await waitFor(() => {
    expect(screen.getByLabelText('Instructor name')).toHaveValue('Dr. Ada Lovelace');
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

  fireEvent.click(await screen.findByRole('button', { name: 'Use AI Assistance' }));

  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Suggest with AI' })).toBeEnabled();
  });

  fireEvent.click(screen.getByRole('button', { name: 'Suggest with AI' }));

  await waitFor(() => {
    expect(screen.getByLabelText('Instructor name')).toHaveValue('Dr. Grace Hopper');
  });
});
