import { extractDocxTextFromArrayBuffer } from './docxTextCore';

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
  return extractDocxTextFromArrayBuffer(await readFileAsArrayBuffer(file), new DOMParser());
}
