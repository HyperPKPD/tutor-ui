import { COVARIATES as COV, SIM } from '../../config/appConfig';
import { isOral, peripheralCount, type ModelType, type PopState, type TmddReadout, type TmddRoute } from './types';

export interface EffectiveParams {
  cl: number;
  v1: number;
  v2: number;
  q: number;
  /** third compartment (3-compartment models) */
  v3: number;
  q3: number;
  ka: number;
}

export interface Grid {
  dt: number;
  times: number[];
}

export interface SimResult {
  concPoints: number[];
  // Steady-state metrics are computed at TRUE steady state (infinite dosing), independent of numDoses:
  // linear models analytically (superposition of an infinite dose train), TMDD by integrating dose after dose until converged.
  cmax_ss: number;
  cmin_ss: number;
  cavg_ss: number;
  auc_tau: number;
  rac: number;
  timeAboveMec: number;
  timeAboveMtc: number;
  /** TMDD only: minimum free target during the steady-state interval, % of baseline */
  rMinPct: number | null;
  /** AUC of the last simulated dosing interval as % of AUCτ,ss: how close the plotted regimen gets to steady state */
  lastIntervalPctSs: number;
  /** false if the TMDD steady-state search hit its step budget before converging (metrics are then approximate) */
  ssConverged: boolean;
}

export function getEffectiveParams(p: PopState): EffectiveParams {
  if (!p.useCovariateScaling) {
    return { cl: p.clearance, v1: p.volume, v2: p.volume2, q: p.intercompCl, v3: p.volume3, q3: p.intercompCl3, ka: p.ka };
  }
  const wtRatio = p.patientWt / COV.refWt;
  const crclRatio = p.patientCrcl / COV.refCrcl;
  return {
    cl: p.clearance * Math.pow(wtRatio, COV.clWtExponent) * Math.pow(crclRatio, COV.clCrclExponent),
    v1: p.volume * Math.pow(wtRatio, COV.vWtExponent),
    v2: p.volume2 * Math.pow(wtRatio, COV.vWtExponent),
    q: p.intercompCl * Math.pow(wtRatio, COV.qWtExponent),
    v3: p.volume3 * Math.pow(wtRatio, COV.vWtExponent),
    q3: p.intercompCl3 * Math.pow(wtRatio, COV.qWtExponent),
    ka: p.ka,
  };
}

/** Total simulated horizon for a population (last dose interval + washout tail). */
export function popDuration(p: PopState): number {
  return p.tauHours * p.numDoses + Math.max(SIM.minTailHours, p.tauHours);
}

/** Shared time grid. dt is always 0.25, 0.5 or 1 h so every dosing interval (integer hours) lands on the grid. */
export function makeGrid(maxDuration: number): Grid {
  const dt = SIM.gridSteps.find((g) => maxDuration <= g.maxDuration)?.dt ?? SIM.fallbackDt;
  const n = Math.floor(maxDuration / dt) + 1;
  const times = new Array<number>(n);
  for (let i = 0; i < n; i++) times[i] = i * dt;
  return { dt, times };
}

/** Keep two rate constants from being exactly equal (closed-form solutions are singular there). */
function nudge(k: number, others: number[]): number {
  let out = k;
  for (const o of others) {
    if (Math.abs(out - o) < 1e-6 * Math.max(1, o)) out = o * (1 + SIM.nudgeRelative) + 1e-6;
  }
  return out;
}

// ---------- Closed-form (superposition) models ----------
// Every linear model is a mamillary system (central compartment + 0, 1 or 2 peripheral compartments).
// The IV bolus response in the central compartment is a sum of exponentials:
//   C(t) = (Dose/V1) · Σ F_i · exp(-λ_i · t),   F_i = Π_p (k_p1 − λ_i) / Π_{j≠i} (λ_j − λ_i)
// where the λ_i are the roots of the characteristic polynomial and k_p1 are the peripheral-to-central rate constants.
// First-order absorption convolves this with ka·exp(-ka·t), which turns each term into
//   F_i · ka/(ka − λ_i) · [exp(-λ_i·t) − exp(-ka·t)].

