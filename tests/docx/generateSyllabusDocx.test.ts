import JSZip from 'jszip';
import { vi } from 'vitest';
import { generateSyllabusDocx } from '../../src/lib/docx/generateSyllabusDocx';
import { buildSyllabusDocxBytes } from '../../src/lib/docx/generateSyllabusDocxCore';
import { createEmptyDraft } from '../../src/lib/schema/defaultDraft';

function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(blob);
  });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createCell(text: string): string {
  return [
    '<w:tc>',
    '<w:p>',
    '<w:r>',
    `<w:t xml:space="preserve">${escapeXml(text)}</w:t>`,
    '</w:r>',
    '</w:p>',
    '</w:tc>',
  ].join('');
}

function createNumberedCell(text: string): string {
  return [
    '<w:tc>',
    '<w:p>',
    '<w:pPr>',
    '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr>',
    '<w:tabs><w:tab w:val="clear" w:pos="1571"/><w:tab w:val="num" w:pos="493"/></w:tabs>',
    '<w:ind w:left="635" w:hanging="283"/>',
    '</w:pPr>',
    '<w:r>',
    `<w:t xml:space="preserve">${escapeXml(text)}</w:t>`,
    '</w:r>',
    '</w:p>',
    '</w:tc>',
  ].join('');
}

function createRow(cells: string[]): string {
  return `<w:tr>${cells.join('')}</w:tr>`;
}

function createTable(rows: string[][], numberedCells: Record<number, number[]> = {}): string {
  return [
    '<w:tbl>',
    rows
      .map((row, rowIndex) =>
        createRow(
          row.map((text, cellIndex) =>
            numberedCells[rowIndex]?.includes(cellIndex)
              ? createNumberedCell(text)
              : createCell(text),
          ),
        ),
      )
      .join(''),
    '</w:tbl>',
  ].join('');
}

async function buildTemplateBuffer(): Promise<ArrayBuffer> {
  const documentXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:body>',
    createTable([['COURSE SYLLABUS']]),
    '<w:p/>',
    createTable([
      ['Course Number and Title'],
      ['Department:', 'Mathematics'],
      ['Course Number:', 'MATH 208'],
      ['Course Title:', 'Differential Equations and Linear Algebra'],
    ]),
    '<w:p/>',
    createTable([
      ['Credits Hours'],
      ['Credits, Contact Hrs', '3 Lecture /week (50 minutes)'],
      ['', '( L = 3 , LAB = 0 , CR = 3 )'],
      ['Credits Categorization', 'Math and Basic Sciences', 'Engineering Topics', 'Other'],
      ['', '', '', ''],
    ]),
    '<w:p/>',
    createTable([
      ['Course Instructor or Coordinator'],
      ['Name', 'Dr. Bader Alhumaidi'],
    ]),
    '<w:p/>',
    createTable(
      [
        ['Textbook(s) and other Supplemental Material'],
        [
          'Textbook Title, Author, Year',
          'Differential Equations and Linear Algebra, C. Henry Edwards, David E. Penny, and David T. Calvis, 4th edition, 2021.',
        ],
        ['Other Supplemental Materials. [Reference(s), Handout(s)]', 'X'],
      ],
      { 2: [1] },
    ),
    '<w:p/>',
    createTable([
      ['Specific Course Information'],
      ['5.a', 'Course Content ( Catalog Description )', 'Systems of linear equations.'],
      ['5.b', 'Prerequisites or Co- requisites', 'MATH 102'],
      [
        '5.c',
        'Designation',
        'Required Course ( R ) Core',
        'Selected Elective ( SE ) (from a specified group of electives)',
        'Elective ( E ) (Optional, Open, Free)',
      ],
      ['', '', 'âˆš', '', ''],
    ]),
    '<w:p/>',
    '<w:p/>',
    createTable([
      ['Specific Goals for the Course'],
      ['6.a', '6.b'],
      ['Specific Outcomes of Instruction ( CLOs ) . The Students will be able to :', 'Student Outcomes (i.e. addressed by the course)'],
      ['CLO-1', 'Discuss basic concepts of differential equations and linear algebra', 'SO-3'],
      ['CLO-2', 'Solve various types of ordinary differential equations of first order.', 'SO-5'],
      ['CLO-3', 'Apply differential equations to solve certain real-world problems.', 'SO-7'],
      ['CLO-4', 'Solve problems related to matrices.', 'SO-1'],
      ['CLO-5', 'Solve homogeneous and nonhomogeneous ODE.', 'SO-2'],
      ['CLO-6', 'Solve linear systems of differential equations.', ''],
      ['CLO-7', 'Use infinite series to solve second order differential equations.', ''],
    ]),
    '<w:p/>',
    createTable(
      [
        ['Brief List of Course Topics (covered)'],
        ['First-order differential equations (3 weeks)'],
      ],
      { 1: [0] },
    ),
    '</w:body>',
    '</w:document>',
  ].join('');

  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types/>');
  zip.folder('_rels')?.file('.rels', '<Relationships/>');
  zip.file('word/document.xml', documentXml);
  zip.folder('word')?.folder('_rels')?.file('document.xml.rels', '<Relationships/>');
  zip.folder('docProps')?.file(
    'core.xml',
    [
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"',
      ' xmlns:dc="http://purl.org/dc/elements/1.1/">',
      '<dc:title>MATH 208 Differential Equations and Linear Algebra</dc:title>',
      '</cp:coreProperties>',
    ].join(''),
  );
  zip.folder('docProps')?.file('app.xml', '<Properties/>');

  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

