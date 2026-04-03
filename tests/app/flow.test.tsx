import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/App';

test('shows the end-to-end beta workflow and parses an uploaded source file', async () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Term' })).toBeInTheDocument();
  expect(screen.getByText('Upload Source File')).toBeInTheDocument();
  expect(screen.getByText('AI Provider & API Key')).toBeInTheDocument();
  expect(screen.getByText('Missing Fields Review')).toBeInTheDocument();
  expect(screen.getByText('Project')).toBeInTheDocument();

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
    expect(screen.getByLabelText('Review status')).toHaveTextContent('2 fields open');
  });
  expect(
    screen.getByText('Loaded course-spec.txt. Review any remaining missing fields below.'),
  ).toBeInTheDocument();
  expect(screen.getByText('Summary')).toBeInTheDocument();
  expect(screen.getByText('Software Engineering I')).toBeInTheDocument();
});
