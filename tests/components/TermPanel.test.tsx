import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { TermPanel } from '../../src/components/TermPanel';

const termOptions = [
  { code: '251', label: 'T251' },
  { code: '252', label: 'T252' },
  { code: '253', label: 'T253' },
];

test('renders the term panel with explanatory copy and forwards term changes', () => {
  const onTermChange = vi.fn();

  render(
    <TermPanel termCode="252" termOptions={termOptions} onTermChange={onTermChange} />,
  );

  expect(screen.getByRole('heading', { name: 'Term' })).toBeInTheDocument();
  expect(
    screen.getByText('Each syllabus must be generated for a specific academic term.'),
  ).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Academic term'), {
    target: { value: '253' },
  });

  expect(onTermChange).toHaveBeenCalledWith('253');
});