export interface MacroRates {
  /** disposition exponents λ (1/h), largest first (α, β, γ) */
  lambdas: number[];
  /** dimensionless coefficients F_i (they sum to 1) */
  fractions: number[];
}

/** Real roots of x³ + b·x² + c·x + d = 0 (three real roots expected for a mamillary system), polished with Newton steps. */
function cubicRoots(b: number, c: number, d: number): number[] {
  const p = c - (b * b) / 3;
  const q = (2 * b * b * b) / 27 - (b * c) / 3 + d;
  let roots: number[];
  if (p >= -1e-12) {
    // (numerically) a triple root
    roots = [-b / 3, -b / 3, -b / 3];
  } else {
    const m = 2 * Math.sqrt(-p / 3);
    const arg = Math.max(-1, Math.min(1, ((3 * q) / (2 * p)) * Math.sqrt(-3 / p)));
    const th = Math.acos(arg) / 3;
    roots = [0, 1, 2].map((k) => m * Math.cos(th - (2 * Math.PI * k) / 3) - b / 3);
  }
  return roots.map((r) => {
    let x = r;
    for (let i = 0; i < 3; i++) {
      const f = ((x + b) * x + c) * x + d;
      const df = (3 * x + 2 * b) * x + c;
      if (df !== 0 && Number.isFinite(f / df)) x -= f / df;
    }
    return x;
  });
}

/** Keep exponents distinct (the closed form divides by their differences). */
function separate(sorted: number[]): number[] {
  const out = sorted.slice();
  for (let i = 1; i < out.length; i++) {
    const gap = 1e-7 * Math.max(1, out[i - 1]);
    if (out[i - 1] - out[i] < gap) out[i] = out[i - 1] - gap;
  }
  return out;
}

export function macroRates(nPeripheral: 0 | 1 | 2, eff: EffectiveParams): MacroRates {
  const k10 = eff.cl / eff.v1;
  if (nPeripheral === 0) return { lambdas: [k10], fractions: [1] };
  const k12 = eff.q / eff.v1, k21 = eff.q / eff.v2;
  if (nPeripheral === 1) {
    const b = k10 + k12 + k21;
    const disc = Math.sqrt(Math.max(0, b * b - 4 * k10 * k21));
    const [al, be] = separate([(b + disc) / 2, (b - disc) / 2]);
    return { lambdas: [al, be], fractions: [(k21 - al) / (be - al), (k21 - be) / (al - be)] };
  }
  const k13 = eff.q3 / eff.v1, k31 = eff.q3 / eff.v3;
  const a2 = k10 + k12 + k13 + k21 + k31;
  const a1 = k10 * k21 + k10 * k31 + k12 * k31 + k13 * k21 + k21 * k31;
  const a0 = k10 * k21 * k31;
  const lam = separate(cubicRoots(-a2, a1, -a0).sort((x, y) => y - x));
  const fractions = lam.map((li, i) => {
    let den = 1;
    lam.forEach((lj, j) => { if (j !== i) den *= lj - li; });
    return ((k21 - li) * (k31 - li)) / den;
  });
  return { lambdas: lam, fractions };
}

interface LinearTerms {
  lambdas: number[];
  /** coefficient (mg/L) of each exp(-λ_i t) term of a single dose */
  coef: number[];
  ka: number;
  /** coefficient of exp(-ka t) (oral only, else 0) */
  kaCoef: number;
  oral: boolean;
}

function linearTerms(p: PopState, model: ModelType, eff: EffectiveParams): LinearTerms {
  const oral = isOral(model);
  const { lambdas, fractions } = macroRates(peripheralCount(model), eff);
  const ka = nudge(eff.ka, lambdas);
  const scale = p.doseMg / eff.v1;
  const coef = fractions.map((f, i) => (oral ? (f * ka) / (ka - lambdas[i]) : f) * scale);
  const kaCoef = oral ? -coef.reduce((a, c) => a + c, 0) : 0;
  return { lambdas, coef, ka, kaCoef, oral };
}

