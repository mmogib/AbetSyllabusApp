import { useEffect, useState } from 'react';
import { ApiKeyPanel } from './components/ApiKeyPanel';
import { FileUpload } from './components/FileUpload';
import { InstructorPanel } from './components/InstructorPanel';
import { ReviewForm } from './components/ReviewForm';
import { SuggestionsPanel } from './components/SuggestionsPanel';
import { SummaryPanel } from './components/SummaryPanel';
import { TermPanel } from './components/TermPanel';
import {
  OPENAI_PROVIDER,
  readSessionApiKey,
  readSessionProvider,
  type AiProvider,
} from './lib/llm/openaiSuggestions';
import { buildAbetSyllabusFileName, getTermOptions } from './lib/term/academicTerms';
import { createAppState, getReviewSlice } from './state/appState';
import {
  applyFieldSuggestions,
  applyUploadedDraft,
  resolveDraftField,
  updateGenerationTermCode,
  updateDraftField,
} from './state/actions';

const appVersion = __APP_VERSION__;

export default function App() {
  const [appState, setAppState] = useState(() => createAppState());
  const [provider, setProvider] = useState<AiProvider>(() => readSessionProvider());
  const [isAiAssistanceExpanded, setIsAiAssistanceExpanded] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(() => {
    const savedProvider = readSessionProvider();
    const savedApiKey = readSessionApiKey(savedProvider);
    return savedApiKey === '' ? null : savedApiKey;
  });
  const reviewSlice = getReviewSlice(appState.draft);
  const unresolvedFieldCount = reviewSlice.reviewState.unresolvedFields.length;
  const termOptions = getTermOptions();
  const generationFileName = buildAbetSyllabusFileName(
    appState.draft.generationMetadata.termCode,
    appState.draft.courseIdentity.courseNumber,
  );
  const hasUploadedSource = appState.sourceFileName !== null;
  const canOfferAiAssistance = hasUploadedSource && unresolvedFieldCount > 0;

  useEffect(() => {
    if (!canOfferAiAssistance) {
      setIsAiAssistanceExpanded(false);
    }
  }, [canOfferAiAssistance]);

  return (
    <main className="app-shell">
      <div className="app-hero">
        <div>
          <h1>ABET Syllabus Generator</h1>
          <p className="app-version">Version {appVersion}</p>
          <p className="app-subtitle">
            Generate ABET-aligned course syllabus documents from course specification files.
          </p>
        </div>
      </div>

      <TermPanel
        termCode={appState.draft.generationMetadata.termCode}
        termOptions={termOptions}
        onTermChange={(termCode) => {
          setAppState((current) => updateGenerationTermCode(current, termCode));
        }}
      />

      <FileUpload
        onLoaded={(payload) => {
          setAppState((current) => applyUploadedDraft(current, payload));
        }}
      />

      {hasUploadedSource ? (
        <>
          <InstructorPanel
            value={appState.draft.courseIdentity.instructorName}
            onChange={(value) => {
              setAppState((current) =>
                updateDraftField(current, 'courseIdentity.instructorName', value),
              );
            }}
          />

          <SummaryPanel
            draft={appState.draft}
            canGenerate={reviewSlice.reviewState.canGenerate}
            fileName={generationFileName}
            sourceFileName={appState.sourceFileName ?? ''}
            openFieldCount={unresolvedFieldCount}
          />
        </>
      ) : null}

      {canOfferAiAssistance ? (
        <>
          <section className="ai-assist-panel" aria-labelledby="ai-assist-panel-title">
            <div className="section-heading">
              <div>
                <h2 id="ai-assist-panel-title">AI Assistance</h2>
                <p>Use optional AI help to prefill unresolved fields for review.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAiAssistanceExpanded((current) => !current);
                }}
              >
                {isAiAssistanceExpanded ? 'Hide AI Assistance' : 'Use AI Assistance'}
              </button>
            </div>
          </section>

          {isAiAssistanceExpanded ? (
            <>
              <ApiKeyPanel
                onProviderChange={(nextProvider) => {
                  setProvider(nextProvider);
                  const restoredKey = readSessionApiKey(nextProvider);
                  setApiKey(restoredKey === '' ? null : restoredKey);
                }}
                onApiKeyChange={setApiKey}
              />

              <SuggestionsPanel
                provider={provider ?? OPENAI_PROVIDER}
                apiKey={apiKey}
                extractedText={appState.extractedText}
                unresolvedFields={reviewSlice.reviewState.unresolvedFields}
                onApply={(suggestions) => {
                  setAppState((current) => applyFieldSuggestions(current, suggestions));
                }}
              />
            </>
          ) : null}
        </>
      ) : null}

      {unresolvedFieldCount > 0 ? (
        <section className="review-panel" aria-labelledby="review-panel-title">
          <div className="section-heading">
            <div>
              <h2 id="review-panel-title">Missing Fields Review</h2>
              <p>
                Complete any required information not resolved automatically.
              </p>
            </div>
            <span className="review-panel__count">
              {unresolvedFieldCount} open
            </span>
          </div>

          <ReviewForm
            fields={reviewSlice.fields}
            onChange={(path, value) => {
              setAppState((current) => updateDraftField(current, path, value));
            }}
            onResolve={(path) => {
              setAppState((current) => resolveDraftField(current, path));
            }}
          />
        </section>
      ) : null}

    </main>
  );
}
