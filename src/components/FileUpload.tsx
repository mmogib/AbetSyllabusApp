import { useId, useState, type ChangeEvent } from 'react';
import { parseCourseSpec } from '../lib/parse/courseSpecParser';
import type { SyllabusDraft } from '../types/schema';

export interface UploadedSourcePayload {
  draft: SyllabusDraft;
  extractedText: string;
  sourceFileName: string;
}

export interface FileUploadProps {
  onLoaded: (payload: UploadedSourcePayload) => void;
}

async function extractTextFromFile(file: File): Promise<string> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
    const { extractPdfText } = await import('../lib/extract/pdfText');
    return extractPdfText(file);
  }

  if (
    lowerName.endsWith('.docx') ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const { extractDocxText } = await import('../lib/extract/docxText');
    return extractDocxText(file);
  }

  if (lowerName.endsWith('.txt') || file.type.startsWith('text/')) {
    if (typeof file.text === 'function') {
      return file.text();
    }

    if (typeof file.arrayBuffer === 'function') {
      const buffer = await file.arrayBuffer();
      return new TextDecoder().decode(buffer);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(typeof reader.result === 'string' ? reader.result : '');
      };
      reader.onerror = () => {
        reject(new Error('Unable to read the selected text file.'));
      };

      reader.readAsText(file);
    });
  }

  throw new Error('Unsupported file type. Upload a PDF, DOCX, or TXT source file.');
}

export function FileUpload({ onLoaded }: FileUploadProps) {
  const inputId = useId();
  const [status, setStatus] = useState(
    'Upload a PDF, DOCX, or TXT source file to prefill the draft in this browser.',
  );
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsProcessing(true);
    setStatus(`Extracting ${file.name}...`);

    try {
      const extractedText = await extractTextFromFile(file);
      const draft = parseCourseSpec(extractedText);

      onLoaded({
        draft,
        extractedText,
        sourceFileName: file.name,
      });

      setStatus(`Loaded ${file.name}. Review any remaining missing fields below.`);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Source file processing failed.',
      );
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  }

  return (
    <section className="upload-panel" aria-labelledby="upload-panel-title">
      <div className="section-heading">
        <div>
          <h2 id="upload-panel-title">Upload Source File</h2>
          <p>
            Upload a course specification file to detect syllabus information.
          </p>
        </div>
      </div>

      <label className="upload-panel__field" htmlFor={inputId}>
        <span>Source file</span>
        <input
          id={inputId}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          disabled={isProcessing}
        />
      </label>

      <p className="upload-panel__status" role="status" aria-live="polite">
        {isProcessing ? 'Processing source file...' : status}
      </p>
    </section>
  );
}
