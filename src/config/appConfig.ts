/**
 * Central configuration for the PK simulator.
 * Every tunable parameter, default, range, label and layout constant used by the app lives here.
 * Nothing in this file imports runtime code (types only), so it is safe to import from anywhere.
 */
import type { ModelType, PopState, TmddReadout, TmddRoute } from '../components/simulator/types';
import type { ErModel, ErPop, ExposureSource } from '../er/erTypes';

// Public-site / SEO / PWA settings live in ./siteConfig.ts (also read by vite.config.ts).
export { SITE } from './siteConfig';

// ───────────────────────── App / header ─────────────────────────
export const APP = {
  name: 'HyperPKPD',
  subtitle: 'Interactive Population PK and ER',
} as const;

/** Header analysis selector: switches between the Population PK and Exposure Response workspaces. */
export type AnalysisMode = 'popPK' | 'exposureResponse';
export const ANALYSIS_MODES: { value: AnalysisMode; label: string }[] = [
  { value: 'popPK', label: 'Population PK' },
  { value: 'exposureResponse', label: 'Exposure Response' },
];
export const DEFAULT_ANALYSIS_MODE: AnalysisMode = 'popPK';

/** Help / About modal. */
export const HELP = {
  parentUrl: 'https://hyperpkpd.com/',
  author: 'Obinna Obianom',
};

// ───────────────────────── Models & routes ─────────────────────────
export const MODEL_GROUPS: { label: string; options: { value: ModelType; label: string }[] }[] = [
  {
    label: 'Linear PK',
    options: [
      { value: '3cmt_oral', label: '3-Compartment Oral' },
      { value: '2cmt_oral', label: '2-Compartment Oral' },
      { value: '1cmt_oral', label: '1-Compartment Oral' },
      { value: '3cmt_iv', label: '3-Compartment IV Bolus' },
      { value: '2cmt_iv', label: '2-Compartment IV Bolus' },
      { value: '1cmt_iv', label: '1-Compartment IV Bolus' },
    ],
  },
  {
    label: 'Target-mediated (TMDD)',
    options: [
      { value: 'tmdd_1cmt', label: 'TMDD · 1-Compartment' },
      { value: 'tmdd_2cmt', label: 'TMDD · 2-Compartment' },
    ],
  },
];
export const DEFAULT_MODEL: ModelType = '2cmt_oral';

export const TMDD_ROUTE_OPTIONS: { value: TmddRoute; label: string }[] = [
  { value: 'iv', label: 'IV bolus' },
  { value: 'sc', label: 'SC (1st-order)' },
];
export const TMDD_READOUT_OPTIONS: { value: TmddReadout; label: string }[] = [
  { value: 'free', label: 'Free drug' },
  { value: 'total', label: 'Total drug' },
];
export const DEFAULT_TMDD_ROUTE: TmddRoute = 'iv';
export const DEFAULT_TMDD_READOUT: TmddReadout = 'free';

// ───────────────────────── Populations ─────────────────────────
export const POP_NAMES = ['Population 1', 'Population 2', 'Population 3'];
export const POP_COLORS = ['#3b82f6', '#f97316', '#a855f7'];
export const POP_COUNT = POP_NAMES.length;
export const DEFAULT_ACTIVE_POP = 0;

/** Elimination half-life constant used for t1/2 = LN2 · V / CL. */
export const LN2 = 0.69315;

export const CLINICAL_PRESETS = {
  base: { clearance: 4.82, volume: 48.5, halfLife: 6.97 },
  renal: { clearance: 1.85, volume: 48.5, halfLife: 18.17 },
  hyper: { clearance: 12.5, volume: 48.5, halfLife: 2.69 },
  fluid: { clearance: 4.82, volume: 95.0, halfLife: 13.66 },
} as const;
export type PresetKey = keyof typeof CLINICAL_PRESETS;

/** Preset buttons in the PK-parameters card: [light-mode text colour, dark-mode text colour]. */
export const PRESET_BUTTONS: { key: PresetKey; label: string; tone: [string, string] }[] = [
  { key: 'base', label: 'Standard', tone: ['text-slate-700', 'text-slate-300'] },
  { key: 'renal', label: 'Renal Impaired', tone: ['text-amber-700', 'text-amber-300'] },
  { key: 'hyper', label: 'High CL', tone: ['text-purple-700', 'text-purple-300'] },
  { key: 'fluid', label: 'High Vd', tone: ['text-emerald-700', 'text-emerald-300'] },
];

