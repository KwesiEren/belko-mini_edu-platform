import { initializeDatabase, closeDatabase } from './connection';
import { runMigrations, getMigrationStatus } from './migrations';
import pino from 'pino';

const logger = pino({ name: 'migrations-cli' });

async function main() {
  const command = process.argv[2] || 'run';

  initializeDatabase();

  try {
    if (command === 'status') {
      const status = getMigrationStatus();
      console.log('\nMigration Status:');
      console.log('------------------');
      for (const m of status) {
        console.log(`${m.applied ? '✓' : '○'} v${m.version}: ${m.name}`);
      }
      return;
    }

    if (command === 'run') {
      logger.info('Running migrations...');
      runMigrations();
      logger.info('Migrations completed successfully');
    }
  } catch (error) {
    logger.error({ error }, 'Migration failed');
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

main();