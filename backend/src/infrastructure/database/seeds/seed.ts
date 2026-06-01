import { runSeed } from './run-seed';

runSeed().catch((err) => {
  console.error('Error en el seed:', err);
  process.exit(1);
});
