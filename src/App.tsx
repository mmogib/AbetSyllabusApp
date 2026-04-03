import { useState } from 'react';
import { ApiKeyPanel } from './components/ApiKeyPanel';
import { FileUpload } from './components/FileUpload';
import { GenerationPanel } from './components/GenerationPanel';
import { ProjectPanel } from './components/ProjectPanel';
import { ReviewForm } from './components/ReviewForm';
import { StatusPanel } from './components/StatusPanel';
import { SuggestionsPanel } from './components/SuggestionsPanel';
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

      <FileUpload
        onLoaded={(payload) => {
          setAppState((current) => applyUploadedDraft(current, payload));
        }}
      />

      {hasUploadedSource ? (
        <section className="summary-panel" aria-labelledby="summary-panel-title">
          <div className="section-heading">
            <div>
              <h2 id="summary-panel-title">Parsed Summary</h2>
              <p>
                Parsed values detected from <strong>{appState.sourceFileName}</strong>. Any missing
                required fields remain below in the review form.
              </p>
            </div>
            <span className="review-panel__count">{reviewSlice.fields.length} open</span>
          </div>

          <dl className="summary-grid">
            <div>
              <dt>Department</dt>
              <dd>{appState.draft.courseIdentity.department || 'Not detected'}</dd>
            </div>
            <div>
              <dt>Course Number</dt>
              <dd>{appState.draft.courseIdentity.courseNumber || 'Not detected'}</dd>
            </div>
            <div>
              <dt>Course Title</dt>
              <dd>{appState.draft.courseIdentity.courseTitle || 'Not detected'}</dd>
            </div>
            <div>
              <dt>Instructor</dt>
              <dd>{appState.draft.courseIdentity.instructorName || 'Not detected'}</dd>
            </div>
            <div className="summary-grid__wide">
              <dt>Catalog Description</dt>
              <dd>{appState.draft.courseInformation.catalogDescription || 'Not detected'}</dd>
            </div>
          </dl>
        </section>
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

      <GenerationPanel
        draft={appState.draft}
        canGenerate={reviewSlice.reviewState.canGenerate}
        termCode={appState.draft.generationMetadata.termCode}
        termOptions={termOptions}
        onTermChange={(termCode) => {
          setAppState((current) => updateGenerationTermCode(current, termCode));
        }}
        fileName={generationFileName}
      />

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
