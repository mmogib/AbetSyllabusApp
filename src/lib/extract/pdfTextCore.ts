import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

import { normalizeText } from './normalizeText';

export interface PdfTextItemLike {
  str?: string;
  hasEOL?: boolean;
  width?: number;
  transform?: number[];
}

interface NormalizedPdfTextItem {
  hasEOL: boolean;
  raw: string;
  value: string;
  width: number | null;
  x: number | null;
  y: number | null;
}

function normalizePdfTextItem(item: unknown): NormalizedPdfTextItem {
  const raw =
    item !== null &&
    typeof item === 'object' &&
    'str' in item &&
    typeof item.str === 'string'
      ? item.str
      : '';
  const width =
    item !== null &&
    typeof item === 'object' &&
    'width' in item &&
    typeof item.width === 'number'
      ? item.width
      : null;
  const transform =
    item !== null &&
    typeof item === 'object' &&
    'transform' in item &&
    Array.isArray(item.transform)
      ? item.transform
      : null;

  return {
    raw,
    value: raw.trim(),
    hasEOL:
      item !== null &&
      typeof item === 'object' &&
      'hasEOL' in item &&
      item.hasEOL === true,
    width,
    x: transform && typeof transform[4] === 'number' ? transform[4] : null,
    y: transform && typeof transform[5] === 'number' ? transform[5] : null,
  };
}

function shouldInsertSpace(
  previousItem: NormalizedPdfTextItem | null,
  currentItem: NormalizedPdfTextItem,
): boolean {
  if (!previousItem) {
    return false;
  }

  if (/^\s/.test(currentItem.raw) || /\s$/.test(previousItem.raw)) {
    return true;
  }

  if (/^[,.;:)\]]/.test(currentItem.value)) {
    return false;
  }

  if (
    previousItem.x === null ||
    previousItem.y === null ||
    previousItem.width === null ||
    currentItem.x === null ||
    currentItem.y === null
  ) {
    return true;
  }

  const sameLine = Math.abs(previousItem.y - currentItem.y) < 1.5;
  if (!sameLine) {
    return true;
  }

  const gap = currentItem.x - (previousItem.x + previousItem.width);
  return gap > 1;
}

export function joinPdfTextItems(items: readonly unknown[]): string {
  let text = '';
  let previousItem: NormalizedPdfTextItem | null = null;

  for (const item of items) {
    const normalizedItem = normalizePdfTextItem(item);

    if (normalizedItem.value) {
      if (text && !text.endsWith('\n') && shouldInsertSpace(previousItem, normalizedItem)) {
        text += ' ';
      }

      text += normalizedItem.value;
      previousItem = normalizedItem;
    }

    if (normalizedItem.hasEOL && text && !text.endsWith('\n')) {
      text += '\n';
    }
  }

  return text.trim();
}

export async function extractPdfTextFromBytes(
  bytes: Uint8Array,
  options: { disableWorker?: boolean; useWorkerFetch?: boolean } = {},
): Promise<string> {
  const pdf = await getDocument({
    data: bytes,
    disableWorker: options.disableWorker ?? true,
    useWorkerFetch: options.useWorkerFetch ?? false,
  } as any).promise;

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

    return normalizeText(pages.join('\n\n'));
  } finally {
    await pdf.destroy();
  }
}
