import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '.cli-dist',
    emptyOutDir: false,
    ssr: 'src/cli/queryCatalog.ts',
    minify: false,
    target: 'node20',
    rollupOptions: {
      external: [
        'jsdom',
        ...builtinModules,
        ...builtinModules.map((moduleName) => `node:${moduleName}`),
      ],
      output: {
        entryFileNames: 'queryCatalog.cjs',
        format: 'cjs',
      },
    },
  },
});
