/** Convierte rutas relativas del backend (/uploads/...) en URL accesible. */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const apiUrl = import.meta.env.VITE_API_URL || '';
  const normalized = path.startsWith('/uploads/')
    ? path.slice('/uploads/'.length)
    : path.replace(/^\//, '');

  return `${apiUrl}/api/uploads/${normalized}`;
}
