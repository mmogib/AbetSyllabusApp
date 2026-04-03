import JSZip from 'jszip';
import { extractDocxText } from '../../src/lib/extract/docxText';

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
