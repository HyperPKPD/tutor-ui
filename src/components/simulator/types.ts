import {
  BASE_POP_DEFAULTS, MAB_CL_SCALE, MAB_DEFAULTS, LN2, POP_COUNT, POP_DEFAULT_OVERRIDES,
} from '../../config/appConfig';

export type ModelType =
  | '3cmt_oral' | '2cmt_oral' | '1cmt_oral'
  | '3cmt_iv' | '2cmt_iv' | '1cmt_iv'
  | 'tmdd_1cmt' | 'tmdd_2cmt';
export type TmddRoute = 'iv' | 'sc';
export type TmddReadout = 'free' | 'total';

export interface PopState {
  // Regimen
  doseMg: number;
  tauHours: number;
  numDoses: number;
  // Linear PK (CL, V1, t1/2 are linked)
  clearance: number; // L/h
  volume: number; // L
  halfLife: number; // h
  ka: number; // 1/h
  intercompCl: number; // Q2 (central <-> peripheral 1), L/h
  volume2: number; // V2, L
  intercompCl3: number; // Q3 (central <-> peripheral 2, 3-compartment models), L/h
  volume3: number; // V3, L
  // Covariates
  useCovariateScaling: boolean;
  patientWt: number;
  patientCrcl: number;
  // Target window
  mec: number;
  mtc: number;
  // TMDD
  r0: number; // baseline free target, nM
  kdeg: number; // 1/h
  kon: number; // 1/(nM*h)
  koff: number; // 1/h
  kint: number; // 1/h
  mw: number; // kDa
}

export const isTmdd = (m: ModelType) => m === 'tmdd_1cmt' || m === 'tmdd_2cmt';
/** Number of peripheral compartments (0, 1 or 2). */
export const peripheralCount = (m: ModelType): 0 | 1 | 2 =>
  m === '3cmt_oral' || m === '3cmt_iv' ? 2 : m === '2cmt_oral' || m === '2cmt_iv' || m === 'tmdd_2cmt' ? 1 : 0;
/** First-order absorption from a gut depot (linear oral models). */
export const isOral = (m: ModelType) => m === '3cmt_oral' || m === '2cmt_oral' || m === '1cmt_oral';

/** Population 1 = standard, 2 = renal impaired, 3 = high clearance (see config). */
export function makeDefaultPops(): PopState[] {
  return Array.from({ length: POP_COUNT }, (_, i) => ({ ...BASE_POP_DEFAULTS, ...(POP_DEFAULT_OVERRIDES[i] ?? {}) }));
}

/** Monoclonal-antibody-like starting point; CL is scaled per population so the curves still differ. */
export function applyMabDefaults(p: PopState, popIndex: number): PopState {
  const cl = Number((MAB_DEFAULTS.clearance * (MAB_CL_SCALE[popIndex] ?? 1)).toPrecision(4));
  return { ...p, ...MAB_DEFAULTS, clearance: cl, halfLife: Number(((LN2 * MAB_DEFAULTS.volume) / cl).toFixed(2)) };
}
