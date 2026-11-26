import ahpJson from '../data/ahp.json';
import modelJson from '../data/model.json';
import phonesJson from '../data/phones.json';
import rangesJson from '../data/ranges.json';
import type { AhpData, ModelParams, Phone, RangesData } from './types';

export const modelParams = modelJson as unknown as ModelParams;
export const ahp = ahpJson as unknown as AhpData;
export const ranges = rangesJson as unknown as RangesData;
export const phones = phonesJson as unknown as Phone[];