/** Starting values shared by all populations. */
export const BASE_POP_DEFAULTS: PopState = {
  doseMg: 200,
  tauHours: 12,
  numDoses: 8,
  clearance: 4.82,
  volume: 48.5,
  halfLife: 6.97,
  ka: 1.25,
  intercompCl: 8.4,
  volume2: 92.0,
  intercompCl3: 3.0,
  volume3: 60.0,
  useCovariateScaling: false,
  patientWt: 70,
  patientCrcl: 100,
  mec: 1.0,
  mtc: 6.0,
  r0: 5,
  kdeg: 0.05,
  kon: 0.03,
  koff: 0.01,
  kint: 0.02,
  mw: 150,
};

/** Per-population overrides applied on top of BASE_POP_DEFAULTS (so the three tabs differ out of the box). */
export const POP_DEFAULT_OVERRIDES: Partial<PopState>[] = [
  { ...CLINICAL_PRESETS.base },
  { ...CLINICAL_PRESETS.renal },
  { ...CLINICAL_PRESETS.hyper },
];

/**
 * "mAb defaults (all)" button: typical IgG monoclonal-antibody values, in the app's units (L/h, 1/h).
 * CL 0.0104 L/h = 0.25 L/day, Q 0.025 L/h = 0.6 L/day, Ka 0.01 1/h = 0.24 /day (SC), linear t1/2 ≈ 9 days.
 * The window is chosen so the three populations show the three status badges (in window / above MTC / below MEC).
 */
export const MAB_DEFAULTS = {
  doseMg: 100,
  tauHours: 336,
  numDoses: 6,
  clearance: 0.0104,
  volume: 3.2,
  intercompCl: 0.025,
  volume2: 3.0,
  ka: 0.01,
  mec: 5,
  mtc: 50,
  r0: 5,
  kdeg: 0.05,
  kon: 0.03,
  koff: 0.01,
  kint: 0.02,
  mw: 150,
};
/** Clearance multiplier applied to Pop 1/2/3 when the mAb defaults are loaded. */
export const MAB_CL_SCALE = [1, 0.5, 2];

// ───────────────────────── Dosing ─────────────────────────
export const TAU_OPTIONS: { hours: number; label: string }[] = [
  { hours: 6, label: 'q6h' },
  { hours: 8, label: 'q8h' },
  { hours: 12, label: 'q12h' },
  { hours: 24, label: 'q24h' },
  { hours: 72, label: 'q3d' },
  { hours: 168, label: 'q1w' },
  { hours: 336, label: 'q2w' },
];

// ───────────────────────── Slider / input ranges ─────────────────────────
export interface ParamUi {
  min: number;
  max: number;
  step: number;
  clampMin: number;
  clampMax: number;
  ticks?: [string, string, string];
}
export const PARAM_UI = {
  clearance: { min: 0.5, max: 30, step: 0.1, clampMin: 0.0005, clampMax: 50, ticks: ['0.5 L/h', '15.0 L/h', '30.0 L/h'] },
  volume: { min: 10, max: 200, step: 1, clampMin: 0.1, clampMax: 300, ticks: ['10 L', '100 L', '200 L'] },
  halfLife: { min: 0.5, max: 48, step: 0.1, clampMin: 0.2, clampMax: 10000, ticks: ['0.5 h', '24.0 h', '48.0 h'] },
  ka: { min: 0.01, max: 5, step: 0.01, clampMin: 0.005, clampMax: 10, ticks: ['0.01', '2.5', '5.0'] },
  intercompCl: { min: 0.1, max: 30, step: 0.1, clampMin: 0.0005, clampMax: 60, ticks: ['0.1', '15', '30'] },
  volume2: { min: 1, max: 300, step: 1, clampMin: 0.1, clampMax: 500, ticks: ['1 L', '150 L', '300 L'] },
  intercompCl3: { min: 0.1, max: 30, step: 0.1, clampMin: 0.01, clampMax: 60, ticks: ['0.1', '15', '30'] },
  volume3: { min: 1, max: 400, step: 1, clampMin: 0.5, clampMax: 800, ticks: ['1 L', '200 L', '400 L'] },
  r0: { min: 0.1, max: 100, step: 0.1, clampMin: 0.01, clampMax: 1000, ticks: ['0.1', '50', '100'] },
  kdeg: { min: 0.005, max: 1, step: 0.005, clampMin: 0.001, clampMax: 5, ticks: ['0.005', '0.5', '1.0'] },
  kon: { min: 0.001, max: 1, step: 0.001, clampMin: 0.0001, clampMax: 5, ticks: ['0.001', '0.5', '1.0'] },
  koff: { min: 0, max: 1, step: 0.001, clampMin: 0, clampMax: 5, ticks: ['0', '0.5', '1.0'] },
  kint: { min: 0.001, max: 1, step: 0.001, clampMin: 0.0001, clampMax: 5, ticks: ['0.001', '0.5', '1.0'] },
  mw: { min: 1, max: 200, step: 1, clampMin: 1, clampMax: 1000, ticks: ['1', '100', '200'] },
  doseMg: { min: 25, max: 800, step: 25, clampMin: 1, clampMax: 5000, ticks: ['25 mg', '400 mg', '800 mg'] },
  numDoses: { min: 1, max: 14, step: 1, clampMin: 1, clampMax: 14 },
  patientWt: { min: 40, max: 140, step: 1, clampMin: 40, clampMax: 140 },
  patientCrcl: { min: 20, max: 150, step: 1, clampMin: 20, clampMax: 150 },
  window: { step: 0.5 },
} satisfies Record<string, Partial<ParamUi>>;

