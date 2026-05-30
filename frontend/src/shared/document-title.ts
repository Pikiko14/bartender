const APP_NAME = 'Bartender';

/** Actualiza el título de la pestaña del navegador. */
export function setDocumentTitle(pageTitle?: string): void {
  document.title = pageTitle ? `${pageTitle} · ${APP_NAME}` : APP_NAME;
}

/** Título de la ruta activa (meta.title del registro más específico). */
export function titleFromRoute(
  matched: Array<{ meta: Record<string, unknown> }>,
): string | undefined {
  for (let i = matched.length - 1; i >= 0; i -= 1) {
    const title = matched[i]?.meta.title;
    if (typeof title === 'string' && title.trim()) return title;
  }
  return undefined;
}
