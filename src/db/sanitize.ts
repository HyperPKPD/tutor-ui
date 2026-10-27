import type { PopState } from '../components/simulator/types';
import type { ErPop } from '../er/erTypes';

export const bool = (raw: unknown, fb: boolean): boolean => (typeof raw === 'boolean' ? raw : fb);

export const num = (min = -Infinity, max = Infinity) => (raw: unknown, fb: number): number =>
  typeof raw === 'number' && Number.isFinite(raw) && raw >= min && raw <= max ? raw : fb;

export const oneOf = <T extends string>(allowed: readonly T[]) => (raw: unknown, fb: T): T =>
  typeof raw === 'string' && (allowed as readonly string[]).includes(raw) ? (raw as T) : fb;

/** Merge stored populations onto defaults field-by-field, keeping only values of the right type. */
export function pops(raw: unknown, fb: PopState[]): PopState[] {
  if (!Array.isArray(raw)) return fb;
  return fb.map((def, i) => {
    const src = (raw[i] ?? {}) as Record<string, unknown>;
    const out: Record<string, unknown> = { ...def };
    for (const k of Object.keys(def) as (keyof PopState)[]) {
      const v = src[k];
      if (typeof v === typeof def[k] && (typeof v !== 'number' || Number.isFinite(v))) out[k] = v;
    }
    // integer / positivity guards for values the engine divides by or loops over
    const p = out as unknown as PopState;
    p.numDoses = Math.max(1, Math.round(p.numDoses));
    p.tauHours = Math.max(1, Math.round(p.tauHours));
    // parameters the engine divides by must stay strictly positive
    for (const k of ['clearance', 'volume', 'volume2', 'volume3', 'halfLife', 'ka', 'mw', 'kon', 'kdeg'] as const) {
      if (!(p[k] > 0)) p[k] = def[k];
    }
    for (const k of ['intercompCl', 'intercompCl3', 'koff', 'kint', 'r0', 'doseMg'] as const) {
      if (!(p[k] >= 0)) p[k] = def[k];
    }
    return p;
  });
}

export function visible(raw: unknown, fb: boolean[]): boolean[] {
  if (!Array.isArray(raw) || raw.length !== fb.length || !raw.every((v) => typeof v === 'boolean')) return fb;
  return raw.some(Boolean) ? (raw as boolean[]) : fb;
}

export const index = (count: number) => (raw: unknown, fb: number): number =>
  typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 && raw < count ? raw : fb;

export interface ZoomRange { xMin: number; xMax: number; yMin: number; yMax: number }
export function zoom(raw: unknown, fb: ZoomRange | null): ZoomRange | null {
  if (raw === null) return null;
  const r = raw as Partial<ZoomRange>;
  const ok = r && [r.xMin, r.xMax, r.yMin, r.yMax].every((v) => typeof v === 'number' && Number.isFinite(v));
  return ok && r.xMax! > r.xMin! && r.yMax! > r.yMin! ? (r as ZoomRange) : fb;
}

/** Merge stored ER parameter sets onto defaults field-by-field, keeping only values of the right type. */
export function erPops(raw: unknown, fb: ErPop[]): ErPop[] {
  if (!Array.isArray(raw)) return fb;
  return fb.map((def, i) => {
    const src = (raw[i] ?? {}) as Record<string, unknown>;
    const out: Record<string, unknown> = { ...def };
    for (const k of Object.keys(def) as (keyof ErPop)[]) {
      const v = src[k];
      if (typeof v === typeof def[k] && (typeof v !== 'number' || Number.isFinite(v))) out[k] = v;
    }
    const p = out as unknown as ErPop;
    if (p.logBase !== 'ln' && p.logBase !== 'log10') p.logBase = def.logBase;
    if (!['manual', 'cavg', 'cmax', 'cmin'].includes(p.exposureSource)) p.exposureSource = def.exposureSource;
    // parameters the maths divides by or raises to a power must stay positive
    p.ec50 = p.ec50 > 0 ? p.ec50 : def.ec50;
    p.gamma = p.gamma > 0 ? p.gamma : def.gamma;
    p.cManual = p.cManual > 0 ? p.cManual : def.cManual;
    p.ct = p.ct >= 0 ? p.ct : def.ct;
    p.betaLog = p.betaLog > 0 ? p.betaLog : def.betaLog;
    p.beta = p.beta > 0 ? p.beta : def.beta;
    p.emax = p.emax > 0 ? p.emax : def.emax;
    return p;
  });
}

export interface DownloadOpts { widthIn: number; heightIn: number; dpi: number; title: boolean; transparent: boolean }
export function downloadOpts(raw: unknown, fb: DownloadOpts): DownloadOpts {
  const r = (raw ?? {}) as Record<string, unknown>;
  const n = (v: unknown, lo: number, hi: number, d: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : d;
  return {
    widthIn: n(r.widthIn, 1, 20, fb.widthIn),
    heightIn: n(r.heightIn, 1, 20, fb.heightIn),
    dpi: n(r.dpi, 72, 600, fb.dpi),
    title: typeof r.title === 'boolean' ? r.title : fb.title,
    transparent: typeof r.transparent === 'boolean' ? r.transparent : fb.transparent,
  };
}

export const hexColor = (raw: unknown, fb: string): string =>
  typeof raw === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw) ? raw.toLowerCase() : fb;
