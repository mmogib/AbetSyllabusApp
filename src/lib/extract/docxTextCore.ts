import JSZip from 'jszip';

import { normalizeText } from './normalizeText';

function ensureValidDocument(document: XMLDocument): void {
  if (document.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid DOCX file: malformed XML');
  }
}

export function extractDocxTextFromDocumentXml(
  documentXml: string,
  parser: Pick<DOMParser, 'parseFromString'>,
): string {
  const document = parser.parseFromString(documentXml, 'application/xml');
  ensureValidDocument(document);

  const paragraphs = Array.from(document.getElementsByTagName('w:p'))
    .map((paragraphNode) =>
      Array.from(paragraphNode.getElementsByTagName('w:t'))
        .map((node) => node.textContent ?? '')
        .join('')
        .trim(),
    )
    .filter(Boolean);

  return normalizeText(paragraphs.join('\n'));
}

export async function extractDocxTextFromArrayBuffer(
  buffer: ArrayBuffer,
  parser: Pick<DOMParser, 'parseFromString'>,
): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');

  if (!documentXml) {
    throw new Error('Invalid DOCX file: missing word/document.xml');
  }

  return extractDocxTextFromDocumentXml(documentXml, parser);
}
