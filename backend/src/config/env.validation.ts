/**
 * Validación ligera de variables de entorno críticas en el arranque.
 * Evita levantar la app con secretos por defecto en producción.
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const isProd = config.NODE_ENV === 'production';

  if (isProd) {
    for (const key of required) {
      if (!config[key]) {
        throw new Error(`[ENV] La variable requerida "${key}" no está definida en producción.`);
      }
    }
    const weakSecrets = ['super_secret_access_change_me', 'super_secret_refresh_change_me'];
    if (
      weakSecrets.includes(String(config.JWT_ACCESS_SECRET)) ||
      weakSecrets.includes(String(config.JWT_REFRESH_SECRET))
    ) {
      throw new Error('[ENV] Debes cambiar los secretos JWT por defecto en producción.');
    }
  }

  return config;
}