/** Slider ranges used instead of PARAM_UI when a TMDD model is selected (antibody-scale CL, V and half-life). */
export const PARAM_UI_TMDD = {
  clearance: { ...PARAM_UI.clearance, min: 0.001, max: 0.5, step: 0.0005, ticks: ['0.001', '0.25 L/h', '0.5 L/h'] },
  volume: { ...PARAM_UI.volume, min: 1, max: 20, step: 0.1, ticks: ['1 L', '10 L', '20 L'] },
  halfLife: { ...PARAM_UI.halfLife, min: 1, max: 1000, step: 1, ticks: ['1 h', '500 h', '1000 h'] },
  intercompCl: { ...PARAM_UI.intercompCl, min: 0.001, max: 0.5, step: 0.001, ticks: ['0.001', '0.25', '0.5'] },
  volume2: { ...PARAM_UI.volume2, min: 0.5, max: 20, step: 0.1, ticks: ['0.5 L', '10 L', '20 L'] },
  ka: { ...PARAM_UI.ka, min: 0.001, max: 0.5, step: 0.001, ticks: ['0.001', '0.25', '0.5'] },
} satisfies Partial<Record<keyof typeof PARAM_UI, ParamUi>>;

// ───────────────────────── Covariate model ─────────────────────────
export const COVARIATES = {
  refWt: 70, // kg
  refCrcl: 100, // mL/min
  clWtExponent: 0.75,
  clCrclExponent: 0.42,
  vWtExponent: 1.0,
  qWtExponent: 0.75,
};

// ───────────────────────── Simulation engine ─────────────────────────
export const SIM = {
  /** Minimum washout tail simulated after the last dose (h); the tail is max(this, tau). */
  minTailHours: 24,
  /** Output grid step by horizon: first row whose maxDuration >= horizon wins, otherwise fallbackDt. */
  gridSteps: [
    { maxDuration: 600, dt: 0.25 },
    { maxDuration: 1500, dt: 0.5 },
  ],
  fallbackDt: 1,
  /** RK4 step control for TMDD. */
  rk4: { stepRateFactor: 1.2, maxSubsteps: 600, minSubsteps: 1 },
  /** Relative offset used to separate equal rate constants in the closed-form solutions. */
  nudgeRelative: 1e-4,
  /** Minimum number of points used to sample one steady-state / first-dose interval (linear models). */
  ssSamples: 400,
  /** TMDD steady-state search: dose until consecutive intervals agree to relTol, within a step budget. */
  tmddSs: { relTol: 1e-4, maxIntervals: 5000, maxRk4Steps: 6_000_000 },
};

/** Target therapeutic window band colour (chart shading, MEC label, legend). */
export const WINDOW_COLOR = {
  default: '#10b981',
  presets: ['#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#64748b'],
};

// ───────────────────────── Chart image download ─────────────────────────
export const DOWNLOAD = {
  defaults: { widthIn: 8, heightIn: 4, dpi: 300, title: true, transparent: false },
  widthIn: { min: 1, max: 20, step: 0.5 },
  heightIn: { min: 1, max: 20, step: 0.5 },
  dpi: { min: 72, max: 600, step: 1, presets: [72, 150, 300, 600] },
  /** Hard safety limits for the generated bitmap. */
  maxSidePx: 12000,
  maxPixels: 80_000_000,
  fileBase: { pk: 'pk-profile', er: 'exposure-response' },
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  backgroundLight: '#ffffff',
  backgroundDark: '#0f172a',
  titleColorLight: '#1e293b',
  titleColorDark: '#e2e8f0',
};

