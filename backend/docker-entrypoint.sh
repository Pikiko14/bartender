#!/bin/sh
set -e

echo "[entrypoint] Ejecutando migraciones y seed..."
node dist/infrastructure/database/deploy-setup.js

echo "[entrypoint] Iniciando aplicacion..."
exec "$@"
