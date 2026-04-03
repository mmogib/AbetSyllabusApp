import { render, screen } from '@testing-library/react';
import App from '../../src/App';

test('renders the beta shell title and subtitle', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'ABET Syllabus Generator' })).toBeInTheDocument();
  expect(screen.getByText('Version 0.1.0')).toBeInTheDocument();
  expect(
    screen.getByText(
      'Generate ABET-aligned course syllabus documents from course specification files.',
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Each syllabus must be generated for a specific academic term.'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Upload a course specification file to detect syllabus information.'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Use optional AI assistance to fill unresolved fields.'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Complete any required information not resolved automatically.'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Export or import a working draft as a local JSON file.'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Save an optional AI provider key in this browser session for suggestion support.'),
  ).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'AI Provider & API Key' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Review status')).not.toBeInTheDocument();
});
