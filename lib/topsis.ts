export interface TopsisResult {
  weighted: number[][];
  idealPositive: number[];
  idealNegative: number[];
  dPlus: number[];
  dMinus: number[];
  closeness: number[];
  rank: number[];
}

export function normalizeWeights(weights: number[]): number[] {
  if (weights.some((w) => !Number.isFinite(w) || w < 0)) {
    throw new Error('Bobot harus angka tidak negatif');
  }
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) throw new Error('Total bobot harus lebih dari nol');
  return weights.map((w) => w / total);
}

export function topsis(matrix: number[][], weights: number[], isCost: boolean[]): TopsisResult {
  const m = matrix.length;
  const n = weights.length;
  if (m === 0) throw new Error('Alternatif kosong');
  if (matrix.some((row) => row.length !== n) || isCost.length !== n) {
    throw new Error('Dimensi matriks, bobot, dan jenis kriteria tidak sama');
  }

  const norms = Array.from({ length: n }, (_, j) =>
    Math.sqrt(matrix.reduce((s, row) => s + row[j] * row[j], 0)),
  );
  const weighted = matrix.map((row) => row.map((v, j) => (norms[j] === 0 ? 0 : v / norms[j]) * weights[j]));

  const idealPositive = Array.from({ length: n }, (_, j) => {
    const col = weighted.map((r) => r[j]);
    return isCost[j] ? Math.min(...col) : Math.max(...col);
  });
  const idealNegative = Array.from({ length: n }, (_, j) => {
    const col = weighted.map((r) => r[j]);
    return isCost[j] ? Math.max(...col) : Math.min(...col);
  });

  const dist = (row: number[], ideal: number[]) =>
    Math.sqrt(row.reduce((s, v, j) => s + (v - ideal[j]) ** 2, 0));
  const dPlus = weighted.map((r) => dist(r, idealPositive));
  const dMinus = weighted.map((r) => dist(r, idealNegative));
  const closeness = dPlus.map((dp, i) => (dp + dMinus[i] === 0 ? 0 : dMinus[i] / (dp + dMinus[i])));
  const rank = closeness.map((v) => 1 + closeness.filter((o) => o > v).length);

  return { weighted, idealPositive, idealNegative, dPlus, dMinus, closeness, rank };
}
