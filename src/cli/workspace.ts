import { mkdir, readFile, readdir, rename } from 'node:fs/promises';
import { extname, join } from 'node:path';

const SUPPORTED_SOURCE_EXTENSIONS = new Set(['.pdf', '.docx', '.txt']);

function looksLikePloCatalogHeader(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes('plo_code') &&
    normalized.includes('plo_label') &&
    normalized.includes('plo_description') &&
    normalized.includes('program_code')
  );
}

async function movePloCatalogFiles(sourceDir: string, ploDir: string): Promise<void> {
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.csv') {
      continue;
    }

    const sourcePath = join(sourceDir, entry.name);
    const header = (await readFile(sourcePath, 'utf8')).split(/\r?\n/, 1)[0] ?? '';
    if (!looksLikePloCatalogHeader(header)) {
      continue;
    }

    await rename(sourcePath, join(ploDir, entry.name));
  }
}

export interface ManagedWorkspace {
  rootDir: string;
  inboxDir: string;
  runsDir: string;
  catalogDir: string;
  ploDir: string;
  exportsDir: string;
  logsDir: string;
}

export async function resolveWorkspace(rootDir: string): Promise<ManagedWorkspace> {
  const inboxDir = join(rootDir, 'inbox');
  const runsDir = join(rootDir, 'runs');
  const catalogDir = join(rootDir, 'catalog');
  const ploDir = join(catalogDir, 'plo');
  const exportsDir = join(rootDir, 'exports');
  const logsDir = join(rootDir, 'logs');

  const entries = await readdir(rootDir, { withFileTypes: true });
  const alreadyManaged = entries.some((entry) => entry.isDirectory() && entry.name === 'inbox');

  await mkdir(inboxDir, { recursive: true });
  await mkdir(runsDir, { recursive: true });
  await mkdir(catalogDir, { recursive: true });
  await mkdir(ploDir, { recursive: true });
  await mkdir(exportsDir, { recursive: true });
  await mkdir(logsDir, { recursive: true });

  if (!alreadyManaged) {
    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      if (!SUPPORTED_SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        continue;
      }

      await rename(join(rootDir, entry.name), join(inboxDir, entry.name));
    }
  }

  await movePloCatalogFiles(rootDir, ploDir);
  await movePloCatalogFiles(inboxDir, ploDir);

  return {
    rootDir,
    inboxDir,
    runsDir,
    catalogDir,
    ploDir,
    exportsDir,
    logsDir,
  };
}