// ───────────────────────── Chart ─────────────────────────
export const CHART = {
  width: 800,
  height: 345,
  plot: { x0: 60, x1: 760, y0: 25, y1: 290 },
  heightPx: 345,
  xAxisTitle: 'Time (h)',
  yAxisTitle: 'Concentration (mg/L)',
  yAxisTitleLog: 'Log10 Concentration (mg/L)',
  minDragPx: 15,
  minYAxisMax: 10,
  mtcHeadroom: 1.3,
  dataHeadroom: 1.15,
  logAxisMin: 0.01,
  maxXTicks: 10,
  niceStepsX: [0.1, 0.25, 0.5, 1, 2, 3, 6, 12, 24, 48, 72, 96, 168, 336, 672, 1344, 2688, 5376],
  logTicks: [0.001, 0.01, 0.1, 1, 10, 100, 1000, 10000],
  /** theme_classic look: no grid, solid axis lines + ticks. Light mode uses black; dark mode inverts for contrast. */
  axis: {
    showGrid: false,
    width: 2.5,
    tickLength: 6,
    tickWidth: 2,
    lineLight: '#000000',
    lineDark: '#e5e7eb',
    textLight: '#111827',
    textDark: '#e2e8f0',
    tickFontSize: 12,
    titleFontSize: 13,
  },
  defaults: {
    isLogScale: false,
    autoY: true,
    customYMin: 0,
    customYMax: 10,
    customYStep: 2,
    autoX: true,
    customXMin: 0,
    customXMax: 120,
    customXStep: 12,
  },
};


// ───────────────────────── Exposure–Response (ER) ─────────────────────────
export const ER_MODELS: { value: ErModel; label: string; short: string }[] = [
  { value: 'linear', label: 'Linear', short: 'Linear' },
  { value: 'loglinear', label: 'Log-linear', short: 'Log-linear' },
  { value: 'emax', label: 'Emax', short: 'Emax' },
  { value: 'sigmoid', label: 'Sigmoidal Emax (Hill)', short: 'Sigmoid Emax' },
  { value: 'hockey', label: 'Hockey-stick (threshold)', short: 'Hockey-stick' },
];
export const DEFAULT_ER_MODEL: ErModel = 'emax';

export const ER_EXPOSURE_SOURCES: { value: ExposureSource; label: string }[] = [
  { value: 'cavg', label: 'Cavg,ss' },
  { value: 'cmax', label: 'Cmax,ss' },
  { value: 'cmin', label: 'Cmin,ss' },
  { value: 'manual', label: 'Manual' },
];
export const ER_LOG_BASES: { value: 'ln' | 'log10'; label: string }[] = [
  { value: 'ln', label: 'ln(C)' },
  { value: 'log10', label: 'log10(C)' },
];

/** Starting ER parameters. Pop 1 = reference; Pop 2 more sensitive; Pop 3 less sensitive. */
export const ER_BASE_DEFAULTS: ErPop = {
  e0: 5, beta: 1.0, logE1: 40, betaLog: 8, logBase: 'ln',
  emax: 95, ec50: 3, gamma: 3, ct: 2,
  exposureSource: 'cavg', cManual: 3, targetEffect: 50,
};
export const ER_POP_DEFAULT_OVERRIDES: Partial<ErPop>[] = [
  {},
  { beta: 1.5, logE1: 50, ec50: 2, ct: 1 },
  { beta: 0.6, logE1: 25, betaLog: 6, emax: 80, ec50: 8, gamma: 2, ct: 4 },
];

