import type { FeatureInput, FeatureKey, ModelParams, Segment } from './types';

export const AMBIGUOUS_MARGIN = 0.15;

export interface Prediction {
  segment: Segment;
  probabilities: Record<Segment, number>;
  margin: number;
  ambiguous: boolean;
  imputed: FeatureKey[];
}

export function predictSegment(input: FeatureInput, model: ModelParams): Prediction {
  const imputed: FeatureKey[] = [];
  const x = model.features.map((key, i) => {
    const raw = input[key];
    if (raw === null || raw === undefined || (typeof raw === 'number' && Number.isNaN(raw))) {
      imputed.push(key);
      return model.median[i];
    }
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new Error(`Nilai ${key} bukan angka yang valid`);
    }
    return raw;
  });

  const probs = model.classes.map(() => 0);
  for (const tree of model.forest) {
    let n = 0;
    while (tree.l[n] !== -1) n = x[tree.f[n]] <= tree.t[n] ? tree.l[n] : tree.r[n];
    tree.v[n].forEach((pv, k) => {
      probs[k] += pv / model.forest.length;
    });
  }

  const probabilities = {} as Record<Segment, number>;
  model.classes.forEach((cls, k) => {
    probabilities[cls] = probs[k];
  });

  let best = 0;
  probs.forEach((p, k) => {
    if (p > probs[best]) best = k;
  });
  const sorted = [...probs].sort((a, b) => b - a);
  const margin = sorted[0] - sorted[1];

  return {
    segment: model.classes[best],
    probabilities,
    margin,
    ambiguous: margin < AMBIGUOUS_MARGIN,
    imputed,
  };
}