/** Single-dose concentration at time ts >= 0 after the dose. */
function singleDose(T: LinearTerms, ts: number): number {
  let c = 0;
  for (let k = 0; k < T.lambdas.length; k++) c += T.coef[k] * Math.exp(-T.lambdas[k] * ts);
  if (T.oral) c += T.kaCoef * Math.exp(-T.ka * ts);
  return Math.max(0, c);
}

/**
 * True steady state of an infinite dose train (superposition summed as a geometric series):
 *   Css(t) = Σ A_i·exp(−λ_i·t) / (1 − exp(−λ_i·τ))  [+ the same for the Ka term],  0 ≤ t ≤ τ
 */
function steadyStateConc(T: LinearTerms, tau: number, t: number): number {
  let c = 0;
  for (let k = 0; k < T.lambdas.length; k++) c += (T.coef[k] * Math.exp(-T.lambdas[k] * t)) / -Math.expm1(-T.lambdas[k] * tau);
  if (T.oral) c += (T.kaCoef * Math.exp(-T.ka * t)) / -Math.expm1(-T.ka * tau);
  return Math.max(0, c);
}

function simulateLinear(p: PopState, T: LinearTerms, grid: Grid): number[] {
  const { tauHours, numDoses } = p;
  const out = new Array<number>(grid.times.length);
  for (let i = 0; i < grid.times.length; i++) {
    const t = grid.times[i];
    let conc = 0;
    for (let d = 0; d < numDoses; d++) {
      const ts = t - d * tauHours;
      if (ts < 0) break;
      conc += singleDose(T, ts);
    }
    out[i] = conc;
  }
  return out;
}

interface IntervalStats { cmax: number; cmin: number; auc: number; aboveMec: number; aboveMtc: number; rMin: number }

/** Summarise one dosing interval sampled at m+1 equally spaced points (index 0 = just after the dose, m = just before the next). */
function intervalStats(c: number[], dt: number, p: PopState, target?: number[]): IntervalStats {
  let cmax = -Infinity, cmin = Infinity, auc = 0, aboveMec = 0, aboveMtc = 0, rMin = Infinity;
  for (let i = 0; i < c.length; i++) {
    if (c[i] > cmax) cmax = c[i];
    if (c[i] < cmin) cmin = c[i];
    if (c[i] >= p.mec) aboveMec++;
    if (c[i] > p.mtc) aboveMtc++;
    if (i < c.length - 1) auc += ((c[i] + c[i + 1]) / 2) * dt;
    if (target && target[i] < rMin) rMin = target[i];
  }
  return { cmax, cmin, auc, aboveMec: aboveMec / c.length, aboveMtc: aboveMtc / c.length, rMin };
}

// ---------- Full TMDD (numerical, RK4) ----------
// States: L free drug (nM, central), Cp peripheral drug conc (nM), R free target (nM),
//         P drug-target complex (nM), Ag gut amount (nmol, SC only)
interface TmddStepper {
  y: number[];
  dose: () => void;
  /** advance by one output step dt */
  step: () => void;
  conc: () => number;
  /** RK4 sub-steps taken so far */
  substeps: number;
}

