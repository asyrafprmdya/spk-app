import { ahp } from "./data";
import type { Segment } from "./types";

const RI = [0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];
export const CR_LIMIT = 0.1;
export const SAATY = [9, 8, 7, 6, 5, 4, 3, 2, 1, 1 / 2, 1 / 3, 1 / 4, 1 / 5, 1 / 6, 1 / 7, 1 / 8, 1 / 9];
export const N = ahp.criteria.length;
export const PAIRS: [number, number][] = [];
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) PAIRS.push([i, j]);
export const EQUAL = PAIRS.map(() => 1);

export const snap = (v: number) =>
  SAATY.reduce((b, s) => (Math.abs(Math.log(s / v)) < Math.abs(Math.log(b / v)) ? s : b), SAATY[0]);

export function toMatrix(pairs: number[]): number[][] {
  const m = Array.from({ length: N }, () => Array<number>(N).fill(1));
  PAIRS.forEach(([i, j], k) => {
    m[i][j] = pairs[k];
    m[j][i] = 1 / pairs[k];
  });
  return m;
}

export function analyze(pairs: number[]) {
  const m = toMatrix(pairs);
  let w = Array<number>(N).fill(1 / N);
  for (let it = 0; it < 200; it++) {
    const y = m.map((r) => r.reduce((s, a, j) => s + a * w[j], 0));
    const t = y.reduce((a, b) => a + b, 0);
    w = y.map((v) => v / t);
  }
  const aw = m.map((r) => r.reduce((s, a, j) => s + a * w[j], 0));
  const lambdaMax = aw.reduce((s, v, i) => s + v / w[i], 0) / N;
  const ci = Math.max(0, (lambdaMax - N) / (N - 1));
  const cr = RI[N] ? ci / RI[N] : 0;
  let worst = 0;
  let wv = -1;
  PAIRS.forEach(([i, j], k) => {
    const e = Math.abs(Math.log(pairs[k] / (w[i] / w[j])));
    if (e > wv) {
      wv = e;
      worst = k;
    }
  });
  const [wi, wj] = PAIRS[worst];
  return { weights: w, lambdaMax, ci, cr, consistent: cr <= CR_LIMIT, worst: { k: worst, i: wi, j: wj, suggest: snap(w[wi] / w[wj]) } };
}

export const TEMPLATES = (["Budget", "Mid-range", "Flagship"] as Segment[]).map((s) => ({
  id: s,
  pairs: PAIRS.map(([i, j]) => snap((ahp.segments[s] as unknown as { matrix: number[][] }).matrix[i][j])),
}));
