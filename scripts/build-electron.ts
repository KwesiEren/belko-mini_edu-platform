import { build } from 'vite'
import path from 'node:path'

async function buildAll() {
  console.log('Building Electron main process...')
  await build({
    configFile: path.resolve(__dirname, 'vite.main.config.ts'),
    mode: 'production',
  })

  console.log('Building Electron preload script...')
  await build({
    configFile: path.resolve(__dirname, 'vite.preload.config.ts'),
    mode: 'production',
  })

  console.log('Building React renderer...')
  await build({
    configFile: path.resolve(__dirname, 'vite.config.ts'),
    mode: 'production',
    env: { BUILD_TARGET: 'electron' },
  })

  console.log('All builds completed!')
}

buildAll().catch((err) => {
  console.error('Build failed:', err)
  process.exit(1)
})