import { useEffect, useState } from 'react';
import {
  OPENAI_PROVIDER,
  OPENROUTER_PROVIDER,
  readSessionApiKey,
  readSessionProvider,
  type AiProvider,
  writeSessionApiKey,
  writeSessionProvider,
} from '../lib/llm/openaiSuggestions';

export interface ApiKeyPanelProps {
  onApiKeyChange?: (apiKey: string | null) => void;
  onProviderChange?: (provider: AiProvider) => void;
}

function getProviderLabel(provider: AiProvider): string {
  return provider === OPENROUTER_PROVIDER ? 'OpenRouter' : 'OpenAI';
}

export function ApiKeyPanel({
  onApiKeyChange,
  onProviderChange,
}: ApiKeyPanelProps) {
  const [provider, setProvider] = useState<AiProvider>(OPENAI_PROVIDER);
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedProvider = readSessionProvider();
    const storedKey = readSessionApiKey(storedProvider);

    setProvider(storedProvider);
    setApiKey(storedKey);
    setSaved(storedKey !== '');
    onProviderChange?.(storedProvider);
    onApiKeyChange?.(storedKey === '' ? null : storedKey);
  }, [onApiKeyChange, onProviderChange]);

  function handleSave() {
    writeSessionProvider(provider);
    writeSessionApiKey(apiKey, provider);
    setSaved(apiKey.trim() !== '');
    onProviderChange?.(provider);
    onApiKeyChange?.(apiKey.trim() === '' ? null : apiKey.trim());
  }

  function handleClear() {
    setApiKey('');
    setSaved(false);
    writeSessionApiKey('', provider);
    onApiKeyChange?.(null);
  }

  function handleProviderChange(nextProvider: AiProvider) {
    writeSessionProvider(nextProvider);
    const restoredKey = readSessionApiKey(nextProvider);

    setProvider(nextProvider);
    setApiKey(restoredKey);
    setSaved(restoredKey !== '');
    onProviderChange?.(nextProvider);
    onApiKeyChange?.(restoredKey === '' ? null : restoredKey);
  }

  return (
    <section className="api-key-panel" aria-labelledby="api-key-panel-title">
      <div>
        <h2 id="api-key-panel-title">AI Provider & API Key</h2>
        <p>
          Optional. Stored in this browser session only and used later if AI suggestions are enabled.
        </p>
      </div>

      <label className="api-key-panel__field" htmlFor="ai-provider-select">
        <span>AI provider</span>
        <select
          id="ai-provider-select"
          value={provider}
          onChange={(event) => handleProviderChange(event.target.value as AiProvider)}
        >
          <option value={OPENAI_PROVIDER}>OpenAI</option>
          <option value={OPENROUTER_PROVIDER}>OpenRouter</option>
        </select>
      </label>

      <label className="api-key-panel__field" htmlFor="ai-provider-session-key">
        <span>Session API key</span>
        <input
          id="ai-provider-session-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={apiKey}
          onChange={(event) => {
            setApiKey(event.target.value);
            setSaved(false);
          }}
          placeholder={provider === OPENROUTER_PROVIDER ? 'sk-or-...' : 'sk-...'}
        />
      </label>

      <div className="api-key-panel__actions">
        <button type="button" onClick={handleSave}>
          Save session key
        </button>
        <button type="button" onClick={handleClear} disabled={apiKey === ''}>
          Clear
        </button>
      </div>

      <p className="api-key-panel__status" role="status" aria-live="polite">
        {saved
          ? `${getProviderLabel(provider)} key saved for this session.`
          : 'No key saved yet.'}
      </p>
    </section>
  );
}
