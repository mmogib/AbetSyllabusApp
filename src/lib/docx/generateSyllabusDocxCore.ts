import JSZip from 'jszip';
import type { SyllabusDraft } from '../../types/schema';

const WORDPROCESSING_NS =
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripLeadingOrdinal(value: string): string {
  return value.replace(/^\d+\s*[.)]\s*/, '').trim();
}

function stripLeadingBullet(value: string): string {
  return value.replace(/^(?:[â€¢ï‚·]\s*)+/, '').trim();
}

function getTables(document: XMLDocument): Element[] {
  const body = document.getElementsByTagName('w:body')[0];
  if (!body) {
    throw new Error('Template DOCX is missing the document body.');
  }

  const tables = Array.from(body.getElementsByTagName('w:tbl')).filter(
    (table) => table.parentNode === body,
  );
  if (tables.length === 0) {
    throw new Error('Template DOCX is missing its expected tables.');
  }

  return tables;
}

function getTableRows(table: Element | undefined): Element[] {
  if (!table) {
    return [];
  }

  return Array.from(table.getElementsByTagName('w:tr')).filter(
    (row) => row.parentNode === table,
  );
}

function getDirectCells(row: Element): Element[] {
  return Array.from(row.getElementsByTagName('w:tc')).filter(
    (cell) => cell.parentNode === row,
  );
}

function createParagraphFromTemplate(
  document: XMLDocument,
  templateParagraph: Element,
  text: string,
): Element {
  const paragraph = document.createElementNS(WORDPROCESSING_NS, 'w:p');
  const templateParagraphProperties = templateParagraph.getElementsByTagName('w:pPr')[0];
  const templateRun = templateParagraph.getElementsByTagName('w:r')[0];
  const templateRunProperties = templateRun?.getElementsByTagName('w:rPr')[0];

  if (templateParagraphProperties) {
    paragraph.appendChild(templateParagraphProperties.cloneNode(true));
  }

  const run = document.createElementNS(WORDPROCESSING_NS, 'w:r');
  if (templateRunProperties) {
    run.appendChild(templateRunProperties.cloneNode(true));
  }

  const textNode = document.createElementNS(WORDPROCESSING_NS, 'w:t');
  textNode.setAttributeNS(XML_NS, 'xml:space', 'preserve');
  textNode.textContent = text === '' ? ' ' : text;
  run.appendChild(textNode);
  paragraph.appendChild(run);

  return paragraph;
}

function setCellParagraphs(cell: Element, values: readonly string[]): void {
  const templateParagraph =
    Array.from(cell.getElementsByTagName('w:p')).find(
      (paragraph) => paragraph.parentNode === cell,
    ) ?? cell.ownerDocument.createElementNS(WORDPROCESSING_NS, 'w:p');

  const directParagraphs = Array.from(cell.getElementsByTagName('w:p')).filter(
    (paragraph) => paragraph.parentNode === cell,
  );
  for (const paragraph of directParagraphs) {
    cell.removeChild(paragraph);
  }

  const paragraphValues = values.length > 0 ? values : [''];
  for (const value of paragraphValues) {
    cell.appendChild(
      createParagraphFromTemplate(cell.ownerDocument, templateParagraph, value),
    );
  }
}

function setCellText(cell: Element | undefined, value: string): void {
  if (!cell) {
    return;
  }

  setCellParagraphs(cell, [normalizeValue(value)]);
}

function setCellParagraphText(cell: Element | undefined, values: readonly string[]): void {
  if (!cell) {
    return;
  }

  setCellParagraphs(
    cell,
    values.map((value) => normalizeValue(value)).filter(Boolean),
  );
}

function cellUsesWordNumbering(cell: Element | undefined): boolean {
  if (!cell) {
    return false;
  }

  return Array.from(cell.getElementsByTagName('w:p')).some((paragraph) => {
    if (paragraph.parentNode !== cell) {
      return false;
    }

    return paragraph.getElementsByTagName('w:numPr').length > 0;
  });
}

function splitSupplementalMaterials(value: string): string[] {
  const normalizedInput = value.trim();
  if (!normalizedInput) {
    return [];
  }

  const splitOnNewlines = normalizedInput
    .split(/\r?\n+/)
    .map((item) => stripLeadingBullet(normalizeValue(item)))
    .filter(Boolean);
  if (splitOnNewlines.length > 1) {
    return splitOnNewlines;
  }

  const splitOnBullets = normalizedInput
    .split(/[â€¢ï‚·]+/)
    .map((item) => normalizeValue(item))
    .filter(Boolean);
  if (splitOnBullets.length > 1) {
    return splitOnBullets;
  }

  const splitOnSectionSeparator = normalizedInput
    .split(/\s*;\s+/)
    .map((item) => stripLeadingBullet(normalizeValue(item)))
    .filter(Boolean);
  if (splitOnSectionSeparator.length > 1) {
    return splitOnSectionSeparator;
  }

  return [stripLeadingBullet(normalizeValue(normalizedInput))];
}

