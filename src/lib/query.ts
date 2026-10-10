// Penyiapan masukan untuk filter PostgREST dan parameter URL.

/** Karakter yang bisa merusak sintaks filter PostgREST dibuang dari kata kunci pencarian. */
export const bersihkanKataKunci = (teks: string | null | undefined): string =>
  String(teks ?? '').replace(/[(),*%\\]/g, ' ').trim()

/** Offset paginasi dari parameter URL: tidak pernah negatif atau NaN. */
export function parseOffset(value: string | null): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0
}
