import { mkdtemp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { resolveWorkspace } from '../../src/cli/workspace';

test('adopts a plain source folder by creating managed workspace folders and moving supported files into inbox', async () => {
  const root = await mkdtemp(join(tmpdir(), 'abet-workspace-'));
  await writeFile(join(root, 'course.pdf'), 'pdf', 'utf8');

  const workspace = await resolveWorkspace(root);

  expect(workspace.rootDir).toBe(root);
  expect(workspace.inboxDir).toBe(join(root, 'inbox'));
  await expect(readdir(workspace.inboxDir)).resolves.toContain('course.pdf');
});

test('reuses an existing managed workspace when inbox already exists', async () => {
  const root = await mkdtemp(join(tmpdir(), 'abet-workspace-managed-'));
  await mkdir(join(root, 'inbox'), { recursive: true });

  const workspace = await resolveWorkspace(root);

  expect(workspace.inboxDir).toBe(join(root, 'inbox'));
  await expect(readdir(root)).resolves.toEqual(
    expect.arrayContaining(['catalog', 'exports', 'inbox', 'logs', 'runs']),
  );
});

test('moves PLO csv files into catalog/plo when adopting a workspace', async () => {
  const root = await mkdtemp(join(tmpdir(), 'abet-workspace-plo-'));
  await writeFile(
    join(root, 'math_and_as_plos.csv'),
    [
      'plo_code,plo_label,plo_description,program_code',
      '1,SO1,Desc,MATH',
    ].join('\n'),
    'utf8',
  );

  const workspace = await resolveWorkspace(root);

  await expect(readdir(workspace.ploDir)).resolves.toContain('math_and_as_plos.csv');
  await expect(readdir(root)).resolves.not.toContain('math_and_as_plos.csv');
});