function formatCreditsTuple(creditsText: string): string {
  const match = creditsText.match(
    /^(?<lecture>\d+(?:\.\d+)?)\s*-\s*(?<lab>\d+(?:\.\d+)?)\s*-\s*(?<credit>\d+(?:\.\d+)?)$/,
  );

  if (!match?.groups) {
    return creditsText.trim();
  }

  return `( L = ${match.groups.lecture}, LAB = ${match.groups.lab}, CR = ${match.groups.credit} )`;
}

function normalizeDesignation(value: string): 'required' | 'selected-elective' | 'elective' | '' {
  const normalizedValue = value.toLowerCase();

  if (normalizedValue.includes('required')) {
    return 'required';
  }

  if (normalizedValue.includes('selected elective')) {
    return 'selected-elective';
  }

  if (normalizedValue.includes('elective')) {
    return 'elective';
  }

  return '';
}

function populateDesignationRow(row: Element, designation: string): void {
  const cells = getDirectCells(row);
  const normalizedDesignation = normalizeDesignation(designation);

  setCellText(cells[2], normalizedDesignation === 'required' ? 'âˆš' : '');
  setCellText(cells[3], normalizedDesignation === 'selected-elective' ? 'âˆš' : '');
  setCellText(cells[4], normalizedDesignation === 'elective' ? 'âˆš' : '');
}

function populateLearningOutcomes(rows: readonly Element[], draft: SyllabusDraft): void {
  const outcomeRows = rows.slice(3, 10);

  outcomeRows.forEach((row, index) => {
    const cells = getDirectCells(row);
    const outcome = draft.learningOutcomes[index];

    setCellText(cells[0], outcome?.outcomeCode ?? '');
    setCellText(cells[1], outcome?.clo ?? '');
    setCellText(cells[2], '');
  });
}

function populateTopics(rows: readonly Element[], draft: SyllabusDraft): void {
  const topicCell = getDirectCells(rows[1])[0];
  const usesWordNumbering = cellUsesWordNumbering(topicCell);
  const topicParagraphs = draft.topics.map((topic, index) => {
    const baseText = `${stripLeadingOrdinal(topic.title)} (${topic.durationText})`;
    return usesWordNumbering ? baseText : `${index + 1}. ${baseText}`;
  });

  setCellParagraphText(topicCell, topicParagraphs);
}

function populateTemplateDocument(document: XMLDocument, draft: SyllabusDraft): void {
  const tables = getTables(document);
  const identityRows = getTableRows(tables[1]);
  const creditRows = getTableRows(tables[2]);
  const instructorRows = getTableRows(tables[3]);
  const materialsRows = getTableRows(tables[4]);
  const infoRows = getTableRows(tables[5]);
  const outcomeRows = getTableRows(tables[6]);
  const topicRows = getTableRows(tables[7]);

  setCellText(getDirectCells(identityRows[1])[1], draft.courseIdentity.department);
  setCellText(getDirectCells(identityRows[2])[1], draft.courseIdentity.courseNumber);
  setCellText(getDirectCells(identityRows[3])[1], draft.courseIdentity.courseTitle);
  setCellText(getDirectCells(creditRows[1])[1], draft.courseIdentity.creditsText);
  setCellText(getDirectCells(creditRows[2])[1], formatCreditsTuple(draft.courseIdentity.creditsText));
  setCellText(getDirectCells(instructorRows[1])[1], draft.courseIdentity.instructorName);
  setCellText(getDirectCells(materialsRows[1])[1], draft.materials.textbook || 'None');
  setCellParagraphText(
    getDirectCells(materialsRows[2])[1],
    splitSupplementalMaterials(draft.materials.supplementalMaterials || 'None'),
  );
  setCellText(getDirectCells(infoRows[1])[2], draft.courseInformation.catalogDescription);
  setCellText(getDirectCells(infoRows[2])[2], draft.courseInformation.prerequisites);
  populateDesignationRow(infoRows[4], draft.courseInformation.designation);
  populateLearningOutcomes(outcomeRows, draft);
  populateTopics(topicRows, draft);
}

function updateCoreTitle(coreXml: string, draft: SyllabusDraft): string {
  const title = escapeXml(
    normalizeValue(
      `${draft.courseIdentity.courseNumber} ${draft.courseIdentity.courseTitle}`.trim(),
    ),
  );

  return coreXml.replace(
    /<dc:title>[\s\S]*?<\/dc:title>/,
    `<dc:title>${title}</dc:title>`,
  );
}

export async function buildSyllabusDocxBytes(input: {
  draft: SyllabusDraft;
  templateBytes: ArrayBuffer;
  parseXml: (xml: string) => XMLDocument;
  serializeXml: (document: XMLDocument) => string;
}): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(new Uint8Array(input.templateBytes));
  const documentXml = await zip.file('word/document.xml')?.async('string');
  if (!documentXml) {
    throw new Error('Template DOCX is missing word/document.xml.');
  }

  const document = input.parseXml(documentXml);
  populateTemplateDocument(document, input.draft);
  zip.file('word/document.xml', input.serializeXml(document));

  const coreXml = await zip.file('docProps/core.xml')?.async('string');
  if (coreXml) {
    zip.file('docProps/core.xml', updateCoreTitle(coreXml, input.draft));
  }

  return zip.generateAsync({ type: 'uint8array' });
}
