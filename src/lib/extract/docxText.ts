import JSZip from 'jszip';

import { normalizeText } from './normalizeText';

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => {
      reject(reader.error ?? new Error('Unable to read the selected DOCX file.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

export async function extractDocxText(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await readFileAsArrayBuffer(file));
  const documentXml = await zip.file('word/document.xml')?.async('string');

  if (!documentXml) {
    throw new Error('Invalid DOCX file: missing word/document.xml');
  }

  const document = new DOMParser().parseFromString(documentXml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid DOCX file: malformed XML');
  }

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
