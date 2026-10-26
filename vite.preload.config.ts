import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  build: {
    outDir: 'dist/preload',
    lib: {
      entry: 'src/preload/index.ts',
      formats: ['cjs'],
      fileName: 'index.cjs',
    },
    rollupOptions: {
      external: ['electron'],
      output: {
        entryFileNames: 'index.cjs',
      },
    },
    target: 'node20',
    minify: true,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})