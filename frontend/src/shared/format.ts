/** Moneda por defecto del producto (Colombia). */
export const CURRENCY_CODE = 'COP';
export const CURRENCY_LOCALE = 'es-CO';

export function formatMoney(value: number): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: 'currency',
    currency: CURRENCY_CODE,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}