test('builds syllabus docx bytes using injected xml adapters', async () => {
  const templateBytes = await buildTemplateBuffer();
  const draft = createEmptyDraft();
  draft.courseIdentity.courseNumber = 'ICS 321';
  draft.courseIdentity.courseTitle = 'Software Engineering I';

  const bytes = await buildSyllabusDocxBytes({
    draft,
    templateBytes,
    parseXml: (xml) => new DOMParser().parseFromString(xml, 'application/xml'),
    serializeXml: (document) => new XMLSerializer().serializeToString(document),
  });

  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const zip = await JSZip.loadAsync(buffer);
  const documentFile = zip.file('word/document.xml');
  const documentXml = documentFile ? await documentFile.async('string') : '';

  expect(bytes.byteLength).toBeGreaterThan(0);
  expect(documentXml).toContain('ICS 321');
  expect(documentXml).toContain('Software Engineering I');
});

test('returns a DOCX blob with syllabus content in the template 2 layout', async () => {
  const templateBytes = await buildTemplateBuffer();

  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => templateBytes,
    }),
  );

  const draft = createEmptyDraft();
  draft.courseIdentity.department = 'Mathematics';
  draft.courseIdentity.courseNumber = 'DATA 201';
  draft.courseIdentity.courseTitle = 'Probability for Data Science <Beta> & Review';
  draft.courseIdentity.instructorName = 'Dr. Mohammed Alshahrani';
  draft.courseIdentity.creditsText = '3-0-3';
  draft.materials.textbook = 'None';
  draft.materials.supplementalMaterials = 'Handouts & Notes';
  draft.courseInformation.catalogDescription = 'An introduction to probability <and> statistics.';
  draft.courseInformation.prerequisites = 'STAT 201';
  draft.courseInformation.designation = 'Required';
  draft.learningOutcomes = [
    { outcomeCode: 'CLO-1', clo: 'Model uncertainty with discrete and continuous distributions.' },
    { outcomeCode: 'CLO-2', clo: 'Implement probabilistic methods computationally.' },
  ];
  draft.topics = [
    { title: 'Discrete probability and conditioning', durationText: '3 hours' },
    { title: 'Markov chains and simulation', durationText: '4 hours' },
  ];

  const blob = await generateSyllabusDocx(draft);
  const zip = await JSZip.loadAsync(await readBlobAsArrayBuffer(blob));
  const documentFile = zip.file('word/document.xml');
  const documentXml = documentFile ? await documentFile.async('string') : '';

  expect(blob).toBeInstanceOf(Blob);
  expect(blob.type).toBe(
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  );
  expect(documentXml).toContain('COURSE SYLLABUS');
  expect(documentXml).toContain('DATA 201');
  expect(documentXml).toContain('Probability for Data Science &lt;Beta&gt; &amp; Review');
  expect(documentXml).toContain('Dr. Mohammed Alshahrani');
  expect(documentXml).toContain('Handouts &amp; Notes');
  expect(documentXml).toContain('STAT 201');
  expect(documentXml).toContain('CLO-1');
  expect(documentXml).toContain('Markov chains and simulation');
  expect(documentXml).not.toContain('MATH 208');
  expect(documentXml).not.toContain('Differential Equations and Linear Algebra');
});

