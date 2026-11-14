export const MAX_RATING = 5;

export function nextRating(current: number, key: string): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return Math.min(MAX_RATING, Math.max(1, current + 1));
    case 'ArrowLeft':
    case 'ArrowDown':
      return Math.max(1, current - 1 || 1);
    case 'Home':
      return 1;
    case 'End':
      return MAX_RATING;
    default:
      return null;
  }
}
