export const SEGMENTS = ['Budget', 'Mid-range', 'Flagship'] as const;
export type Segment = (typeof SEGMENTS)[number];

export const FEATURE_KEYS = [
  'ram',
  'storage',
  'battery',
  'charge',
  'camera',
  'frontCamera',
  'displaySize',
  'ppi',
  'refreshRate',
  'cpu',
  'gpu',
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type FeatureInput = Partial<Record<FeatureKey, number | null>>;
export type PhoneInput = FeatureInput & { price: number };

export interface ForestTree {
  f: number[];
  t: number[];
  l: number[];
  r: number[];
  v: number[][];
}

export interface ModelParams {
  meta: Record<string, unknown>;
  classes: Segment[];
  features: FeatureKey[];
  featureLabels: Record<string, string>;
  median: number[];
  forest: ForestTree[];
}

export interface Criterion {
  code: string;
  field: 'ram' | 'storage' | 'battery' | 'camera' | 'c5' | 'c6' | 'price';
  name: string;
  unit: string;
  type: 'benefit' | 'cost';
}

export interface AhpSegment {
  matrix: number[][];
  weights: number[];
  lambdaMax: number;
  ci: number;
  cr: number;
  consistent: boolean;
}

export interface AhpData {
  source: string;
  randomIndex: number;
  criteria: Criterion[];
  segments: Record<Segment, AhpSegment>;
  single: { weights: number[]; definition: string };
}

export interface Bounds {
  min: number;
  max: number;
}

export interface RangesData {
  minmaxReference: { basis: string; ppi: Bounds; refreshRate: Bounds; cpu: Bounds; gpu: Bounds };
  inputBounds: Record<FeatureKey | 'price', Bounds>;
}

export interface Phone {
  id: number;
  brand: string;
  name: string;
  label: string;
  segment: Segment;
  ram: number;
  storage: number;
  battery: number;
  charge: number | null;
  camera: number;
  frontCamera: number;
  displaySize: number;
  ppi: number;
  refreshRate: number;
  cpu: number;
  gpu: number;
  price: number | null;
  c5: number;
  c6: number;
  displayType: string;
  weight: number;
  fiveG: boolean | null;
  wirelessCharging: boolean;
  split: 'train' | 'test';
}