/** Slider ranges for ER parameters (units: effect units, mg/L). */
export const ER_PARAM_UI = {
  e0: { min: 0, max: 100, step: 1, clampMin: -1000, clampMax: 1000, ticks: ['0', '50', '100'] },
  beta: { min: 0.05, max: 10, step: 0.05, clampMin: 0.001, clampMax: 100, ticks: ['0.05', '5', '10'] },
  logE1: { min: -50, max: 100, step: 1, clampMin: -1000, clampMax: 1000, ticks: ['-50', '25', '100'] },
  betaLog: { min: 0.5, max: 30, step: 0.1, clampMin: 0.001, clampMax: 1000, ticks: ['0.5', '15', '30'] },
  emax: { min: 1, max: 200, step: 1, clampMin: 0.1, clampMax: 1000, ticks: ['1', '100', '200'] },
  ec50: { min: 0.1, max: 50, step: 0.1, clampMin: 0.001, clampMax: 1000, ticks: ['0.1 mg/L', '25', '50 mg/L'] },
  gamma: { min: 0.5, max: 8, step: 0.1, clampMin: 0.1, clampMax: 20, ticks: ['0.5', '4', '8'] },
  ct: { min: 0, max: 50, step: 0.1, clampMin: 0, clampMax: 1000, ticks: ['0', '25 mg/L', '50 mg/L'] },
  cManual: { min: 0.1, max: 100, step: 0.1, clampMin: 0.001, clampMax: 10000, ticks: ['0.1', '50', '100'] },
  targetEffect: { min: 0, max: 200, step: 1, clampMin: -1000, clampMax: 10000, ticks: ['0', '100', '200'] },
} satisfies Record<string, ParamUi>;

export const ER_CHART = {
  xAxisTitle: 'Concentration (mg/L)',
  xAxisTitleLog: 'Concentration (mg/L, log scale)',
  yAxisTitle: 'Effect (E)',
  curvePoints: 400,
  logXMin: 0.01,
  logXMaxDefault: 100,
  /** Linear x-axis auto range: max over shown pops of the largest of these multiples (then rounded up to a nice number). */
  autoX: { refFactor: 2.5, ec50Factor: 4, ctFactor: 3, minMax: 10 },
  yHeadroom: 1.1,
  /** The target-effect line only stretches the auto y-axis when it is within this multiple of the plotted data. */
  targetYReach: 1.5,
  minYMax: 10,
  /** Log-linear is only drawn for x >= this fraction of the axis max on a linear axis (E -> -inf as C -> 0). */
  logLinearFloor: 1e-3,
  defaults: { xLog: false, autoY: true, yMin: 0, yMax: 100, yStep: 20, autoX: true, xMin: 0, xMax: 20, xStep: 2 },
};

// ───────────────────────── Layout ─────────────────────────
export const LAYOUT = {
  leftPanelDefault: 384,
  leftPanelMin: 300,
  /** Minimum width kept for the right-hand column while dragging the divider. */
  rightColumnMin: 380,
  dividerKeyStep: 24,
};

// ───────────────────────── Quiz ─────────────────────────
export const QUIZ = {
  title: 'Concept Quiz',
  openByDefault: true,
  /** Number of questions drawn at random from the pool (src/quiz/quizQuestions.ts) on each app load / new round. */
  questionsPerRound: 15,
};

// ───────────────────────── Persistence (IndexedDB via Dexie) ─────────────────────────
export const PERSISTENCE = {
  dbName: 'pksims',
  debounceMs: 200,
  keys: {
    model: 'sim.model',
    route: 'sim.tmddRoute',
    readout: 'sim.tmddReadout',
    pops: 'sim.pops',
    activeIdx: 'sim.activePop',
    visible: 'sim.visiblePops',
    analysisMode: 'ui.analysisMode',
    panelWidth: 'ui.leftPanelWidth',
    theme: 'ui.theme',
    quizOpen: 'ui.quizOpen',
    equationsTab: 'ui.equationsTab',
    chartLog: 'chart.isLogScale',
    chartAutoY: 'chart.autoY',
    chartYMin: 'chart.customYMin',
    chartYMax: 'chart.customYMax',
    chartYStep: 'chart.customYStep',
    chartAutoX: 'chart.autoX',
    chartXMin: 'chart.customXMin',
    chartXMax: 'chart.customXMax',
    chartXStep: 'chart.customXStep',
    chartZoom: 'chart.zoomRange',
    showWindow: 'chart.showTherapeuticWindow',
    downloadOpts: 'chart.download',
    windowColor: 'chart.therapeuticWindowColor',
    erModel: 'er.model',
    erPops: 'er.pops',
    erEquationsTab: 'er.equationsTab',
    erChartLog: 'er.chart.xLog',
    erChartAutoY: 'er.chart.autoY',
    erChartYMin: 'er.chart.yMin',
    erChartYMax: 'er.chart.yMax',
    erChartYStep: 'er.chart.yStep',
    erChartAutoX: 'er.chart.autoX',
    erChartXMin: 'er.chart.xMin',
    erChartXMax: 'er.chart.xMax',
    erChartXStep: 'er.chart.xStep',
    erChartZoom: 'er.chart.zoomRange',
  },
  /** Keys written by older versions; deleted on load. */
  obsoleteKeys: ['quiz.state'],
} as const;
