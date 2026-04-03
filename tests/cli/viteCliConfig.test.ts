import config from '../../vite.cli.config';

test('builds the CLI entry in SSR mode for Node-only modules', () => {
  expect(config.build?.ssr).toBe('src/cli/batchGenerate.ts');
  expect(config.build?.lib).toBeUndefined();
});
