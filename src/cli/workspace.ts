import { mkdir, readdir, rename } from 'node:fs/promises';
import { extname, join } from 'node:path';

const SUPPORTED_SOURCE_EXTENSIONS = new Set(['.pdf', '.docx', '.txt']);

export interface ManagedWorkspace {
  rootDir: string;
  indexDir: string;
  inboxDir: string;
  processedDir: string;
  runsDir: string;
  catalogDir: string;
  exportsDir: string;
  logsDir: string;
}

export async function resolveWorkspace(
  rootDir: string,
  options: { adoptSourceFiles?: boolean } = {},
): Promise<ManagedWorkspace> {
  const indexDir = join(rootDir, 'index');
  const inboxDir = join(rootDir, 'inbox');
  const processedDir = join(rootDir, 'processed');
  const runsDir = join(rootDir, 'runs');
  const catalogDir = join(rootDir, 'catalog');
  const exportsDir = join(rootDir, 'exports');
  const logsDir = join(rootDir, 'logs');

  const entries = await readdir(rootDir, { withFileTypes: true });
  const alreadyManaged = entries.some((entry) => entry.isDirectory() && entry.name === 'inbox');
  const adoptSourceFiles = options.adoptSourceFiles ?? true;

  await mkdir(indexDir, { recursive: true });
  await mkdir(inboxDir, { recursive: true });
  await mkdir(processedDir, { recursive: true });
  await mkdir(runsDir, { recursive: true });
  await mkdir(catalogDir, { recursive: true });
  await mkdir(exportsDir, { recursive: true });
  await mkdir(logsDir, { recursive: true });

  if (!alreadyManaged && adoptSourceFiles) {
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

  return {
    rootDir,
    indexDir,
    inboxDir,
    processedDir,
    runsDir,
    catalogDir,
    exportsDir,
    logsDir,
  };
}
