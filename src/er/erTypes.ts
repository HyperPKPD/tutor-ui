export type ErModel = 'linear' | 'loglinear' | 'emax' | 'sigmoid' | 'hockey';
export type ExposureSource = 'manual' | 'cavg' | 'cmax' | 'cmin';
export type LogBase = 'ln' | 'log10';

/** Exposure–response parameters for one population. Every model's parameters are kept so switching models is lossless. */
export interface ErPop {
  /** Baseline effect at zero concentration (linear, Emax, sigmoidal Emax, hockey-stick). */
  e0: number;
  /** Slope: effect per unit concentration (linear) and slope above the threshold (hockey-stick). */
  beta: number;
  /** Log-linear intercept: effect at C = 1 (concentration units), where ln(C) = log10(C) = 0. */
  logE1: number;
  /** Log-linear slope: effect per unit of ln(C) or log10(C) (see logBase). */
  betaLog: number;
  logBase: LogBase;
  /** Maximum drug effect above baseline (Emax models). */
  emax: number;
  /** Concentration giving 50% of Emax (Emax models). */
  ec50: number;
  /** Hill coefficient (sigmoidal Emax). */
  gamma: number;
  /** Threshold concentration (hockey-stick). */
  ct: number;
  /** Which exposure is used as the reference exposure. */
  exposureSource: ExposureSource;
  /** Reference exposure when exposureSource = 'manual' (mg/L). */
  cManual: number;
  /** Effect level used for "concentration needed for target effect". */
  targetEffect: number;
}
