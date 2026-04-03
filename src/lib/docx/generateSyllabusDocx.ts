import templateDocxUrl from '../../../output_template/ABETSyllabusTemplate2.docx?url';
import { buildSyllabusDocxBytes } from './generateSyllabusDocxCore';
import type { SyllabusDraft } from '../../types/schema';

const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export async function generateSyllabusDocx(draft: SyllabusDraft): Promise<Blob> {
  const templateResponse = await fetch(templateDocxUrl);
  if (!templateResponse.ok) {
    throw new Error('Unable to load the departmental DOCX template.');
  }

  const bytes = await buildSyllabusDocxBytes({
    draft,
    templateBytes: await templateResponse.arrayBuffer(),
    parseXml: (xml) => new DOMParser().parseFromString(xml, 'application/xml'),
    serializeXml: (document) => new XMLSerializer().serializeToString(document),
  });
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

  return new Blob([buffer as ArrayBuffer], { type: DOCX_MIME_TYPE });
}
