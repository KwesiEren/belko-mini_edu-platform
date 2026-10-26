import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(projectRoot, 'dist-electron');

async function closeRunningApp() {
  if (process.platform !== 'win32') return;

  try {
    await execFileAsync('taskkill', ['/IM', 'Belko Edu-Platform.exe', '/T', '/F'], {
      windowsHide: true,
    });
    console.log('Closed running Belko Edu-Platform instances before packaging.');
  } catch (error) {
    // taskkill returns a nonzero status when there are no matching processes.
    if (error.code === 'ENOENT') throw error;
    if (error.code === 128 || String(error.stderr || error.stdout || '').toLowerCase().includes('not found')) return;
    throw new Error('Windows could not close Belko Edu-Platform. Run the build with the same permissions as the app.', {
      cause: error,
    });
  }
}

async function removeWithRetry(target) {
  try {
    await rm(target, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 1000,
    });
  } catch (error) {
    if (['EBUSY', 'EPERM', 'ENOTEMPTY'].includes(error.code)) {
      throw new Error(
        `Could not clear ${target}. Close Explorer windows or other processes using the build folder, then retry.`,
        { cause: error },
      );
    }
    throw error;
  }
}

await closeRunningApp();
// Give Windows time to release the executable, DLLs, and child processes.
await new Promise((resolve) => setTimeout(resolve, 1500));
await removeWithRetry(path.join(outputRoot, 'win-unpacked'));
await removeWithRetry(path.join(outputRoot, 'win-unpacked.tmp'));
console.log('Electron packaging output is clear.');
