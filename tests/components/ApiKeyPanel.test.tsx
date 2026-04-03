import { render, screen } from '@testing-library/react';
import { ApiKeyPanel } from '../../src/components/ApiKeyPanel';

test('renders a restored session key as already saved', () => {
  window.sessionStorage.setItem('abet-syllabus.openaiApiKey', 'sk-restored-key');

  render(<ApiKeyPanel />);

  expect(screen.getByRole('status')).toHaveTextContent('OpenAI key saved for this session.');
  expect(screen.getByLabelText('Session API key')).toHaveValue('sk-restored-key');

  window.sessionStorage.removeItem('abet-syllabus.openaiApiKey');
});

test('renders safely when sessionStorage access is denied', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage');

  try {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('Denied', 'SecurityError');
      },
    });

    expect(() => render(<ApiKeyPanel />)).not.toThrow();
    expect(screen.getByRole('status')).toHaveTextContent('No key saved yet.');
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(window, 'sessionStorage', originalDescriptor);
    }
  }
});

test('renders a provider selector with openrouter support', () => {
  window.sessionStorage.setItem('abet-syllabus.aiProvider', 'openrouter');
  window.sessionStorage.setItem('abet-syllabus.openrouterApiKey', 'or-restored-key');

  render(<ApiKeyPanel />);

  expect(screen.getByLabelText('AI provider')).toHaveValue('openrouter');
  expect(screen.getByLabelText('Session API key')).toHaveValue('or-restored-key');

  window.sessionStorage.removeItem('abet-syllabus.aiProvider');
  window.sessionStorage.removeItem('abet-syllabus.openrouterApiKey');
});