test('does not duplicate topic numbering when template 2 already numbers topic paragraphs', async () => {
  const templateBytes = await buildTemplateBuffer();

  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => templateBytes,
    }),
  );

  const draft = createEmptyDraft();
  draft.topics = [
    { title: '1. Mathematical Background: Sets, Series, and Combinatorics', durationText: '3' },
  ];

  const blob = await generateSyllabusDocx(draft);
  const zip = await JSZip.loadAsync(await readBlobAsArrayBuffer(blob));
  const documentFile = zip.file('word/document.xml');
  const documentXml = documentFile ? await documentFile.async('string') : '';

  expect(documentXml).toContain('Mathematical Background: Sets, Series, and Combinatorics (3)');
  expect(documentXml).not.toContain('1. Mathematical Background: Sets, Series, and Combinatorics (3)');
  expect(documentXml).not.toContain('1. 1. Mathematical Background: Sets, Series, and Combinatorics (3)');
});

test('renders supplemental materials as separate bullet paragraphs in template 2', async () => {
  const templateBytes = await buildTemplateBuffer();

  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => templateBytes,
    }),
  );

  const draft = createEmptyDraft();
  draft.materials.supplementalMaterials =
    'Ani Adhikari and Jim Pitman, "Probability for Data Science," 2021; R: A language and environment for statistical computing. R Foundation for Statistical Computing, Vienna, Austria. URL http://www.R-project.org/';

  const blob = await generateSyllabusDocx(draft);
  const zip = await JSZip.loadAsync(await readBlobAsArrayBuffer(blob));
  const documentFile = zip.file('word/document.xml');
  const documentXml = documentFile ? await documentFile.async('string') : '';

  expect(documentXml).toContain('Ani Adhikari and Jim Pitman, "Probability for Data Science," 2021');
  expect(documentXml).toContain('R: A language and environment for statistical computing. R Foundation for Statistical Computing, Vienna, Austria. URL http://www.R-project.org/');
  expect(documentXml).toMatch(
    /Ani Adhikari and Jim Pitman, "Probability for Data Science," 2021[\s\S]*?<\/w:p><w:p[\s\S]*?R: A language and environment for statistical computing\./,
  );
});

test('fills the correct template 2 cells for identity and course info sections', async () => {
  const templateBytes = await buildTemplateBuffer();

  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => templateBytes,
    }),
  );

  const draft = createEmptyDraft();
  draft.courseIdentity.department = 'Physics';
  draft.courseIdentity.courseNumber = 'PHYS 101';
  draft.courseIdentity.courseTitle = 'Modern Mechanics';
  draft.courseIdentity.instructorName = 'Dr. Noura';
  draft.courseIdentity.creditsText = '3-0-3';
  draft.courseInformation.catalogDescription = 'Foundations of mechanics.';
  draft.courseInformation.prerequisites = 'MATH 101';
  draft.courseInformation.designation = 'Required';

  const blob = await generateSyllabusDocx(draft);
  const zip = await JSZip.loadAsync(await readBlobAsArrayBuffer(blob));
  const documentFile = zip.file('word/document.xml');
  const documentXml = documentFile ? await documentFile.async('string') : '';

  expect(documentXml).toContain('Physics');
  expect(documentXml).toContain('PHYS 101');
  expect(documentXml).toContain('Modern Mechanics');
  expect(documentXml).toContain('Dr. Noura');
  expect(documentXml).toContain('Foundations of mechanics.');
  expect(documentXml).toContain('MATH 101');
});