function makeTmdd(p: PopState, model: ModelType, eff: EffectiveParams, dt: number, route: TmddRoute, readout: TmddReadout): TmddStepper {
  const { cl, v1, v2, ka } = eff;
  const twoC = model === 'tmdd_2cmt';
  const q = twoC ? eff.q : 0;
  const kel = cl / v1;
  const k12 = q / v1;
  const k21 = q / v2;
  const { kon, koff, kint, kdeg, r0, mw } = p;
  const ksyn = r0 * kdeg;
  const sc = route === 'sc';
  const doseNmol = (p.doseMg * 1000) / mw;
  const toMgL = mw / 1000;

  // RK4 sub-step count is chosen before every output step from the CURRENT state (the fastest rate is
  // kon·(L + R) from binding, which grows as drug accumulates), so the integration stays stable and accurate.
  const linRate = koff + kint + kdeg + kel + k12 + k21 + (sc ? ka : 0);
  const subFor = (L: number, R: number) =>
    Math.max(SIM.rk4.minSubsteps, Math.min(SIM.rk4.maxSubsteps, Math.ceil((dt * (kon * (L + R) + linRate)) / SIM.rk4.stepRateFactor)));

  const y = [0, 0, r0, 0, 0];
  const f = (s: number[], o: number[]) => {
    const L = s[0], Cp = s[1], R = s[2], P = s[3], Ag = s[4];
    const bind = kon * L * R;
    o[0] = (sc ? (ka * Ag) / v1 : 0) - kel * L - k12 * (L - Cp) - bind + koff * P;
    o[1] = k21 * (L - Cp);
    o[2] = ksyn - kdeg * R - bind + koff * P;
    o[3] = bind - (koff + kint) * P;
    o[4] = -ka * Ag;
  };
  const k1 = [0, 0, 0, 0, 0], k2 = [0, 0, 0, 0, 0], k3 = [0, 0, 0, 0, 0], k4 = [0, 0, 0, 0, 0];
  const tmp = [0, 0, 0, 0, 0];
  const stepper: TmddStepper = {
    y,
    substeps: 0,
    dose: () => { if (sc) y[4] += doseNmol; else y[0] += doseNmol / v1; },
    conc: () => (readout === 'total' ? y[0] + y[3] : y[0]) * toMgL,
    step: () => {
      const nsub = subFor(y[0] + (sc ? (ka * y[4] * dt) / v1 : 0), y[2]);
      const h = dt / nsub;
      stepper.substeps += nsub;
      for (let s = 0; s < nsub; s++) {
        f(y, k1);
        for (let j = 0; j < 5; j++) tmp[j] = y[j] + 0.5 * h * k1[j];
        f(tmp, k2);
        for (let j = 0; j < 5; j++) tmp[j] = y[j] + 0.5 * h * k2[j];
        f(tmp, k3);
        for (let j = 0; j < 5; j++) tmp[j] = y[j] + h * k3[j];
        f(tmp, k4);
        for (let j = 0; j < 5; j++) {
          y[j] += (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
          if (y[j] < 0) y[j] = 0;
        }
      }
    },
  };
  return stepper;
}

function simulateTmdd(
  p: PopState, model: ModelType, eff: EffectiveParams, grid: Grid, route: TmddRoute, readout: TmddReadout
): number[] {
  const n = grid.times.length;
  const tauSteps = Math.round(p.tauHours / grid.dt);
  const sim = makeTmdd(p, model, eff, grid.dt, route, readout);
  const conc = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    if (i % tauSteps === 0 && i / tauSteps < p.numDoses) sim.dose();
    conc[i] = sim.conc();
    if (i < n - 1) sim.step();
  }
  return conc;
}

/**
 * TMDD steady state: keep dosing every τ until two consecutive intervals agree (AUC and trough within SIM.tmddSs.relTol),
 * then report that interval. Also returns the first interval (for the accumulation ratio).
 */
