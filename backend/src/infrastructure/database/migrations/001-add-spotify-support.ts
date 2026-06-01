/**
 * CLI dev: npm run migrate:spotify
 * En producción las migraciones corren vía deploy-setup en cada deploy.
 */
import { Logger } from '@nestjs/common';
import { runSpotifySupportMigration } from './001-add-spotify-support.migration';

const logger = new Logger('migrate:spotify');

runSpotifySupportMigration(logger)
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Error:', err);
    process.exit(1);
  });
