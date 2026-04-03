import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '.cli-dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/cli/batchGenerate.ts',
      formats: ['cjs'],
      fileName: () => 'batchGenerate.cjs',
    },
    minify: false,
    target: 'node20',
    rollupOptions: {
      external: [
        'jsdom',
        ...builtinModules,
        ...builtinModules.map((moduleName) => `node:${moduleName}`),
      ],
    },
  },
});
