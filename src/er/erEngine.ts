import type { ErModel, ErPop } from './erTypes';

const LN10 = Math.LN10;

/** Effect E(C). Returns NaN where the model is undefined (log-linear for C <= 0). */
export function effectAt(model: ErModel, p: ErPop, C: number): number {
  switch (model) {
    case 'linear':
      return p.e0 + p.beta * C;
    case 'loglinear':
      if (!(C > 0)) return NaN;
      return p.logE1 + p.betaLog * (p.logBase === 'ln' ? Math.log(C) : Math.log10(C));
    case 'emax':
      return p.e0 + (p.emax * C) / (p.ec50 + C);
    case 'sigmoid': {
      if (C <= 0) return p.e0;
      const r = Math.pow(C / p.ec50, p.gamma); // (C/EC50)^gamma, stable for large C
      return Number.isFinite(r) ? p.e0 + (p.emax * r) / (1 + r) : p.e0 + p.emax;
    }
    case 'hockey':
      return C <= p.ct ? p.e0 : p.e0 + p.beta * (C - p.ct);
  }
}

/** Analytical derivative dE/dC. */
export function slopeAt(model: ErModel, p: ErPop, C: number): number {
  switch (model) {
    case 'linear':
      return p.beta;
    case 'loglinear':
      return C > 0 ? p.betaLog / (C * (p.logBase === 'ln' ? 1 : LN10)) : Infinity;
    case 'emax':
      return (p.emax * p.ec50) / ((p.ec50 + C) * (p.ec50 + C));
    case 'sigmoid': {
      if (C <= 0) return p.gamma === 1 ? p.emax / p.ec50 : p.gamma > 1 ? 0 : Infinity;
      const r = Math.pow(C / p.ec50, p.gamma);
      return Number.isFinite(r) ? ((p.emax * p.gamma) / C) * (r / ((1 + r) * (1 + r))) : 0;
    }
    case 'hockey':
      return C > p.ct ? p.beta : 0;
  }
}

export type InverseResult =
  | { kind: 'value'; c: number }
  | { kind: 'atMost'; c: number } // hockey-stick at baseline: any C <= Ct
  | { kind: 'none'; reason: string };

/** Concentration needed to reach effect T. */
export function concForEffect(model: ErModel, p: ErPop, T: number): InverseResult {
  const x = T - p.e0;
  switch (model) {
    case 'linear':
      if (!(p.beta > 0)) return { kind: 'none', reason: 'slope ≤ 0' };
      return x < 0 ? { kind: 'none', reason: 'below baseline' } : { kind: 'value', c: x / p.beta };
    case 'loglinear': {
      if (!(p.betaLog > 0)) return { kind: 'none', reason: 'slope ≤ 0' };
      const e = (T - p.logE1) / p.betaLog;
      return { kind: 'value', c: Math.pow(p.logBase === 'ln' ? Math.E : 10, e) };
    }
    case 'emax':
      if (x < 0) return { kind: 'none', reason: 'below baseline' };
      if (x >= p.emax) return { kind: 'none', reason: 'above E0 + Emax' };
      return { kind: 'value', c: (p.ec50 * x) / (p.emax - x) };
    case 'sigmoid':
      if (x < 0) return { kind: 'none', reason: 'below baseline' };
      if (x >= p.emax) return { kind: 'none', reason: 'above E0 + Emax' };
      return { kind: 'value', c: p.ec50 * Math.pow(x / (p.emax - x), 1 / p.gamma) };
    case 'hockey':
      if (x < 0) return { kind: 'none', reason: 'below baseline' };
      if (x === 0) return { kind: 'atMost', c: p.ct };
      return p.beta > 0 ? { kind: 'value', c: p.ct + x / p.beta } : { kind: 'none', reason: 'slope ≤ 0' };
  }
}

/** Concentration giving fraction f (0–1) of Emax above baseline (Emax / sigmoidal Emax). EC10, EC90 … */
export function ecFraction(p: ErPop, f: number, gamma = p.gamma): number {
  return p.ec50 * Math.pow(f / (1 - f), 1 / gamma);
}

export const hasPlateau = (m: ErModel) => m === 'emax' || m === 'sigmoid';
export const hasBaseline = (m: ErModel) => m !== 'loglinear';

export interface ErMetrics {
  cRef: number;
  effect: number;
  deltaFromBaseline: number | null; // E(Cref) − E0
  pctOfEmax: number | null;
  slope: number;
  deltaPerDoubling: number;
  inverse: InverseResult;
}

export function computeMetrics(model: ErModel, p: ErPop, cRef: number): ErMetrics {
  const effect = effectAt(model, p, cRef);
  return {
    cRef,
    effect,
    deltaFromBaseline: hasBaseline(model) ? effect - p.e0 : null,
    pctOfEmax: hasPlateau(model) ? ((effect - p.e0) / p.emax) * 100 : null,
    slope: slopeAt(model, p, cRef),
    deltaPerDoubling: effectAt(model, p, 2 * cRef) - effect,
    inverse: concForEffect(model, p, p.targetEffect),
  };
}

/** Sample the curve; log-spaced or linear-spaced, with the hockey-stick kink inserted exactly. */
export function sampleCurve(
  model: ErModel, p: ErPop, xMin: number, xMax: number, log: boolean, n: number
): { x: number[]; y: number[] } {
  const lo = Math.max(xMin, 1e-9);
  const xs: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    xs.push(log ? lo * Math.pow(xMax / lo, t) : xMin + (xMax - xMin) * t);
  }
  if (model === 'hockey' && p.ct > xMin && p.ct < xMax) {
    xs.push(p.ct);
    xs.sort((a, b) => a - b);
  }
  const x = xs.map((v) => (model === 'loglinear' ? Math.max(v, 1e-9) : v));
  return { x, y: x.map((c) => effectAt(model, p, c)) };
}
