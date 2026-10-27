// Variants come back in insertion order, so a product could list its sizes as "42 43 40 41".
// Shoppers expect size pickers in size order: letter sizes XS → 4XL, numeric sizes ascending
// (shoe sizes, kids' heights such as 100 / 110), anything else alphabetically at the end.

const LETTER_RANK: Record<string, number> = {
  XXS: 0, XS: 1, S: 2, M: 3, L: 4, XL: 5, XXL: 6, '2XL': 6, XXXL: 7, '3XL': 7, '4XL': 8, '5XL': 9,
};

function sizeKey(size: string): [number, number, string] {
  const s = size.trim().toUpperCase();
  if (s in LETTER_RANK) return [0, LETTER_RANK[s], s];
  const n = parseFloat(s.replace(',', '.'));
  if (Number.isFinite(n)) return [1, n, s];
  return [2, 0, s];
}

export function compareSizes(a: string, b: string): number {
  const [ga, va, sa] = sizeKey(a);
  const [gb, vb, sb] = sizeKey(b);
  return ga - gb || va - vb || sa.localeCompare(sb);
}

export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort(compareSizes);
}

