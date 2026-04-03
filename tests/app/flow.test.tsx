import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/App';

test('shows the end-to-end beta workflow and parses an uploaded source file', async () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Term' })).toBeInTheDocument();
  expect(screen.getByText('Upload Source File')).toBeInTheDocument();
  expect(screen.queryByText('AI Provider & API Key')).not.toBeInTheDocument();
  expect(screen.getByText('Missing Fields Review')).toBeInTheDocument();
  expect(screen.queryByText('Project')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Review status')).not.toBeInTheDocument();

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

  await waitFor(() => {
    expect(screen.getAllByText('2 open').length).toBeGreaterThan(0);
  });
  expect(screen.getByRole('button', { name: 'Use AI Assistance' })).toBeInTheDocument();
  expect(
    screen.getByText('Loaded course-spec.txt. Review any remaining missing fields below.'),
  ).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Instructor Name' })).toBeInTheDocument();
  expect(screen.getByLabelText('Instructor name')).toHaveValue('Dr. Ada Lovelace');
  expect(screen.getByText('Summary')).toBeInTheDocument();
  expect(screen.getByText('Software Engineering I')).toBeInTheDocument();
});

test('hides the missing fields review panel when the uploaded draft is already complete', async () => {
  render(<App />);

  const file = new File(
    [
      [
        'Department: ICS',
        'Course Code: ICS 321',
        'Course Title: Software Engineering I',
        'Course Instructor/Coordinator: Dr. Ada Lovelace',
        'Catalog Course Description: Introduction to software engineering.',
        '4. Pre-requisites for this course (if any): ICS 253',
        '1. Required Textbooks',
        'Software Engineering, 10th Edition',
      ].join('\n'),
    ],
    'complete-course-spec.txt',
    { type: 'text/plain' },
  );

  fireEvent.change(screen.getByLabelText('Source file'), {
    target: { files: [file] },
  });

  await waitFor(() => {
    expect(screen.getByText('Software Engineering I')).toBeInTheDocument();
  });

  expect(screen.queryByRole('heading', { name: 'Missing Fields Review' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Use AI Assistance' })).not.toBeInTheDocument();
});
