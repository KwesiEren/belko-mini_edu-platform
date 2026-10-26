import { defineConfig } from 'vite'
import { builtinModules } from 'node:module'
import path from 'node:path'

export default defineConfig({
  build: {
    outDir: 'dist/main',
    lib: {
      entry: 'src/main/index.ts',
      formats: ['cjs'],
      fileName: 'index.cjs',
    },
    rollupOptions: {
      external: (id) =>
        id === 'electron' ||
        id === 'better-sqlite3' ||
        id === 'argon2' ||
        id === 'sharp' ||
        id.startsWith('node:') ||
        builtinModules.includes(id),
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