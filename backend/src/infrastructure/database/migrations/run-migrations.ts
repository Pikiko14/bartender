import { Logger } from '@nestjs/common';
import { runSpotifySupportMigration } from './001-add-spotify-support.migration';

type MigrationFn = (logger: Logger) => Promise<void>;

/** Migraciones idempotentes — se ejecutan en cada deploy. */
const MIGRATIONS: Array<{ name: string; run: MigrationFn }> = [
  { name: '001-add-spotify-support', run: runSpotifySupportMigration },
];

export async function runMigrations(logger = new Logger('Migrations')): Promise<void> {
  if (!process.env.MONGO_URI) {
    logger.warn('MONGO_URI no definida — migraciones omitidas');
    return;
  }

  logger.log(`Ejecutando ${MIGRATIONS.length} migración(es)…`);
  for (const migration of MIGRATIONS) {
    try {
      await migration.run(logger);
    } catch (err) {
      logger.error(`Migración ${migration.name} falló`, err instanceof Error ? err.stack : err);
      throw err;
    }
  }
  logger.log('Migraciones completadas');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Migrations] Error:', err);
      process.exit(1);
    });
}
