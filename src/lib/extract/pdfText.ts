import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import { joinPdfTextItems } from './pdfTextCore';
import type { PdfTextItemLike } from './pdfTextCore';

GlobalWorkerOptions.workerSrc = workerUrl;

export type { PdfTextItemLike };
export { joinPdfTextItems };

export async function extractPdfText(file: File): Promise<string> {
  const pdf = await getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useWorkerFetch: false,
  }).promise;

  try {
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);

      try {
        const content = await page.getTextContent();
        pages.push(joinPdfTextItems(content.items));
      } finally {
        page.cleanup();
      }
    }

    return pages.join('\n\n').trim();
  } finally {
    await pdf.destroy();
  }
}
