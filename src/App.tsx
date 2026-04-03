import { useState } from 'react';
import { ApiKeyPanel } from './components/ApiKeyPanel';
import { FileUpload } from './components/FileUpload';
import { ProjectPanel } from './components/ProjectPanel';
import { ReviewForm } from './components/ReviewForm';
import { StatusPanel } from './components/StatusPanel';
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
  importProjectIntoState,
  resolveDraftField,
  updateGenerationTermCode,
  updateDraftField,
} from './state/actions';

export default function App() {
  const [appState, setAppState] = useState(() => createAppState());
  const [provider, setProvider] = useState<AiProvider>(() => readSessionProvider());
  const [apiKey, setApiKey] = useState<string | null>(() => {
    const savedProvider = readSessionProvider();
    const savedApiKey = readSessionApiKey(savedProvider);
    return savedApiKey === '' ? null : savedApiKey;
  });
  const reviewSlice = getReviewSlice(appState.draft);
  const termOptions = getTermOptions();
  const generationFileName = buildAbetSyllabusFileName(
    appState.draft.generationMetadata.termCode,
    appState.draft.courseIdentity.courseNumber,
  );
  const hasUploadedSource = appState.sourceFileName !== null;

  return (
    <main className="app-shell">
      <div className="app-hero">
        <div>
          <h1>ABET-SYLLABUS Beta</h1>
          <p className="app-subtitle">
            A minimal static shell for the beta release.
          </p>
        </div>
        <StatusPanel reviewState={reviewSlice.reviewState} />
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
        <SummaryPanel
          draft={appState.draft}
          canGenerate={reviewSlice.reviewState.canGenerate}
          fileName={generationFileName}
          sourceFileName={appState.sourceFileName ?? ''}
          openFieldCount={reviewSlice.fields.length}
        />
      ) : null}

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

      <section className="review-panel" aria-labelledby="review-panel-title">
        <div className="section-heading">
          <div>
            <h2 id="review-panel-title">Missing Fields Review</h2>
            <p>
              Edit unresolved fields directly in the browser. The list only shows
              items that still need attention.
            </p>
          </div>
          <span className="review-panel__count">{reviewSlice.fields.length} open</span>
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

      <ProjectPanel
        draft={appState.draft}
        extractedText={appState.extractedText}
        onImport={(project) => {
          setAppState((current) => importProjectIntoState(current, project));
        }}
      />
    </main>
  );
}
