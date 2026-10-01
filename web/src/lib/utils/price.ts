/** Rounds a VND amount to the nearest thousand (52794.36 -> 53000). */
export function roundVnd(value: number): number {
  return Math.round(value / 1000) * 1000;
}

/** Formats a VND amount rounded to the nearest thousand, e.g. "53.000". */
export function formatVnd(value: number): string {
  return roundVnd(value).toLocaleString('vi-VN');
}
