/**
 * Tareas de base de datos antes de arrancar la app (Railway / Docker).
 * - Migraciones idempotentes
 * - Seed demo (omitido si ya existe owner@bartender.app)
 */
import { Logger } from '@nestjs/common';
import { runMigrations } from './migrations/run-migrations';
import { runSeed } from './seeds/run-seed';

export async function runDeploySetup(logger = new Logger('DeploySetup')): Promise<void> {
  if (process.env.SKIP_DEPLOY_SETUP === '1' || process.env.SKIP_DEPLOY_SETUP === 'true') {
    logger.warn('SKIP_DEPLOY_SETUP activo — migraciones y seed omitidos');
    return;
  }

  logger.log('Iniciando setup de base de datos…');
  await runMigrations(logger);
  await runSeed(logger);
  logger.log('Setup de base de datos finalizado');
}

if (require.main === module) {
  runDeploySetup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[DeploySetup] Error:', err);
      process.exit(1);
    });
}
