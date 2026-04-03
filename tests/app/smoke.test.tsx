import { render, screen } from '@testing-library/react';
import App from '../../src/App';

test('renders the beta shell title and subtitle', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'ABET-SYLLABUS Beta' })).toBeInTheDocument();
  expect(screen.getByText('A minimal static shell for the beta release.')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'AI Provider & API Key' })).toBeInTheDocument();
});
