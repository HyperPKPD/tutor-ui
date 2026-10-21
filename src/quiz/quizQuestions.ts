/**
 * Quiz content pool. Each question has four options, one correct answer and an explanation.
 * Authored order is irrelevant: each round draws a random subset and shuffles the options (see deck.ts).
 */
export type Difficulty = 'core' | 'hard' | 'expert';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = { core: 'Core', hard: 'Hard', expert: 'Expert' };

export interface QuizQuestion {
  id: string;
  difficulty: Difficulty;
  concept: string;
  prompt: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  explanation: string;
  /** Suggestion for seeing the answer in the simulator */
  tryIt?: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    difficulty: 'core',
    id: 'cl-up',
    concept: 'Clearance',
    prompt: 'In a linear PK model you increase clearance (CL) while keeping dose, interval and volume (V) the same. What happens?',
    options: [
      'Average steady-state concentration rises and half-life shortens',
      'Average steady-state concentration falls and half-life shortens',
      'Average steady-state concentration falls and half-life lengthens',
      'Only the absorption phase changes; steady-state exposure is unchanged',
    ],
    correct: 1,
    explanation:
      'Cavg,ss = Dose / (CL · τ), so a larger CL lowers average exposure (and AUC). Because t½ = 0.693 · V / CL, a larger CL with the same V also shortens the half-life, so the curve falls faster and the trough drops.',
    tryIt: 'Drag the Clearance slider up on Population 1 and watch Cavg,ss in the exposure table and the half-life box.',
  },
  {
    difficulty: 'core',
    id: 'v-up',
    concept: 'Volume of distribution',
    prompt: 'You increase the volume of distribution (V1) but leave CL, dose and interval unchanged. Which statement is correct?',
    options: [
      'Half-life shortens and Cavg,ss increases',
      'Half-life is unchanged and AUC increases',
      'Half-life lengthens and Cavg,ss increases proportionally to V',
      'Half-life lengthens, Cavg,ss is unchanged, and peak-to-trough fluctuation shrinks',
    ],
    correct: 3,
    explanation:
      'AUC and Cavg,ss depend on Dose/CL, not on V. A larger V dilutes the drug (lower peaks) and, since t½ = 0.693 · V / CL, slows its decline, so troughs are relatively higher and the profile is flatter.',
    tryIt: 'Use the "High Vd" preset and compare it with "Standard": same Cavg,ss, longer t½, flatter curve.',
  },
  {
    difficulty: 'core',
    id: 'dose-linear',
    concept: 'Dose proportionality',
    prompt: 'In a linear PK model you double the dose without changing anything else. What happens at steady state?',
    options: [
      'Cmax and AUC double; half-life and accumulation ratio stay the same',
      'Cmax doubles but AUC stays the same',
      'AUC more than doubles because elimination saturates',
      'Half-life doubles and accumulation ratio doubles',
    ],
    correct: 0,
    explanation:
      'Linear PK means every concentration scales with dose. Half-life, clearance and the accumulation ratio (which depend only on the rate constants and the interval) do not change.',
    tryIt: 'Double the Dose slider and compare Cmax, AUC_tau and Rac in the table.',
  },
  {
    difficulty: 'core',
    id: 'tau-short',
    concept: 'Dosing interval & accumulation',
    prompt: 'You switch the same dose from q24h to q12h in a drug with a 7 h half-life. What happens at steady state?',
    options: [
      'Cavg,ss is unchanged and accumulation decreases',
      'Cavg,ss halves because doses are closer together',
      'Cavg,ss roughly doubles and the accumulation ratio increases',
      'Only the peak changes; the trough is unchanged',
    ],
    correct: 2,
    explanation:
      'The daily dose doubles, so Cavg,ss = Dose/(CL·τ) doubles. A shorter interval also leaves less time for the drug to wash out, so Rac = 1 / (1 − e^(−ke·τ)) increases.',
    tryIt: 'Switch the interval button from q24h to q12h and watch Cavg,ss and Rac.',
  },
  {
    difficulty: 'core',
    id: 'ss-time',
    concept: 'Time to steady state',
    prompt: 'A drug has an elimination half-life of about 7 hours. Roughly how long until repeated dosing reaches steady state?',
    options: [
      'About 7 h (one half-life)',
      'About 14 h (two half-lives)',
      'About 28–35 h (4–5 half-lives)',
      'About 100 h or more, since steady state depends on the dose size',
    ],
    correct: 2,
    explanation:
      'After n half-lives the accumulation is 1 − 0.5ⁿ of its final value: ~94% after 4 and ~97% after 5. Time to steady state depends on t½ only, not on dose or interval.',
    tryIt: 'Select a 1-compartment model, keep q12h and watch the troughs rise dose by dose: they level off after about 28–35 h (the 3rd–4th dose). Multi-compartment models take longer because their terminal half-life is longer than 0.693·V1/CL.',
  },
  {
    difficulty: 'core',
    id: 'renal',
    concept: 'Covariates / special populations',
    prompt: 'Population 2 (renal impaired) has a lower clearance than Population 1 on the same regimen. What do you expect?',
    options: [
      'Lower trough and AUC, shorter half-life',
      'Same exposure, because dose is the same',
      'Higher trough and AUC, longer half-life, and a greater risk of exceeding MTC',
      'Higher peak only; the trough is unchanged',
    ],
    correct: 2,
    explanation:
      'Lower CL means slower removal: AUC and Cavg,ss rise in proportion to 1/CL, the half-life lengthens, and the drug accumulates more. Dose reduction or a longer interval is often needed to stay inside the window.',
    tryIt: 'Compare the Pop 1 and Pop 2 columns in the exposure table and the status badges at the top.',
  },
  {
    difficulty: 'core',
    id: 'window',
    concept: 'Therapeutic window',
    prompt: 'Peaks sit just under the MTC but troughs fall below the MEC. Which change best narrows the fluctuation while keeping the same average exposure?',
    options: [
      'Double the dose and double the interval',
      'Halve the dose and halve the interval',
      'Keep the interval and increase the dose',
      'Keep the dose and lengthen the interval',
    ],
    correct: 1,
    explanation:
      'Halving both dose and interval keeps dose/τ (and so Cavg,ss) identical, but the drug has less time to decline between doses, so peaks come down and troughs come up. Doubling both does the opposite.',
    tryIt: 'Try 100 mg q6h versus 200 mg q12h on two populations and compare Cmax and Cmin.',
  },
  {
    difficulty: 'core',
    id: 'semilog',
    concept: 'Semi-log plots',
    prompt: 'For a one-compartment IV bolus, how does the declining phase look on a semi-logarithmic concentration axis?',
    options: [
      'A straight line whose slope reflects the elimination rate constant',
      'A curve that flattens as concentration drops',
      'A line that is steeper at higher concentrations',
      'A horizontal line',
    ],
    correct: 0,
    explanation:
      'C(t) = C0·e^(−ke·t), so ln C is linear in t with slope −ke. A straight terminal line on a semi-log plot is the signature of first-order (linear) elimination.',
    tryIt: 'Switch the chart to "Semi-Log" with the 1-Compartment IV model.',
  },
  {
    difficulty: 'core',
    id: 'ka-up',
    concept: 'Absorption rate',
    prompt: 'For an oral drug you increase the absorption rate constant (Ka) while CL, V and dose stay the same. What changes?',
    options: [
      'AUC increases and half-life shortens',
      'Peak is higher and occurs earlier; AUC (extent of exposure) is unchanged',
      'Peak is lower and occurs earlier; AUC decreases',
      'Nothing changes because absorption does not affect concentrations',
    ],
    correct: 1,
    explanation:
      'Ka controls how fast the drug enters the circulation. A larger Ka gives a higher Cmax and an earlier Tmax. The extent of absorption (AUC = F·Dose/CL) and the terminal half-life are set by F, CL and V.',
    tryIt: 'Raise the Absorption rate (Ka) slider and look at the first dose peak.',
  },
  {
    difficulty: 'core',
    id: 'tmdd-nonlinear',
    concept: 'Target-mediated drug disposition',
    prompt: 'In a TMDD model, what typically happens to AUC when you double the dose?',
    options: [
      'AUC doubles exactly, as in any linear model',
      'AUC increases less than twofold because binding increases elimination',
      'AUC is unaffected because the target controls exposure',
      'AUC increases more than twofold because target-mediated clearance saturates',
    ],
    correct: 3,
    explanation:
      'The drug is cleared by binding to a limited amount of target and internalizing. At low doses this extra pathway removes a large share of drug; as the target saturates its contribution fades, so total clearance falls and exposure rises more than dose-proportionally.',
    tryIt: 'Choose a TMDD model, load "mAb defaults (all)", then double the dose from 100 to 200 mg: AUC_tau rises about 2.6-fold on Population 1. Compare the free-target suppression row too.',
  },

  // ───────────────────────── Hard ─────────────────────────
  {
    id: 'h-cavg-calc',
    difficulty: 'hard',
    concept: 'Average steady-state concentration',
    prompt: 'A drug with F = 1 and CL = 4.82 L/h is given as 200 mg every 12 h (linear PK). What is the average steady-state concentration?',
    options: ['1.73 mg/L', '3.46 mg/L', '4.82 mg/L', '6.92 mg/L'],
    correct: 1,
    explanation:
      'Cavg,ss = F·Dose / (CL·τ) = 200 / (4.82 × 12) = 3.46 mg/L. Volume does not enter, and neither does the number of compartments: every linear model shows 3.46 for Population 1. (Reaching that steady state takes longer with a slow terminal phase: the 2-compartment curve after 8 doses is still only about 94% of the way there.)',
    tryIt: 'Read Cavg,ss for Population 1 with any linear model, then compare the "Last simulated dose: AUC as % of steady state" row between the 1- and 2-compartment models.',
  },
  {
    id: 'h-t90',
    difficulty: 'hard',
    concept: 'Time to steady state',
    prompt: 'Population 2 has t½ ≈ 18 h (one-compartment behaviour). About how long does repeated dosing take to reach 90 % of steady state?',
    options: ['About 18 h', 'About 36 h', 'About 60 h', 'About 90 h'],
    correct: 2,
    explanation:
      'The fraction of steady state reached is 1 − 0.5ⁿ with n = time / t½. For 90 %: 0.5ⁿ = 0.1, so n = log₂(10) = 3.32 half-lives ≈ 3.32 × 18.2 h ≈ 60 h. It does not depend on dose or interval.',
    tryIt: 'Select the 1-Compartment Oral model, use the Renal Impaired preset and see how many q12h troughs it takes to level off (about 5 doses).',
  },
  {
    id: 'h-loading',
    difficulty: 'hard',
    concept: 'Loading dose',
    prompt: 'V1 = 48.5 L and CL = 4.82 L/h. You want an immediate IV-bolus concentration of 4 mg/L. What loading dose is needed?',
    options: ['About 48 mg', 'About 97 mg', 'About 194 mg', 'About 388 mg'],
    correct: 2,
    explanation:
      'Immediately after an IV bolus C0 = Dose / V1, so Dose = C0 × V1 = 4 × 48.5 = 194 mg. A loading dose is governed by the volume of distribution; clearance only determines the maintenance dose needed to hold that level.',
    tryIt: 'Choose 1-Compartment IV Bolus, set the dose near 200 mg and read the first peak on the chart.',
  },
  {
    id: 'h-wt140',
    difficulty: 'hard',
    concept: 'Allometric scaling',
    prompt: 'With covariate scaling (CL ∝ WT^0.75, V ∝ WT^1.0), a 140 kg patient receives the same dose as a 70 kg reference patient. What changes?',
    options: [
      'Half-life doubles and Cavg,ss halves',
      'Half-life increases about 19 % and Cavg,ss falls about 40 %',
      'Half-life is unchanged and Cavg,ss falls about 40 %',
      'Half-life shortens about 19 % and Cavg,ss rises about 40 %',
    ],
    correct: 1,
    explanation:
      'Doubling weight multiplies CL by 2^0.75 = 1.68 and V by 2. Since t½ = 0.693·V/CL it rises by 2 / 1.68 = 1.19 (+19 %). Cavg,ss ∝ 1/CL, so it falls to 1/1.68 = 0.59 (−40 %). Clearance scales less than proportionally to weight, so heavier patients are under-exposed at a flat dose.',
    tryIt: 'Tick "Apply Patient Covariate Scaling" and move the weight slider to 140 kg.',
  },
  {
    id: 'h-crcl',
    difficulty: 'hard',
    concept: 'Renal covariate',
    prompt: 'In the model CL ∝ (CRCL/100)^0.42, creatinine clearance falls from 100 to 50 mL/min. By how much does steady-state AUC change at the same dose?',
    options: ['It doubles', 'It rises about 34 %', 'It rises about 25 %', 'It is unchanged'],
    correct: 1,
    explanation:
      'CL falls to 0.5^0.42 = 0.747 of its value (−25 %). AUC = Dose/CL is the reciprocal: 1 / 0.747 = 1.34, i.e. +34 %. The −25 % is the change in clearance, not in exposure, which is the common slip.',
    tryIt: 'Enable covariate scaling and lower CRCL to 50 mL/min, then compare AUC_tau.',
  },
  {
    id: 'h-flipflop',
    difficulty: 'hard',
    concept: 'Flip-flop kinetics',
    prompt: 'In a one-compartment oral model Ka = 0.02 h⁻¹ and ke = 0.10 h⁻¹. What does the terminal slope of the semi-log curve reflect?',
    options: [
      'Elimination (t½ ≈ 6.9 h)',
      'Absorption (t½ ≈ 35 h): flip-flop kinetics',
      'The average of Ka and ke',
      'The distribution volume',
    ],
    correct: 1,
    explanation:
      'The terminal phase is governed by the slower of the two rate constants. When absorption is slower than elimination (Ka < ke) the declining tail is absorption-limited, so the apparent half-life is ln2/Ka ≈ 35 h rather than ln2/ke ≈ 6.9 h. This is why oral and IV half-lives can disagree.',
    tryIt: 'Pick the 1-Compartment Oral model, set Ka to 0.02 and shorten the half-life, then switch to Semi-Log.',
  },
  {
    id: 'h-q-2cmt',
    difficulty: 'hard',
    concept: 'Two-compartment disposition',
    prompt: 'In a two-compartment model, inter-compartmental clearance Q is increased while CL, V1 and V2 stay fixed. Which statement is correct?',
    options: [
      'AUC increases because more drug enters tissue',
      'The distribution phase is faster and the terminal half-life shortens, but never below ln2·(V1+V2)/CL; AUC is unchanged',
      'The terminal half-life lengthens without limit',
      'Only the first dose is affected; steady state is unchanged and the initial decline is slower',
    ],
    correct: 1,
    explanation:
      'AUC = Dose/CL does not depend on Q. A larger Q equilibrates the peripheral compartment faster (α half-life 2.1 h → 1.2 h when Q doubles from 8.4 to 16.8 L/h). The terminal half-life moves from 25.7 h to 22.8 h and approaches, but cannot go below, the one-compartment limit ln2·(V1+V2)/CL ≈ 20.2 h.',
    tryIt: 'Choose the 2-Compartment Oral model and raise Inter-comp CL (Q) while watching Cmin,ss and AUC_tau.',
  },
  {
    id: 'h-rac-calc',
    difficulty: 'hard',
    concept: 'Accumulation',
    prompt: 'A drug with a 24 h half-life is dosed every 12 h by IV bolus (one-compartment). What is the theoretical accumulation ratio 1 / (1 − e^(−ke·τ))?',
    options: ['1.4', '2.0', '3.4', '4.0'],
    correct: 2,
    explanation:
      'ke·τ = 0.693 × 12 / 24 = 0.347, so e^(−ke·τ) = 0.707 and Rac = 1 / (1 − 0.707) = 3.41. Rule of thumb: when τ equals t½ the ratio is 2; dosing at half that interval accumulates considerably more.',
    tryIt: 'Choose 1-Compartment IV Bolus, set the half-life to 24 h with q12h and read the Rac row (3.41). The oral model gives a slightly different peak ratio because its peak time shifts as drug accumulates.',
  },
  {
    id: 'h-tmdd-shape',
    difficulty: 'hard',
    concept: 'TMDD profile shape',
    prompt: 'After a large IV dose of a drug with target-mediated disposition, how does the free-drug curve look on a semi-log axis?',
    options: [
      'A single straight line at all concentrations',
      'A shallow decline at high concentrations followed by a steeper decline once concentrations fall into the target-binding range',
      'A steep decline first, then a flat plateau',
      'The curve rises after the dose before declining',
    ],
    correct: 1,
    explanation:
      'While the target is saturated only the linear clearance operates, giving a shallow slope. As free drug falls toward KD the target desaturates, target-mediated clearance switches on, and the slope steepens. The concentration-dependent slope is the signature of non-linear TMDD.',
    tryIt: 'Choose TMDD · 1-Compartment, load "mAb defaults (all)", set Number of Doses to 1 and switch the chart to Semi-Log: the decline is shallow at first and steepens sharply once free drug falls to about 1 mg/L.',
  },
  {
    id: 'h-occupancy',
    difficulty: 'hard',
    concept: 'Target occupancy',
    prompt: 'KD = koff/kon = 0.01 / 0.03 = 0.33 nM. If free drug sits at 3.3 nM (10 × KD), what fraction of the target is occupied at quasi-equilibrium?',
    options: ['50 %', '77 %', '91 %', '99 %'],
    correct: 2,
    explanation:
      'Occupancy = L / (KD + L) = 10 KD / (11 KD) = 0.909. Going from 1×KD (50 %) to 10×KD (91 %) needs a ten-fold increase in concentration, which is why very high exposure is needed for near-complete target coverage. 3.3 nM corresponds to 0.5 mg/L for a 150 kDa antibody.',
    tryIt: 'In a TMDD model, read the "Min free target at SS" row as you change the dose.',
  },
  {
    id: 'h-cmin-calc',
    difficulty: 'hard',
    concept: 'Peak and trough at steady state',
    prompt: 'One-compartment IV bolus: Dose/V = 4 mg/L, t½ = 12 h, τ = 12 h. What is the steady-state trough just before the next dose?',
    options: ['2 mg/L', '4 mg/L', '6 mg/L', '8 mg/L'],
    correct: 1,
    explanation:
      'With e^(−ke·τ) = 0.5: Cmax,ss = (D/V) / (1 − 0.5) = 8 mg/L and Cmin,ss = Cmax,ss × 0.5 = 4 mg/L. Equivalent: Cmin,ss = (D/V) · e^(−keτ) / (1 − e^(−keτ)) = 4 × 0.5 / 0.5.',
    tryIt: 'Choose 1-Compartment IV Bolus, set the half-life to 12 h with q12h, and look at Cmax and Cmin.',
  },
  {
    id: 'h-auc-tau',
    difficulty: 'hard',
    concept: 'AUC at steady state',
    prompt: 'For linear, time-invariant PK, the AUC over one dosing interval at steady state (AUCτ,ss) equals…',
    options: [
      'Half of the single-dose AUC0–∞',
      'The single-dose AUC0–∞ (= F·Dose/CL)',
      'The first-interval AUC0–τ',
      'Cmax,ss × τ',
    ],
    correct: 1,
    explanation:
      'By superposition, the tail of earlier doses that falls inside a steady-state interval exactly fills the area a single dose would leave beyond τ. So AUCτ,ss = AUC0–∞(single dose) = F·Dose/CL = 41.5 mg·h/L for Population 1. The first-interval AUC0–τ is smaller, and Cmax,ss × τ overestimates.',
    tryIt: 'Compare AUC_tau for the 1-Compartment IV model with Dose/CL = 200 / 4.82.',
  },

  // ───────────────────────── Hard (batch 2) ─────────────────────────
  {
    id: 'h-peak-trough',
    difficulty: 'hard',
    concept: 'Fluctuation at steady state',
    prompt: 'For a one-compartment IV bolus at steady state, which single change alters the peak-to-trough ratio (Cmax,ss / Cmin,ss) while the interval stays the same?',
    options: [
      'Doubling the dose',
      'Doubling CL and V together',
      'Doubling V alone',
      'Doubling both the dose and V',
    ],
    correct: 2,
    explanation:
      'Cmax,ss / Cmin,ss = e^(ke·τ) with ke = CL/V, so it depends only on ke and τ. Doubling the dose, or doubling the dose and V together, rescales concentrations but not the ratio; doubling CL and V together leaves ke unchanged. Doubling V alone halves ke, so the ratio falls from 3.30 to 1.82 (a flatter profile). With the 12 h interval and t½ = 7 h this is the only option that changes ke.',
    tryIt: 'Use the 1-Compartment IV Bolus model and raise Vd while watching Cmax and Cmin move closer together.',
  },
  {
    id: 'h-bioavail',
    difficulty: 'hard',
    concept: 'Bioavailability',
    prompt: 'A food effect halves the oral bioavailability (F: 1 → 0.5) of a drug with linear PK. True CL and V are unchanged. What happens?',
    options: [
      'AUC and Cmax roughly halve; the terminal half-life is unchanged',
      'AUC halves and the half-life doubles',
      'AUC is unchanged; only Cmax is lower',
      'AUC and half-life both halve',
    ],
    correct: 0,
    explanation:
      'AUC = F·Dose/CL, so AUC halves and concentrations scale down in proportion. Half-life = 0.693·V/CL does not involve F. With oral data only CL/F and V/F can be estimated, and both double when F halves, so their ratio, and hence t½, is unchanged.',
    tryIt: 'Halve the dose in the oral model: the curve scales down but the shape and t½ stay the same.',
  },
  {
    id: 'h-tmdd-dn-auc',
    difficulty: 'hard',
    concept: 'TMDD non-linearity',
    prompt: 'For a drug with target-mediated disposition, how does dose-normalized AUC (AUC / dose) change as dose increases across a wide range?',
    options: [
      'It stays constant, as for any drug',
      'It decreases continuously',
      'It rises with dose and levels off at 1/CL of the linear pathway once the target is saturated',
      'It rises without bound',
    ],
    correct: 2,
    explanation:
      'At low doses target-mediated clearance adds to the linear CL, so total clearance is high and AUC/dose is low. As the target saturates this extra clearance disappears and clearance approaches the linear CL, so AUC/dose rises toward 1/CL and then plateaus.',
    tryIt: 'Pick a TMDD model, load "mAb defaults (all)" and compare AUC_tau / dose at 25, 100 and 300 mg (roughly 20, 58 and 83 h/L on Population 1, rising toward 1/CL = 96 h/L).',
  },
  {
    id: 'h-kss',
    difficulty: 'hard',
    concept: 'Binding constants',
    prompt: 'kon = 0.03 nM⁻¹h⁻¹, koff = 0.01 h⁻¹, kint = 0.02 h⁻¹. What is the steady-state constant Kss = (koff + kint)/kon that sets the half-saturation of target-mediated clearance, compared with KD?',
    options: [
      'Kss = 0.33 nM, the same as KD',
      'Kss = 0.67 nM, twice KD',
      'Kss = 1.0 nM, three times KD',
      'Kss = 3.0 nM, nine times KD',
    ],
    correct: 2,
    explanation:
      'KD = koff/kon = 0.33 nM only describes binding. Because the complex is also removed by internalization, the effective constant is Kss = (koff + kint)/kon = 0.03/0.03 = 1.0 nM (about 0.15 mg/L for a 150 kDa antibody). Target-mediated clearance therefore saturates at higher concentrations than KD predicts.',
    tryIt: 'Raise kint in the TMDD panel and watch low-concentration troughs fall.',
  },
  {
    id: 'h-mrt',
    difficulty: 'hard',
    concept: 'Mean residence time',
    prompt: 'Two-compartment IV bolus with CL = 4.82 L/h, V1 = 48.5 L, V2 = 92 L. What is the mean residence time (MRT)?',
    options: ['About 10 h', 'About 20 h', 'About 29 h', 'About 48 h'],
    correct: 2,
    explanation:
      'MRT = Vss / CL with Vss = V1 + V2 = 140.5 L, so MRT = 140.5 / 4.82 = 29.1 h. It is longer than ln2·Vss/CL (20.2 h) because MRT is a mean, and different from the terminal half-life (≈ 25.7 h for Q = 8.4 L/h). V1/CL = 10.1 h ignores the peripheral compartment.',
    tryIt: 'Compare the t½ box with the 2-Compartment profile: the late slope is flatter than V1/CL suggests.',
  },
  {
    id: 'h-renal-dose',
    difficulty: 'hard',
    concept: 'Dose adjustment',
    prompt: 'Population 2 (CL = 1.85 L/h) should match the average exposure of Population 1 (CL = 4.82 L/h, 200 mg q12h). Keeping q12h, what dose is needed?',
    options: ['About 38 mg', 'About 77 mg', 'About 100 mg', 'About 130 mg'],
    correct: 1,
    explanation:
      'Cavg,ss = F·Dose/(CL·τ), so matching Cavg requires Dose ∝ CL: 200 × 1.85/4.82 = 77 mg. An equivalent option is to keep 200 mg and stretch the interval to 12 × 4.82/1.85 = 31 h, but that increases peak-to-trough swing.',
    tryIt: 'Set Population 2 to 75 mg q12h and compare its Cavg,ss to Population 1.',
  },
  {
    id: 'h-wt-dosing',
    difficulty: 'hard',
    concept: 'Weight-based dosing',
    prompt: 'With V ∝ WT and CL ∝ WT^0.75, how should the loading dose and maintenance dose scale to give a 140 kg patient the same initial concentration and the same average exposure as a 70 kg patient?',
    options: [
      'Both double',
      'Loading dose ×2.0, maintenance dose ×1.7',
      'Loading dose ×1.7, maintenance dose ×2.0',
      'Both ×1.7',
    ],
    correct: 1,
    explanation:
      'The initial concentration is Dose/V, so the loading dose follows volume: ×2. Average exposure is Dose/(CL·τ), so the maintenance dose follows clearance: 2^0.75 = ×1.68. Loading and maintenance doses scale differently because V and CL do.',
    tryIt: 'Tick covariate scaling, set 140 kg and look at CL and V in the "Parameter Linkage" tab.',
  },
  {
    id: 'h-tenfold',
    difficulty: 'hard',
    concept: 'Reading semi-log plots',
    prompt: 'A drug follows first-order elimination with t½ = 6.97 h. On a semi-log plot, about how long does it take for concentration to fall ten-fold?',
    options: ['About 7 h', 'About 14 h', 'About 23 h', 'About 70 h'],
    correct: 2,
    explanation:
      'A ten-fold fall takes ln(10)/ke = 2.303 / 0.0994 = 23.2 h, i.e. log₂(10) = 3.32 half-lives. Equivalently the terminal slope on a log10 axis is −ke/2.303 = −0.043 per hour.',
    tryIt: 'Switch to Semi-Log with the 1-Compartment IV model and measure the time between decades.',
  },
  {
    id: 'h-ld-ratio',
    difficulty: 'hard',
    concept: 'Loading dose',
    prompt: 'A drug (IV bolus, one compartment) has t½ = 8 h and is dosed q12h. What loading dose, as a multiple of the maintenance dose, produces the steady-state peak with the very first dose?',
    options: ['1.0 ×', 'About 1.5 ×', '2.0 ×', '3.0 ×'],
    correct: 1,
    explanation:
      'The loading dose equals the maintenance dose times the accumulation ratio: Rac = 1/(1 − e^(−ke·τ)) with ke·τ = 0.693 × 12/8 = 1.04 and e^(−1.04) = 0.354, so Rac = 1/0.646 = 1.55. The longer the half-life relative to the interval, the larger the loading dose multiple.',
    tryIt: 'Use 1-Compartment IV, set t½ = 8 h with q12h and compare the first peak with the steady-state peak.',
  },
  {
    id: 'h-time-above-mec',
    difficulty: 'hard',
    concept: 'Duration above MEC',
    prompt: 'Single 200 mg IV bolus: V = 48.5 L, CL = 4.82 L/h, MEC = 1 mg/L. For how long does the concentration stay above the MEC?',
    options: ['About 7 h', 'About 14 h', 'About 21 h', 'About 28 h'],
    correct: 1,
    explanation:
      'C0 = 200/48.5 = 4.12 mg/L. Time above MEC = ln(C0/MEC)/ke = ln(4.12)/0.0994 = 14.3 h. That is about two half-lives, because C0 is a little over four times the MEC. It tells you the longest interval before the first trough drops below the MEC.',
    tryIt: 'Use 1-Compartment IV, single dose, and read where the curve crosses the MEC line.',
  },

  // ───────────────────────── Expert ─────────────────────────
  {
    id: 'x-window',
    difficulty: 'expert',
    concept: 'Designing a regimen inside a window',
    prompt:
      'One-compartment IV bolus, CL = 4.82 L/h, V = 48.5 L. You want Cmax,ss = 6 mg/L (MTC) and Cmin,ss = 1 mg/L (MEC) exactly. What interval and dose achieve this?',
    options: [
      'τ ≈ 12 h, dose ≈ 200 mg',
      'τ ≈ 18 h, dose ≈ 291 mg',
      'τ ≈ 18 h, dose ≈ 243 mg',
      'τ ≈ 24 h, dose ≈ 243 mg',
    ],
    correct: 2,
    explanation:
      'Cmin/Cmax = e^(−ke·τ) = 1/6, so τ = ln 6 / ke = 1.79 / 0.0994 = 18.0 h. Then Cmax,ss = (D/V)/(1 − 1/6) = 6, so D/V = 5 mg/L and D = 5 × 48.5 = 243 mg. The 291 mg answer wrongly sets D/V = Cmax and ignores accumulation. Any longer τ drops the trough below the MEC.',
    tryIt: 'Select 1-Compartment IV Bolus, set the half-life to 6.97 h, dose to 243 mg and compare q12h with q24h against the shaded window.',
  },
  {
    id: 'x-tmax',
    difficulty: 'expert',
    concept: 'Absorption kinetics',
    prompt:
      'One-compartment oral model: Dose = 200 mg, V = 48.5 L, CL = 4.82 L/h, Ka = 1.25 h⁻¹ (F = 1). What are the first-dose Tmax and Cmax?',
    options: [
      'Tmax ≈ 1.1 h, Cmax ≈ 4.1 mg/L',
      'Tmax ≈ 2.2 h, Cmax ≈ 4.1 mg/L',
      'Tmax ≈ 2.2 h, Cmax ≈ 3.3 mg/L',
      'Tmax ≈ 7 h, Cmax ≈ 3.3 mg/L',
    ],
    correct: 2,
    explanation:
      'ke = 4.82/48.5 = 0.0994 h⁻¹. Tmax = ln(Ka/ke)/(Ka − ke) = ln(12.58)/1.1506 = 2.2 h. Plugging into the Bateman equation, Cmax = [Dose·Ka/(V(Ka − ke))]·(e^(−ke·Tmax) − e^(−Ka·Tmax)) = 4.48 × 0.740 = 3.3 mg/L. Dose/V = 4.1 mg/L is only the IV-bolus ceiling: elimination is already removing drug while it is still being absorbed.',
    tryIt: 'Pick the 1-Compartment Oral model with 1 dose and read the first peak (hover the curve).',
  },
  {
    id: 'x-tmdd-total',
    difficulty: 'expert',
    concept: 'Total target under sustained saturation',
    prompt:
      'TMDD with R0 = 5 nM, kdeg = 0.05 h⁻¹ and complex internalization kint = 0.02 h⁻¹. Drug exposure is high enough to keep virtually all target bound for a long time. Where does the TOTAL target (free + complex) settle?',
    options: ['About 5 nM (unchanged)', 'About 12.5 nM', 'About 2 nM', 'About 0.25 nM'],
    correct: 1,
    explanation:
      'With ksyn = R0·kdeg = 0.25 nM/h, total target obeys dR_tot/dt = ksyn − kdeg·R_free − kint·RL. If free target is ≈ 0 and all target is complexed, the loss is only kint·R_tot, so R_tot → ksyn/kint = 0.25/0.02 = 12.5 nM, i.e. 2.5 × baseline. The complex is internalized more slowly than free target is degraded (kint < kdeg), so binding protects target from degradation and total target accumulates even though free target is suppressed. If kint were larger than kdeg, total target would instead fall below baseline.',
    tryIt: 'Select a TMDD model and compare "Min free target at SS" when you vary kint relative to kdeg.',
  },
  {
    id: 'm-terminal-half-life',
    difficulty: 'hard',
    concept: 'Multi-compartment half-life',
    prompt:
      'A 3-compartment model has disposition exponents α > β > γ. Which one determines the terminal half-life, and how is the half-life calculated?',
    options: [
      'γ (the slowest exponent): t½ = 0.693 / γ',
      'α (the fastest exponent): t½ = 0.693 / α',
      'The average of α, β and γ',
      'It is always 0.693·V1/CL, whatever the number of compartments',
    ],
    correct: 0,
    explanation:
      'Late after a dose the faster exponentials have decayed away and only exp(−γ·t) remains, so the log-concentration line has slope −γ. 0.693·V1/CL is just the half-life of the central compartment if there were no distribution; the real terminal half-life is longer because drug returns from the peripheral compartments.',
    tryIt: 'Open a 3-compartment model and compare the "Terminal t1/2" line in the left panel with the central t1/2 above it.',
  },
  {
    id: 'm-iv-initial',
    difficulty: 'hard',
    concept: 'IV bolus initial concentration',
    prompt:
      '200 mg is given as an IV bolus (V1 = 48.5 L). Does adding a second and a third compartment change the concentration immediately after the dose?',
    options: [
      'No: C(0) = Dose/V1 = 4.12 mg/L for 1, 2 or 3 compartments; the extra compartments only change how fast it falls',
      'Yes: it falls, because drug instantly enters the peripheral compartments',
      'Yes: it rises, because the volume of distribution grows',
      'It depends on the inter-compartmental clearances Q2 and Q3',
    ],
    correct: 0,
    explanation:
      'At t = 0 the whole dose is in the central compartment, so C(0) = Dose/V1 whatever the peripheral structure. (The coefficients of the exponentials always sum to 1.) Distribution then lowers the concentration quickly, at a rate set by Q and the peripheral volumes.',
    tryIt: 'Compare the first point of 1-, 2- and 3-compartment IV Bolus curves with 1 dose.',
  },
  {
    id: 'm-cavg-structure',
    difficulty: 'hard',
    concept: 'Cavg and model structure',
    prompt:
      'At true steady state, which parameters set the average concentration Cavg,ss of a linear drug with 3-compartment disposition?',
    options: [
      'Dose, CL and the dosing interval only (Cavg,ss = Dose/(CL·τ)); Q2, Q3, V2, V3 do not matter',
      'Dose, CL and the terminal half-life',
      'Dose, V1 and the interval',
      'All the volumes and inter-compartmental clearances',
    ],
    correct: 0,
    explanation:
      'AUC over one interval at steady state equals Dose/CL for any linear model, so Cavg,ss = Dose/(CL·τ). Peripheral compartments change the shape (peak, trough, how long it takes to reach steady state) but not the average. With a long terminal phase the plotted regimen needs many doses to get there, but the steady-state value itself is unchanged.',
    tryIt: 'Change V3 or Q3 and watch Cmax,ss and Cmin,ss move while Cavg,ss stays exactly at Dose/(CL·τ); the "Last simulated dose" row shows how far the plotted doses are from steady state.',
  },
];