function tmddSteadyState(
  p: PopState, model: ModelType, eff: EffectiveParams, dt: number, route: TmddRoute, readout: TmddReadout
): { ss: IntervalStats; first: IntervalStats; converged: boolean } {
  const m = Math.max(1, Math.round(p.tauHours / dt));
  const sim = makeTmdd(p, model, eff, dt, route, readout);
  const maxIntervals = SIM.tmddSs.maxIntervals;
  let first: IntervalStats | null = null, prev: IntervalStats | null = null, cur: IntervalStats | null = null;
  let dPrev: number[] | null = null;
  const c = new Array<number>(m + 1), r = new Array<number>(m + 1);
  const tol = SIM.tmddSs.relTol;
  for (let k = 0; k < maxIntervals && (k < 2 || sim.substeps < SIM.tmddSs.maxRk4Steps); k++) {
    sim.dose();
    for (let j = 0; j <= m; j++) {
      c[j] = sim.conc();
      r[j] = sim.y[2];
      if (j < m) sim.step();
    }
    // c[m] is the trough just before the next dose (the next dose is added at the top of the loop)
    cur = intervalStats(c, dt, p, r);
    if (!first) first = intervalStats(c.slice(0, m), dt, p);
    if (prev) {
      // Approach to steady state is ~geometric: with successive changes d_k and ratio ρ = d_k/d_(k-1),
      // the change still to come is ≈ d_k·ρ/(1 − ρ). Stop when that is below tol for AUC, Cmax and Cmin.
      const d = [cur.auc - prev.auc, cur.cmax - prev.cmax, cur.cmin - prev.cmin];
      const v = [cur.auc, cur.cmax, cur.cmin];
      const done = d.every((dk, i) => {
        const scale = Math.max(Math.abs(v[i]), 1e-12);
        if (Math.abs(dk) <= 1e-12 * scale) return true;
        if (!dPrev || dPrev[i] === 0) return false;
        const rho = dk / dPrev[i];
        if (!(rho > 0 && rho < 1)) return Math.abs(dk) <= tol * 1e-2 * scale; // oscillating / not yet geometric
        return Math.abs((dk * rho) / (1 - rho)) <= tol * scale;
      });
      if (done) return { ss: cur, first, converged: true };
      dPrev = d;
    }
    prev = cur;
  }
  return { ss: cur!, first: first!, converged: false };
}

export function simulatePop(
  p: PopState,
  model: ModelType,
  grid: Grid,
  route: TmddRoute,
  readout: TmddReadout
): SimResult {
  const eff = getEffectiveParams(p);
  const dt = grid.dt;
  const tau = p.tauHours;
  let concPoints: number[];
  let ss: IntervalStats, first: IntervalStats, converged = true;

  if (model === 'tmdd_1cmt' || model === 'tmdd_2cmt') {
    concPoints = simulateTmdd(p, model, eff, grid, route, readout);
    ({ ss, first, converged } = tmddSteadyState(p, model, eff, dt, route, readout));
  } else {
    const T = linearTerms(p, model, eff);
    concPoints = simulateLinear(p, T, grid);
    // sample the steady-state and first-dose intervals finely (at least SIM.ssSamples points)
    const m = Math.max(SIM.ssSamples, Math.round(tau / dt));
    const h = tau / m;
    const css = Array.from({ length: m + 1 }, (_, j) => steadyStateConc(T, tau, j * h));
    const c1 = Array.from({ length: m + 1 }, (_, j) => singleDose(T, j * h));
    ss = intervalStats(css, h, p);
    // exact AUC over a steady-state interval = AUC0-∞ of one dose = Dose/CL
    ss.auc = T.coef.reduce((a, A, k) => a + A / T.lambdas[k], 0) + (T.oral ? T.kaCoef / T.ka : 0);
    first = intervalStats(c1, h, p);
  }

  // AUC of the last simulated interval of the plotted regimen, to show how close it gets to steady state
  const n = concPoints.length;
  const lastStart = Math.min(n - 1, Math.round(((p.numDoses - 1) * tau) / dt));
  const lastEnd = Math.min(n - 1, Math.round((p.numDoses * tau) / dt));
  let aucLast = 0;
  for (let i = lastStart; i < lastEnd; i++) aucLast += ((concPoints[i] + concPoints[i + 1]) / 2) * dt;

  return {
    concPoints,
    cmax_ss: ss.cmax,
    cmin_ss: ss.cmin,
    cavg_ss: ss.auc / tau,
    auc_tau: ss.auc,
    rac: ss.cmax / Math.max(first.cmax, 1e-12),
    timeAboveMec: ss.aboveMec * 100,
    timeAboveMtc: ss.aboveMtc * 100,
    rMinPct: isTmddModel(model) && p.r0 > 0 ? (ss.rMin / p.r0) * 100 : null,
    lastIntervalPctSs: ss.auc > 0 ? (aucLast / ss.auc) * 100 : 100,
    ssConverged: converged,
  };
}

const isTmddModel = (m: ModelType) => m === 'tmdd_1cmt' || m === 'tmdd_2cmt';
