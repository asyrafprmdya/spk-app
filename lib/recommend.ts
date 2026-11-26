import { ahp, modelParams, phones, ranges } from './data';
import { predictSegment } from './predict';
import type { Prediction } from './predict';
import { normalizeWeights, topsis } from './topsis';
import type { Bounds, Criterion, FeatureKey, Phone, PhoneInput, Segment } from './types';
import { FEATURE_KEYS } from './types';

const REQUIRED_KEYS = ['ram', 'storage', 'battery', 'camera', 'ppi', 'refreshRate', 'cpu', 'gpu', 'price'] as const;
const OPTIONAL_KEYS: FeatureKey[] = ['charge', 'frontCamera', 'displaySize'];
const LABELS: Record<string, string> = { ...modelParams.featureLabels, price: 'Harga (USD)' };

export class InputError extends Error {
  errors: string[];

  constructor(errors: string[]) {
    super(errors.join('; '));
    this.name = 'InputError';
    this.errors = errors;
  }
}

interface Alternative {
  id: number | null;
  isInput: boolean;
  name: string;
  label: string;
  values: number[];
}

export interface RankedItem {
  id: number | null;
  isInput: boolean;
  name: string;
  label: string;
  closeness: number;
  rank: number;
  dPlus: number;
  dMinus: number;
  weighted: number[];
}

export interface SegmentRanking {
  segment: Segment;
  weights: number[];
  criteria: Criterion[];
  idealPositive: number[];
  idealNegative: number[];
  ranking: RankedItem[];
}

export interface RecommendResult extends SegmentRanking {
  probabilities: Prediction['probabilities'];
  margin: number;
  ambiguous: boolean;
  input: RankedItem;
  alternativeCount: number;
  warnings: string[];
}

function isMissing(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v));
}

function outsideBounds(value: number, b: Bounds): boolean {
  return value < b.min || value > b.max;
}

export function validateInput(input: PhoneInput): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const record = input as unknown as Record<string, unknown>;

  for (const key of REQUIRED_KEYS) {
    const v = record[key];
    if (isMissing(v)) {
      errors.push(`${LABELS[key]} wajib diisi`);
    } else if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
      errors.push(`${LABELS[key]} harus angka lebih dari 0`);
    }
  }
  for (const key of OPTIONAL_KEYS) {
    const v = record[key];
    if (isMissing(v)) continue;
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
      errors.push(`${LABELS[key]} harus angka lebih dari 0 atau dikosongkan`);
    }
  }
  if (errors.length > 0) return { errors, warnings };

  for (const key of [...FEATURE_KEYS, 'price'] as const) {
    const v = record[key];
    if (isMissing(v)) continue;
    const b = ranges.inputBounds[key];
    if (outsideBounds(v as number, b)) {
      warnings.push(`${LABELS[key]} (${v}) di luar rentang dataset (${b.min} sampai ${b.max})`);
    }
  }
  return { errors, warnings };
}

function minmax(value: number, b: Bounds): number {
  return (value - b.min) / (b.max - b.min);
}

function toValues(p: { [K in Criterion['field']]: number }): number[] {
  return ahp.criteria.map((c) => p[c.field]);
}

function datasetAlternatives(segment: Segment): Alternative[] {
  return phones
    .filter((p) => p.segment === segment && p.price !== null)
    .map((p) => ({
      id: p.id,
      isInput: false,
      name: p.name,
      label: p.label,
      values: toValues(p as unknown as { [K in Criterion['field']]: number }),
    }));
}

function rankAlternatives(alts: Alternative[], weights: number[]) {
  const isCost = ahp.criteria.map((c) => c.type === 'cost');
  const res = topsis(
    alts.map((a) => a.values),
    weights,
    isCost,
  );
  const ranking: RankedItem[] = alts.map((a, i) => ({
    id: a.id,
    isInput: a.isInput,
    name: a.name,
    label: a.label,
    closeness: res.closeness[i],
    rank: res.rank[i],
    dPlus: res.dPlus[i],
    dMinus: res.dMinus[i],
    weighted: res.weighted[i],
  }));
  ranking.sort(
    (a, b) =>
      b.closeness - a.closeness || Number(a.isInput) - Number(b.isInput) || (a.id ?? 0) - (b.id ?? 0),
  );
  return { ranking, idealPositive: res.idealPositive, idealNegative: res.idealNegative };
}

