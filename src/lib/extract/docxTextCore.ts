import JSZip from 'jszip';

import { normalizeText } from './normalizeText';

const TABLE_CELL_DELIMITER = ' ||| ';

function ensureValidDocument(document: XMLDocument): void {
  if (document.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid DOCX file: malformed XML');
  }
}

function directChildren(element: Element, tagName: string): Element[] {
  return Array.from(element.getElementsByTagName(tagName)).filter(
    (child) => child.parentNode === element,
  );
}

function getParagraphText(paragraphNode: Element): string {
  return Array.from(paragraphNode.getElementsByTagName('w:t'))
    .map((node) => node.textContent ?? '')
    .join('')
    .trim();
}

function appendTableLines(lines: string[], tableNode: Element): void {
  const rows = directChildren(tableNode, 'w:tr');

  for (const row of rows) {
    const cells = directChildren(row, 'w:tc');
    const rowValues = cells.map((cell) =>
      directChildren(cell, 'w:p')
        .map(getParagraphText)
        .filter(Boolean)
        .join(' '),
    );

    for (const value of rowValues) {
      if (value) {
        lines.push(value);
      }
    }

    if (rowValues.length > 1) {
      lines.push(rowValues.join(TABLE_CELL_DELIMITER));
    }
  }
}

function isElementNode(node: ChildNode): node is Element {
  return node.nodeType === 1;
}

export function extractDocxTextFromDocumentXml(
  documentXml: string,
  parser: Pick<DOMParser, 'parseFromString'>,
): string {
  const document = parser.parseFromString(documentXml, 'application/xml');
  ensureValidDocument(document);

  const body = document.getElementsByTagName('w:body')[0];
  const lines: string[] = [];

  if (!body) {
    return '';
  }

  for (const childNode of Array.from(body.childNodes)) {
    if (!isElementNode(childNode)) {
      continue;
    }

    if (childNode.tagName === 'w:p') {
      const text = getParagraphText(childNode);
      if (text) {
        lines.push(text);
      }
      continue;
    }

    if (childNode.tagName === 'w:tbl') {
      appendTableLines(lines, childNode);
    }
  }

  return normalizeText(lines.join('\n'));
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
