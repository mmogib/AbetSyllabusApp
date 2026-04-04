import JSZip from 'jszip';
import { extractDocxText } from '../../src/lib/extract/docxText';
import { extractDocxTextFromDocumentXml } from '../../src/lib/extract/docxTextCore';

async function buildDocxFile(documentXml: string): Promise<File> {
  const zip = new JSZip();

  zip.file(
    'word/document.xml',
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      '<w:body>',
      documentXml,
      '</w:body>',
      '</w:document>',
    ].join(''),
  );

  const bytes = await zip.generateAsync({ type: 'uint8array' });
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

  return new File(
    [buffer],
    'sample.docx',
    {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
  );
}

test('preserves paragraph boundaries while extracting docx text', async () => {
  const file = await buildDocxFile(
    [
      '<w:p><w:r><w:t>Course Title: Probability for Data Science</w:t></w:r></w:p>',
      '<w:p><w:r><w:t>Course Code: DATA 201</w:t></w:r></w:p>',
      '<w:p><w:r><w:t>1. List Required Textbooks</w:t></w:r></w:p>',
      '<w:p><w:r><w:t>Introduction to Probability for Data Science</w:t></w:r></w:p>',
    ].join(''),
  );

  await expect(extractDocxText(file)).resolves.toBe(
    [
      'Course Title: Probability for Data Science',
      'Course Code: DATA 201',
      '1. List Required Textbooks',
      'Introduction to Probability for Data Science',
    ].join('\n'),
  );
});

test('extracts paragraph text directly from document xml with an injected parser', () => {
  const text = extractDocxTextFromDocumentXml(
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      '<w:body>',
      '<w:p><w:r><w:t>Course Title: Probability for Data Science</w:t></w:r></w:p>',
      '<w:p><w:r><w:t>Course Code: DATA 201</w:t></w:r></w:p>',
      '</w:body>',
      '</w:document>',
    ].join(''),
    new DOMParser(),
  );

  expect(text).toBe(
    ['Course Title: Probability for Data Science', 'Course Code: DATA 201'].join('\n'),
  );
});

test('preserves sparse table row positions with a synthetic delimited row line', () => {
  const text = extractDocxTextFromDocumentXml(
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      '<w:body>',
      '<w:tbl>',
      '<w:tr>',
      '<w:tc><w:p><w:r><w:t>Engineering/Computer Science</w:t></w:r></w:p></w:tc>',
      '<w:tc><w:p><w:r><w:t>Mathematics/ Science</w:t></w:r></w:p></w:tc>',
      '<w:tc><w:p><w:r><w:t>Business</w:t></w:r></w:p></w:tc>',
      '<w:tc><w:p><w:r><w:t>General Education / Social Sciences / Humanities</w:t></w:r></w:p></w:tc>',
      '<w:tc><w:p><w:r><w:t>Other</w:t></w:r></w:p></w:tc>',
      '</w:tr>',
      '<w:tr>',
      '<w:tc><w:p><w:r><w:t></w:t></w:r></w:p></w:tc>',
      '<w:tc><w:p><w:r><w:t>4</w:t></w:r></w:p></w:tc>',
      '<w:tc><w:p><w:r><w:t></w:t></w:r></w:p></w:tc>',
      '<w:tc><w:p><w:r><w:t></w:t></w:r></w:p></w:tc>',
      '<w:tc><w:p><w:r><w:t></w:t></w:r></w:p></w:tc>',
      '</w:tr>',
      '</w:tbl>',
      '</w:body>',
      '</w:document>',
    ].join(''),
    new DOMParser(),
  );

  expect(text).toContain(
    'Engineering/Computer Science ||| Mathematics/ Science ||| Business ||| General Education / Social Sciences / Humanities ||| Other',
  );
  expect(text).toContain('||| 4 |||');
});
