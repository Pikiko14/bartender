/** Utilidades para compartir la pantalla DJ en Meet/Teams (ventana dedicada). */
export function djShareUrl(businessSlug: string, tv = false): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const q = tv ? '?tv=1' : '';
  return `${base}/b/${businessSlug}/dj${q}`;
}

/** URL del modo TV con reproductor de video sincronizado (recomendado). */
export function djTvUrl(businessSlug: string): string {
  return djShareUrl(businessSlug, true);
}

/** URL del modo TV espejo WebRTC (opcional; YouTube puede verse negro). */
export function djTvCastUrl(businessSlug: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/b/${businessSlug}/dj?tv=1&cast=1`;
}

export function openDjShareWindow(businessSlug: string): Window | null {
  const url = djShareUrl(businessSlug);
  return window.open(
    url,
    'bartender-dj-display',
    'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no,resizable=yes',
  );
}

export async function copyDjShareUrl(businessSlug: string, tv = false): Promise<boolean> {
  const url = djShareUrl(businessSlug, tv);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
