const CATEGORY_ICONS: Record<string, string> = {
  bebidas: '🍹',
  comida: '🍔',
  postres: '🍰',
  promociones: '⭐',
};

export function categoryIcon(type: string): string {
  return CATEGORY_ICONS[type] ?? '🍽️';
}
