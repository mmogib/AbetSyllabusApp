/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from 'vitest';

test('reserves scrollbar space so the centered app shell does not shift on upload', () => {
  const cssPath = resolve(process.cwd(), 'src/styles/app.css');
  const css = readFileSync(cssPath, 'utf8');

  expect(css).toMatch(/scrollbar-gutter:\s*stable/);
  expect(css).toMatch(/#root\s*\{[\s\S]*width:\s*100%/);
  expect(css).toMatch(/\.app-shell\s*\{[\s\S]*margin:\s*0 auto/);
  expect(css).not.toMatch(/place-items:\s*center/);
});
