import { ahp, modelParams, phones } from "./data";
import { predictSegment } from "./predict";
import type { Prediction } from "./predict";
import { normalizeWeights, topsis } from "./topsis";
import { ranges } from "./data";
import type { Bounds, PhoneInput, Segment } from "./types";

export interface UserAlt {
  uid: string;
  name: string;
  srcId: number | null;
  input: PhoneInput;
}

export interface Row {
  key: string;
  uid: string | null;
  name: string;
  sub: string;
  closeness: number;
  rank: number;
}

const mm = (v: number, b: Bounds) => (v - b.min) / (b.max - b.min);

function userValues(i: PhoneInput): number[] {
  const r = ranges.minmaxReference;
  const n = (x: unknown) => x as number;
  const c5 = (mm(n(i.ppi), r.ppi) + mm(n(i.refreshRate), r.refreshRate)) / 2;
  const c6 = (mm(n(i.cpu), r.cpu) + mm(n(i.gpu), r.gpu)) / 2;
  return [n(i.ram), n(i.storage), n(i.battery), n(i.camera), c5, c6, n(i.price)];
}

export function predictAlt(a: UserAlt): Prediction {
  return predictSegment(a.input, modelParams);
}

export function rankPool(alts: UserAlt[], segment: Segment, weights: number[]): Row[] {
  const skip = new Set(alts.map((a) => a.srcId).filter((x): x is number => x !== null));
  const pool = phones.filter((p) => p.segment === segment && p.price !== null && !skip.has(p.id));
  const rows = [
    ...pool.map((p) => {
      const rec = p as unknown as Record<string, number>;
      return {
        key: `p${p.id}`,
        uid: null as string | null,
        name: `${p.brand} ${p.ram}/${p.storage}`,
        sub: `${p.battery} mAh, ${p.camera} MP, $${Math.round(p.price as number)}`,
        v: ahp.criteria.map((c) => rec[c.field]),
      };
    }),
    ...alts.map((a) => ({
      key: `u${a.uid}`,
      uid: a.uid as string | null,
      name: a.name,
      sub: `${a.input.ram}/${a.input.storage}, ${a.input.battery} mAh, $${a.input.price}`,
      v: userValues(a.input),
    })),
  ];
  const res = topsis(
    rows.map((r) => r.v),
    normalizeWeights(weights),
    ahp.criteria.map((c) => c.type === "cost"),
  );
  return rows
    .map((r, i) => ({ key: r.key, uid: r.uid, name: r.name, sub: r.sub, closeness: res.closeness[i], rank: 0 }))
    .sort((a, b) => b.closeness - a.closeness)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