function resolveWeights(segment: Segment, custom?: number[]): number[] {
  if (!custom) return ahp.segments[segment].weights;
  if (custom.length !== ahp.criteria.length) {
    throw new InputError([`Bobot harus berjumlah ${ahp.criteria.length}`]);
  }
  return normalizeWeights(custom);
}

export function rankSegment(segment: Segment, customWeights?: number[]): SegmentRanking {
  const weights = resolveWeights(segment, customWeights);
  const { ranking, idealPositive, idealNegative } = rankAlternatives(datasetAlternatives(segment), weights);
  return { segment, weights, criteria: ahp.criteria, idealPositive, idealNegative, ranking };
}

export function recommend(input: PhoneInput, options: { weights?: number[] } = {}): RecommendResult {
  const { errors, warnings } = validateInput(input);
  if (errors.length > 0) throw new InputError(errors);

  const prediction = predictSegment(input, modelParams);
  const segment = prediction.segment;
  const weights = resolveWeights(segment, options.weights);

  const c5 = (minmax(input.ppi as number, ranges.minmaxReference.ppi) +
    minmax(input.refreshRate as number, ranges.minmaxReference.refreshRate)) / 2;
  const c6 = (minmax(input.cpu as number, ranges.minmaxReference.cpu) +
    minmax(input.gpu as number, ranges.minmaxReference.gpu)) / 2;

  const newAlt: Alternative = {
    id: null,
    isInput: true,
    name: 'Ponsel input',
    label: 'Ponsel input',
    values: toValues({
      ram: input.ram as number,
      storage: input.storage as number,
      battery: input.battery as number,
      camera: input.camera as number,
      c5,
      c6,
      price: input.price,
    }),
  };

  const alts = [...datasetAlternatives(segment), newAlt];
  const { ranking, idealPositive, idealNegative } = rankAlternatives(alts, weights);
  const inputItem = ranking.find((r) => r.isInput) as RankedItem;

  const allWarnings = [...warnings];
  prediction.imputed.forEach((key) => {
    const i = modelParams.features.indexOf(key);
    allWarnings.push(`${LABELS[key]} kosong, diisi median data latih (${modelParams.median[i]})`);
  });
  if (prediction.ambiguous) {
    allWarnings.push('Probabilitas segmen tipis, ponsel ini berada di wilayah tumpang tindih antarsegmen');
  }

  return {
    segment,
    weights,
    criteria: ahp.criteria,
    idealPositive,
    idealNegative,
    ranking,
    probabilities: prediction.probabilities,
    margin: prediction.margin,
    ambiguous: prediction.ambiguous,
    input: inputItem,
    alternativeCount: alts.length,
    warnings: allWarnings,
  };
}

export function getPhone(id: number): Phone {
  const phone = phones.find((p) => p.id === id);
  if (!phone) throw new InputError([`Ponsel dengan id ${id} tidak ditemukan`]);
  return phone;
}

export interface ComparisonItem {
  phone: Phone;
  ranked: boolean;
  rank: number | null;
  closeness: number | null;
  segmentSize: number | null;
}

export function comparePhones(ids: number[]): {
  comparable: boolean;
  segments: Segment[];
  items: ComparisonItem[];
} {
  const unique = [...new Set(ids)];
  if (unique.length < 2 || unique.length > 3) {
    throw new InputError(['Pilih 2 sampai 3 ponsel yang berbeda']);
  }
  const selected = unique.map(getPhone);
  const segments = [...new Set(selected.map((p) => p.segment))];
  const rankings = new Map<Segment, SegmentRanking>(segments.map((s) => [s, rankSegment(s)]));

  const items = selected.map((phone) => {
    const ranking = rankings.get(phone.segment) as SegmentRanking;
    const entry = ranking.ranking.find((r) => r.id === phone.id);
    return {
      phone,
      ranked: entry !== undefined,
      rank: entry ? entry.rank : null,
      closeness: entry ? entry.closeness : null,
      segmentSize: entry ? ranking.ranking.length : null,
    };
  });

  return { comparable: segments.length === 1, segments, items };
}
