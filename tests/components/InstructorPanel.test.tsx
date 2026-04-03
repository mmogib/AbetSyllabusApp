import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { InstructorPanel } from '../../src/components/InstructorPanel';

test('renders editable instructor guidance and forwards instructor changes', () => {
  const onChange = vi.fn();

  render(
    <InstructorPanel
      value="Dr. Ada Lovelace"
      onChange={onChange}
    />,
  );

  expect(screen.getByRole('heading', { name: 'Instructor Name' })).toBeInTheDocument();
  expect(
    screen.getByText(
      'This field is editable because the source document may reflect a previous instructor.',
    ),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Instructor name')).toHaveValue('Dr. Ada Lovelace');

  fireEvent.change(screen.getByLabelText('Instructor name'), {
    target: { value: 'Dr. Grace Hopper' },
  });

  expect(onChange).toHaveBeenCalledWith('Dr. Grace Hopper');
});
