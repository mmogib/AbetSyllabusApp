import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ReviewForm } from '../../src/components/ReviewForm';

test('renders unresolved fields and forwards edits', () => {
  const onChange = vi.fn();
  const onResolve = vi.fn();

  render(
    <ReviewForm
      fields={[
        {
          path: 'courseIdentity.instructorName',
          label: 'Instructor Name',
          value: '',
        },
      ]}
      onChange={onChange}
      onResolve={onResolve}
    />,
  );

  const input = screen.getByLabelText('Instructor Name');

  expect(input).toBeInTheDocument();

  fireEvent.change(input, { target: { value: 'Dr. A. Instructor' } });

  expect(onChange).toHaveBeenCalledWith(
    'courseIdentity.instructorName',
    'Dr. A. Instructor',
  );
});
