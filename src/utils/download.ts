export interface DownloadBlobOptions {
  blob: Blob;
  fileName: string;
}

export function downloadBlob({ blob, fileName }: DownloadBlobOptions): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
