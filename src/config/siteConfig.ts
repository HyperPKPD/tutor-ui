/**
 * Public-site settings: hosting location, SEO text, PWA identity. No imports, so vite.config.ts can read it too.
 * The build (see vite.config.ts) turns this into index.html meta tags, JSON-LD, manifest.webmanifest, robots.txt and sitemap.xml.
 */
export const SITE = {
  origin: 'https://hyperpkpd.com',
  /** Sub-path the app is served from (must start and end with "/"). Also the Vite `base`. */
  basePath: '/tutor/',
  name: 'HyperPKPD Tutor',
  shortName: 'HyperPKPD',
  title: 'HyperPKPD Tutor – Interactive Population PK & Exposure–Response Simulator',
  description:
    'Free interactive tutor for population PK (1–3 compartment, TMDD) and exposure–response (linear, log-linear, Emax, Hill, hockey-stick) with equations and quizzes.',
  keywords: [
    'population pharmacokinetics', 'population PK', 'pharmacokinetics simulator', 'PK/PD', 'pharmacometrics',
    'exposure response', 'Emax model', 'Hill equation', 'sigmoidal Emax', 'hockey-stick model', 'TMDD',
    'target-mediated drug disposition', 'compartmental model', 'steady state exposure', 'pharmacology tutor',
  ],
  language: 'en',
  locale: 'en_US',
  themeColor: '#1e3a8a',
  backgroundColor: '#0f172a',
  category: 'education',
  /** Shown to crawlers / no-JS visitors until the app loads. */
  features: [
    'Population PK simulator: 1-, 2- and 3-compartment oral and IV bolus models, plus target-mediated drug disposition (TMDD) with 1 or 2 compartments.',
    'Compare three populations side by side: edit clearance, volume, absorption, dose, interval and covariates (weight, creatinine clearance) and see the effect on concentration–time curves.',
    'Steady-state exposure metrics: Cmax, Cmin, Cavg, AUC over the dosing interval, accumulation ratio and time within the therapeutic window.',
    'Exposure–response models: linear, log-linear, Emax, sigmoidal Emax (Hill) and hockey-stick (threshold), with the concentration needed for a target effect.',
    'Worked equations, parameter interpretation and assumptions for every model.',
    'Concept quizzes with explanations for population PK and for each exposure–response model.',
    'Runs entirely in your browser; your settings are saved locally. Installable as an app and usable offline.',
  ],
} as const;

export const siteUrl = `${SITE.origin}${SITE.basePath}`;
