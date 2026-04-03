import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

import { JSDOM } from 'jsdom';

import { buildSyllabusDocxBytes } from '../lib/docx/generateSyllabusDocxCore';
import { extractDocxTextFromArrayBuffer } from '../lib/extract/docxTextCore';
import { normalizeText } from '../lib/extract/normalizeText';
import { extractPdfTextFromBytes } from '../lib/extract/pdfTextCore';
import type { SyllabusDraft } from '../types/schema';

const domWindow = new JSDOM('').window;
let pdfJsWorkerSetupPromise: Promise<void> | null = null;

async function ensurePdfJsWorker(): Promise<void> {
  if ((globalThis as { pdfjsWorker?: unknown }).pdfjsWorker) {
    return;
  }

  if (!pdfJsWorkerSetupPromise) {
    pdfJsWorkerSetupPromise = import('pdfjs-dist/legacy/build/pdf.worker.mjs').then((module) => {
      (
        globalThis as {
          pdfjsWorker?: { WorkerMessageHandler: unknown };
        }
      ).pdfjsWorker = {
        WorkerMessageHandler: module.WorkerMessageHandler,
      };
    });
  }

  await pdfJsWorkerSetupPromise;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function extractSourceTextFromPath(filePath: string): Promise<string> {
  const extension = extname(filePath).toLowerCase();

  if (extension === '.txt') {
    return normalizeText(await readFile(filePath, 'utf8'));
  }

  const fileBytes = await readFile(filePath);

  if (extension === '.docx') {
    return extractDocxTextFromArrayBuffer(
      toArrayBuffer(fileBytes),
      new domWindow.DOMParser() as unknown as Pick<DOMParser, 'parseFromString'>,
    );
  }

  if (extension === '.pdf') {
    await ensurePdfJsWorker();
    return extractPdfTextFromBytes(new Uint8Array(fileBytes), {
      disableWorker: true,
      useWorkerFetch: false,
    });
  }

  throw new Error(`Unsupported file type: ${extension}`);
}

export async function generateDocxBytesForDraft(draft: SyllabusDraft): Promise<Uint8Array> {
  const templatePath = resolve(process.cwd(), 'output_template', 'ABETSyllabusTemplate2.docx');
  const templateBytes = await readFile(templatePath);

  return buildSyllabusDocxBytes({
    draft,
    templateBytes: toArrayBuffer(templateBytes),
    parseXml: (xml) =>
      new domWindow.DOMParser().parseFromString(xml, 'application/xml') as unknown as XMLDocument,
    serializeXml: (document) =>
      new domWindow.XMLSerializer().serializeToString(document as unknown as Node),
  });
}
