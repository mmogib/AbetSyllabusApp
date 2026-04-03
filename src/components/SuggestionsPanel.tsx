import { useState } from 'react';
import {
  OPENROUTER_PROVIDER,
  requestFieldSuggestions,
  type AiProvider,
  type FieldSuggestionResponse,
} from '../lib/llm/openaiSuggestions';

export interface SuggestionsPanelProps {
  provider: AiProvider;
  apiKey: string | null;
  extractedText: string;
  unresolvedFields: string[];
  onApply: (suggestions: FieldSuggestionResponse[]) => void;
}

function countAppliedSuggestions(suggestions: readonly FieldSuggestionResponse[]): number {
  return suggestions.filter(
    (suggestion) =>
      suggestion.suggestion !== 'insufficient evidence' &&
      suggestion.suggestion.trim() !== '',
  ).length;
}

export function SuggestionsPanel({
  provider,
  apiKey,
  extractedText,
  unresolvedFields,
  onApply,
}: SuggestionsPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(
    'Optional AI suggestions can prefill unresolved fields for review.',
  );

  const canSuggest =
    !isLoading &&
    apiKey !== null &&
    apiKey.trim() !== '' &&
    extractedText.trim() !== '' &&
    unresolvedFields.length > 0;

  async function handleSuggest() {
    if (!canSuggest || apiKey === null) {
      return;
    }

    setIsLoading(true);
    setStatus('Requesting AI suggestions...');

    try {
      const response = await requestFieldSuggestions({
        provider,
        apiKey,
        extractedText,
        unresolvedFields,
      });

      onApply(response.suggestions);

      const appliedCount = countAppliedSuggestions(response.suggestions);
      setStatus(
        appliedCount > 0
          ? `Applied ${appliedCount} AI suggestion${appliedCount === 1 ? '' : 's'}. Review them before resolving.`
          : 'The model did not find supported suggestions for the remaining fields.',
      );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'AI suggestions failed.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="suggestions-panel" aria-labelledby="suggestions-panel-title">
      <div className="section-heading">
        <div>
          <h2 id="suggestions-panel-title">AI Suggestions</h2>
          <p>
            Use optional AI assistance to fill unresolved fields.
          </p>
        </div>
      </div>

      <div className="suggestions-panel__actions">
        <button type="button" onClick={handleSuggest} disabled={!canSuggest}>
          {isLoading ? 'Suggesting...' : 'Suggest with AI'}
        </button>
      </div>

      <p className="suggestions-panel__status" role="status" aria-live="polite">
        {apiKey === null || apiKey.trim() === ''
          ? `Save a ${provider === OPENROUTER_PROVIDER ? 'OpenRouter' : 'OpenAI'} API key above to enable suggestions.`
          : unresolvedFields.length === 0
            ? 'No unresolved fields remain.'
            : status}
      </p>
    </section>
  );
}
