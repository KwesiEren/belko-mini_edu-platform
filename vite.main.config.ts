import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  build: {
    outDir: 'dist/main',
    lib: {
      entry: 'src/main/index.ts',
      formats: ['cjs'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['electron', 'better-sqlite3', 'argon2', 'sharp'],
      output: {
        entryFileNames: 'index.js',
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