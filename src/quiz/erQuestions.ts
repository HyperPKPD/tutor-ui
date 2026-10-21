/**
 * Exposure–response quiz pool. Questions tagged with `models` are only drawn when one of those ER models is
 * selected; untagged questions are general and appear for every ER model.
 * All numeric answer keys were checked against the same maths the simulator uses (src/er/erEngine.ts).
 */
import type { ErModel } from '../er/erTypes';
import type { QuizQuestion } from './quizQuestions';

export interface ErQuizQuestion extends QuizQuestion {
  /** ER models this question is about; omitted = general (all models) */
  models?: ErModel[];
}

type Q = Omit<ErQuizQuestion, 'options' | 'correct'> & { options: [string, string, string, string]; correct: 0 | 1 | 2 | 3 };
const q = (x: Q): ErQuizQuestion => x;

export const ER_QUESTIONS: ErQuizQuestion[] = [
  // ───────────── General (all ER models) ─────────────
  q({
    id: 'er-metric', difficulty: 'core', concept: 'Exposure metric',
    prompt: 'The same patient is evaluated with Cmax,ss, Cavg,ss and Cmin,ss as the exposure driving an Emax model. Why do the predicted effects differ?',
    options: [
      'Each metric is a different concentration (Cmax,ss > Cavg,ss > Cmin,ss), so each lands at a different point on the same curve',
      'Each metric changes EC50',
      'Each metric changes Emax',
      'The effect model is re-fitted for every metric automatically',
    ],
    correct: 0,
    explanation: 'The curve E(C) is fixed by its parameters. Choosing a different exposure metric just changes the concentration you read off it. Which metric best explains response (peak, average or trough) is itself something an analysis has to establish.',
    tryIt: 'Switch the Reference Exposure between Cavg,ss, Cmax,ss and Cmin,ss and watch the dot move along the curve.',
  }),
  q({
    id: 'er-saturate', difficulty: 'core', concept: 'Model shapes',
    prompt: 'Which models can saturate, i.e. approach a maximum effect as concentration keeps increasing?',
    options: [
      'Emax and sigmoidal Emax only',
      'Linear and hockey-stick',
      'Log-linear and hockey-stick',
      'All five models',
    ],
    correct: 0,
    explanation: 'Only the Emax family has a finite plateau, E0 + Emax. Linear and hockey-stick rise linearly forever, and log-linear keeps rising (ever more slowly) without bound.',
  }),
  q({
    id: 'er-which-threshold', difficulty: 'core', concept: 'Model choice',
    prompt: 'A biomarker does not move at all until drug concentration passes a minimum level, then rises roughly in proportion to concentration. Which model is the natural description?',
    options: ['Hockey-stick (threshold)', 'Log-linear', 'Emax', 'Linear with a positive intercept'],
    correct: 0,
    explanation: 'The hockey-stick is flat at E0 up to the threshold Ct and linear above it. A plain linear model would predict an effect at any concentration above zero.',
  }),
  q({
    id: 'er-narrow-range', difficulty: 'core', concept: 'Model choice',
    prompt: 'Observed exposures all lie far below EC50, where the true curve is almost straight. Which simple model describes them adequately?',
    options: ['Linear', 'Hockey-stick with a large threshold', 'Sigmoidal Emax with γ = 8', 'None: any data need an Emax model'],
    correct: 0,
    explanation: 'Over a short stretch far below saturation every smooth curve is close to a straight line, so a linear model is adequate there. The catch is extrapolation: it cannot be trusted at higher exposures.',
  }),
  q({
    id: 'er-dose-doubling', difficulty: 'hard', concept: 'Dose → effect',
    prompt: 'A drug has linear PK, so doubling the dose doubles Cavg,ss. Which statement about the effect change is correct?',
    options: [
      'In a linear ER model E − E0 exactly doubles; in an Emax model it rises by less than double',
      'In every ER model E − E0 exactly doubles',
      'In a log-linear model E itself doubles',
      'In an Emax model E − E0 rises by more than double',
    ],
    correct: 0,
    explanation: 'Linear: E − E0 = β·C, so doubling C doubles it. Emax: the curve flattens, so the gain is less than double. Log-linear: E rises by a constant β·ln 2 whatever C is. Hockey-stick above threshold: E − E0 = β(C − Ct), which more than doubles when Ct > 0.',
    tryIt: 'Double the dose on the Population PK page, then compare the effect change on the Exposure Response page.',
  }),
  q({
    id: 'er-dose-for-target', difficulty: 'hard', concept: 'Target exposure',
    prompt: 'For a drug with linear PK, 200 mg gives Cavg,ss = 4 mg/L. The ER model says 12 mg/L is needed for the target effect. What dose is expected to reach it?',
    options: ['600 mg', '400 mg', '800 mg', '1,200 mg'],
    correct: 0,
    explanation: 'With linear PK, Cavg,ss is proportional to dose, so the dose scales by 12 / 4 = 3: 200 mg × 3 = 600 mg. (This does not hold for saturable PK such as TMDD.)',
  }),
  q({
    id: 'er-pop-diff', difficulty: 'core', concept: 'Populations',
    prompt: 'Two populations have the same exposure and the same Emax and E0, but population B has a lower EC50. At that exposure, population B has:',
    options: [
      'A larger effect, because its curve is shifted to the left (more potent)',
      'A smaller effect',
      'The same effect, because EC50 only changes the plateau',
      'A higher plateau',
    ],
    correct: 0,
    explanation: 'Lower EC50 = greater potency: the same concentration is a larger fraction of EC50 and therefore gives a larger fraction of Emax. EC50 does not change the plateau.',
    tryIt: 'In the Emax model, copy Population 1 to Population 2, then reduce Population 2’s EC50.',
  }),

  // ───────────── Linear ─────────────
  q({
    id: 'er-lin-beta', difficulty: 'core', concept: 'Linear · slope', models: ['linear'],
    prompt: 'In E = E0 + β·C, what does β represent?',
    options: [
      'The change in effect per 1 mg/L increase in concentration, the same everywhere on the curve',
      'The concentration giving half of the maximal effect',
      'The baseline effect with no drug',
      'The maximum possible effect',
    ],
    correct: 0,
    explanation: 'β is the (constant) slope dE/dC. There is no half-maximal concentration or maximum in a linear model.',
  }),
  q({
    id: 'er-lin-delta', difficulty: 'core', concept: 'Linear · prediction', models: ['linear'],
    prompt: 'Linear model with β = 1.5 effect units per mg/L. A patient’s exposure rises from 2 to 3.2 mg/L. By how much does the effect change?',
    options: ['+1.8', '+1.2', '+4.8', '+0.8'],
    correct: 0,
    explanation: 'ΔE = β·ΔC = 1.5 × (3.2 − 2) = 1.8. E0 cancels out of any difference.',
  }),
  q({
    id: 'er-lin-inverse', difficulty: 'hard', concept: 'Linear · inverse', models: ['linear'],
    prompt: 'Linear model with E0 = 5 and β = 1.0 per mg/L. What concentration gives a target effect of 35?',
    options: ['30 mg/L', '35 mg/L', '40 mg/L', '36 mg/L'],
    correct: 0,
    explanation: 'C = (E − E0)/β = (35 − 5)/1.0 = 30 mg/L. Forgetting to subtract the baseline gives 35.',
    tryIt: 'Select Linear, set the Target effect to 35 and read “C needed for E*”.',
  }),
  q({
    id: 'er-lin-extrap', difficulty: 'hard', concept: 'Linear · limits', models: ['linear'],
    prompt: 'Linear model with E0 = 5 and β = 1 predicts E = 105 at C = 100 mg/L. If the effect is a percentage that cannot exceed 100, what does this show?',
    options: [
      'The linear model is being extrapolated beyond where it is valid; a saturating model is needed there',
      'The slope β must be wrong',
      'E0 must be negative',
      'The exposure must have been measured incorrectly',
    ],
    correct: 0,
    explanation: 'A line has no upper bound. Real effects saturate, so a linear fit is only dependable over the exposure range it was built on.',
  }),
  q({
    id: 'er-lin-baseline', difficulty: 'core', concept: 'Linear · baseline', models: ['linear'],
    prompt: 'Increasing only E0 in a linear model (β unchanged) does what?',
    options: [
      'Moves the whole line up by the same amount; the slope is unchanged',
      'Steepens the line',
      'Makes the line saturate',
      'Moves the line to the right',
    ],
    correct: 0,
    explanation: 'E0 is the intercept. It shifts every predicted effect equally, so differences between exposures are unchanged.',
  }),

  q({
    id: 'er-lin-compare', difficulty: 'core', concept: 'Linear · populations', models: ['linear'],
    prompt: 'Two populations both have E0 = 5 and are exposed to 5 mg/L. Population 1 has β = 1.0 and population 3 has β = 0.6 per mg/L. How much larger is the predicted effect in population 1?',
    options: ['2.0', '0.4', '5.0', '1.0'],
    correct: 0,
    explanation: 'E1 = 5 + 1.0 × 5 = 10 and E3 = 5 + 0.6 × 5 = 8, a difference of 2.0 (= Δβ × C = 0.4 × 5). The baseline is the same, so it cancels.',
    tryIt: 'Compare Population 1 and 3 in the Linear model with the exposure set to Manual = 5 mg/L.',
  }),
  q({
    id: 'er-lin-halve', difficulty: 'hard', concept: 'Linear · scaling', models: ['linear'],
    prompt: 'In a linear ER model with E0 = 5, you want to halve the drug-induced part of the effect (E − E0). What must happen to exposure?',
    options: ['It must be halved', 'It must fall by a factor of √2', 'It must fall to a quarter', 'Nothing: E0 sets the effect'],
    correct: 0,
    explanation: 'E − E0 = β·C is proportional to C, so halving C halves the drug effect. Note that the total effect E does not halve, because E0 stays.',
  }),
  q({
    id: 'er-lin-zero', difficulty: 'core', concept: 'Linear · baseline', models: ['linear'],
    prompt: 'What is the predicted effect at zero concentration in E = E0 + β·C?',
    options: ['E0', 'β', '0, always', 'E0 + β'],
    correct: 0,
    explanation: 'At C = 0 the drug term vanishes, leaving the baseline E0 (which is not necessarily zero).',
  }),

  // ───────────── Log-linear ─────────────
  q({
    id: 'er-log-axis', difficulty: 'core', concept: 'Log-linear · shape', models: ['loglinear'],
    prompt: 'How does E = E0 + β·ln(C) look when plotted against concentration?',
    options: [
      'A straight line on a log concentration axis; a curve that flattens on a linear axis',
      'A straight line on a linear axis',
      'An S-shape on a log axis that reaches a plateau',
      'A flat line followed by a straight line',
    ],
    correct: 0,
    explanation: 'E is linear in ln(C), so it is straight on a log-x axis. On a linear axis the slope β/C falls as C rises, so the curve flattens (without ever reaching a plateau).',
    tryIt: 'Toggle Linear x / Log x on the chart with the Log-linear model selected.',
  }),
  q({
    id: 'er-log-e0', difficulty: 'core', concept: 'Log-linear · intercept', models: ['loglinear'],
    prompt: 'In E = E0 + β·ln(C), what does E0 represent?',
    options: [
      'The effect at C = 1 (in the concentration unit used), because ln(1) = 0',
      'The effect at zero concentration',
      'The maximum effect',
      'The concentration giving half the maximal effect',
    ],
    correct: 0,
    explanation: 'ln(C) = 0 at C = 1, so E0 is the effect at 1 mg/L. The model has no value at C = 0 (E → −∞), so there is no true “baseline”.',
  }),
  q({
    id: 'er-log-doubling', difficulty: 'hard', concept: 'Log-linear · doubling', models: ['loglinear'],
    prompt: 'E = E0 + 8·ln(C). How much does the effect increase each time exposure doubles?',
    options: ['5.55', '8.00', '2.41', '16.0'],
    correct: 0,
    explanation: 'ΔE = 8·ln(2C) − 8·ln(C) = 8·ln 2 = 5.55, regardless of C. 2.41 would be 8·log10(2), i.e. the wrong log base.',
    tryIt: 'Compare E at C and 2C on the chart’s hover tooltip.',
  }),
  q({
    id: 'er-log-base', difficulty: 'hard', concept: 'Log-linear · log base', models: ['loglinear'],
    prompt: 'A fit reports β = 20 per log10(C) unit. What is the equivalent β per ln(C)?',
    options: ['8.69', '46.05', '13.86', '20'],
    correct: 0,
    explanation: 'ln C = ln 10 · log10 C, so β(ln) = β(log10)/ln 10 = 20/2.3026 = 8.69. (46.05 = 20 × ln 10 goes the wrong way.)',
    tryIt: 'Switch the Log base in the left panel: β is rescaled and the curve does not move.',
  }),
  q({
    id: 'er-log-units', difficulty: 'hard', concept: 'Log-linear · units', models: ['loglinear'],
    prompt: 'A log-linear model E = E0 + 8·ln(C) is refitted with concentration in µg/L instead of mg/L (C′ = 1000·C). What changes?',
    options: [
      'β stays 8, but E0 (the effect at C′ = 1) falls by 8·ln 1000 = 55.3',
      'β becomes 8,000 and E0 is unchanged',
      'Nothing changes',
      'β stays 8 and E0 rises by 55.3',
    ],
    correct: 0,
    explanation: 'E = E0 + 8·ln(C′/1000) = (E0 − 8·ln 1000) + 8·ln C′. The slope per log unit is unit-free, but the intercept is defined at C = 1 in whatever unit is used.',
  }),
  q({
    id: 'er-log-low', difficulty: 'hard', concept: 'Log-linear · limits', models: ['loglinear'],
    prompt: 'A log-linear model fits mid-range data well. What does it predict as C → 0 and why is that a problem?',
    options: [
      'E → −∞, whereas real drugs approach a finite baseline; it is only valid in the mid-range',
      'E → E0, which matches a real baseline',
      'E → 0, so the model is exact',
      'E reaches a plateau at the lowest concentrations',
    ],
    correct: 0,
    explanation: 'ln(C) → −∞ as C → 0, so the predicted effect is unbounded below. Likewise it never plateaus at high C. Use it only over the range where the true curve looks log-linear (roughly 20–80% of maximal effect).',
  }),
  q({
    id: 'er-log-inverse', difficulty: 'hard', concept: 'Log-linear · inverse', models: ['loglinear'],
    prompt: 'E = 40 + 8·ln(C) (C in mg/L). What concentration gives E = 50?',
    options: ['3.49 mg/L', '1.25 mg/L', '12.5 mg/L', '6.25 mg/L'],
    correct: 0,
    explanation: 'ln(C) = (50 − 40)/8 = 1.25, so C = e^1.25 = 3.49 mg/L. 1.25 is ln C, not C.',
    tryIt: 'Set E0 = 40, β = 8, Target effect = 50 on the Log-linear model.',
  }),
  q({
    id: 'er-log-slope', difficulty: 'core', concept: 'Log-linear · slope', models: ['loglinear'],
    prompt: 'For E = E0 + β·ln(C), how does the local slope dE/dC at C = 4 mg/L compare with the slope at C = 2 mg/L?',
    options: ['Half as large', 'The same', 'Twice as large', 'A quarter as large'],
    correct: 0,
    explanation: 'dE/dC = β/C, so doubling C halves the slope. That is the diminishing return you see on a linear axis.',
  }),

  // ───────────── Emax & sigmoidal Emax (shared) ─────────────
  q({
    id: 'er-ec50', difficulty: 'core', concept: 'EC50', models: ['emax', 'sigmoid'],
    prompt: 'What does EC50 represent in the Emax and sigmoidal Emax models?',
    options: [
      'The concentration producing half of the maximal drug effect (Emax/2 above baseline)',
      'The concentration at which E reaches E0 + Emax',
      'The concentration at which the curve is steepest',
      'The concentration that produces an effect in 50% of subjects',
    ],
    correct: 0,
    explanation: 'At C = EC50: E = E0 + Emax/2. It measures potency, and the plateau E0 + Emax is only approached asymptotically.',
  }),
  q({
    id: 'er-at-ec50', difficulty: 'core', concept: 'Emax · prediction', models: ['emax'],
    prompt: 'Emax model with E0 = 5, Emax = 95 and EC50 = 3 mg/L. What is E at C = 3 mg/L?',
    options: ['52.5', '50', '47.5', '100'],
    correct: 0,
    explanation: 'E = 5 + 95·3/(3 + 3) = 5 + 47.5 = 52.5. Half of Emax is added to the baseline. Forgetting E0 gives 47.5; 100 is the plateau.',
    tryIt: 'Select Emax and read the value in the “Worked Values” tab with exposure set to 3 mg/L.',
  }),
  q({
    id: 'er-plateau', difficulty: 'core', concept: 'Plateau', models: ['emax', 'sigmoid'],
    prompt: 'E0 = 5 and Emax = 95. As concentration becomes very large, E approaches:',
    options: ['100 (E0 + Emax)', '95 (Emax)', '5 (E0)', '52.5'],
    correct: 0,
    explanation: 'The drug adds up to Emax on top of the baseline, so the plateau is E0 + Emax = 100.',
  }),
  q({
    id: 'er-potency', difficulty: 'core', concept: 'Potency vs efficacy', models: ['emax', 'sigmoid'],
    prompt: 'Drug A has EC50 = 2 mg/L and drug B has EC50 = 8 mg/L; both have the same E0 and Emax. Which statement is correct?',
    options: [
      'A is more potent; both reach the same maximum effect',
      'B is more potent; A reaches a higher maximum',
      'A is more potent and reaches a higher maximum',
      'They are equally potent but differ in maximum effect',
    ],
    correct: 0,
    explanation: 'Potency is set by EC50 (lower = more potent); efficacy by Emax. Here only the potency differs.',
  }),
  q({
    id: 'er-ec90', difficulty: 'hard', concept: 'Emax · EC90', models: ['emax'],
    prompt: 'Emax model with EC50 = 3 mg/L. What concentration produces 90% of Emax?',
    options: ['27 mg/L', '13.5 mg/L', '9 mg/L', '30 mg/L'],
    correct: 0,
    explanation: 'C = EC50·x/(1 − x) with x = 0.9 gives 9 × EC50 = 27 mg/L. Going from 50% to 90% of Emax therefore needs a 9-fold rise in concentration.',
  }),
  q({
    id: 'er-initial-slope', difficulty: 'hard', concept: 'Emax · slope', models: ['emax'],
    prompt: 'E0 = 5, Emax = 95, EC50 = 3 mg/L. What is the slope dE/dC as C → 0?',
    options: ['31.7 per mg/L', '15.8 per mg/L', '95 per mg/L', '3.17 per mg/L'],
    correct: 0,
    explanation: 'dE/dC = Emax·EC50/(EC50 + C)². At C = 0 this is Emax/EC50 = 95/3 = 31.7. The curve is steepest at zero concentration.',
  }),
  q({
    id: 'er-slope-ratio', difficulty: 'expert', concept: 'Emax · slope', models: ['emax'],
    prompt: 'By what factor is the slope dE/dC at C = EC50 smaller than the slope at C = 0 in the Emax model?',
    options: ['4', '2', '8', 'It is the same'],
    correct: 0,
    explanation: 'Slope at 0 = Emax/EC50. At C = EC50: Emax·EC50/(2·EC50)² = Emax/(4·EC50). The ratio is 4.',
  }),
  q({
    id: 'er-emax-inverse', difficulty: 'hard', concept: 'Emax · inverse', models: ['emax'],
    prompt: 'E0 = 5, Emax = 95, EC50 = 3 mg/L. What concentration is needed for E = 80?',
    options: ['11.25 mg/L', '16.0 mg/L', '2.37 mg/L', '9.0 mg/L'],
    correct: 0,
    explanation: 'x = E − E0 = 75; C = EC50·x/(Emax − x) = 3·75/20 = 11.25 mg/L. 16.0 forgets E0; 2.37 divides by Emax; 9.0 wrongly uses the plateau (100) in place of Emax.',
    tryIt: 'Set the Target effect to 80 on the Emax model.',
  }),
  q({
    id: 'er-abs-vs-delta', difficulty: 'hard', concept: 'Emax · inverse', models: ['emax'],
    prompt: 'E0 = 5, Emax = 95, EC50 = 3 mg/L. Which concentration gives an absolute effect E = 90?',
    options: ['25.5 mg/L', '27 mg/L', '85 mg/L', '8.5 mg/L'],
    correct: 0,
    explanation: 'x = 90 − 5 = 85, so C = 3·85/(95 − 85) = 25.5 mg/L. 27 mg/L is the concentration for 90% of Emax (an effect of 90.5), which is a different target.',
  }),
  q({
    id: 'er-asymptote', difficulty: 'hard', concept: 'Emax · limits', models: ['emax'],
    prompt: 'E0 = 5, Emax = 95. What concentration gives a target effect of exactly E = 100?',
    options: [
      'None: 100 is the asymptote, which no finite concentration reaches',
      '60 mg/L (20 × EC50)',
      '27 mg/L',
      '95 mg/L',
    ],
    correct: 0,
    explanation: 'E = 100 requires x = Emax, which makes the denominator Emax − x zero, so C → ∞. Targets must be set below E0 + Emax (for example 90–95% of Emax).',
  }),
  q({
    id: 'er-dose-at-ec50', difficulty: 'hard', concept: 'Emax · diminishing returns', models: ['emax'],
    prompt: 'Exposure equals EC50 (50% of Emax). The dose of a linear-PK drug is doubled. The drug effect above baseline becomes about:',
    options: ['67% of Emax (a 1.33-fold gain)', '100% of Emax', '75% of Emax', '55% of Emax'],
    correct: 0,
    explanation: 'Fraction = C/(EC50 + C) = 2/3 at C = 2·EC50. Doubling the dose does not double the effect: 0.5 → 0.667 of Emax.',
  }),
  q({
    id: 'er-gamma1', difficulty: 'core', concept: 'Hill · γ = 1', models: ['sigmoid'],
    prompt: 'The sigmoidal Emax model with γ = 1 is identical to:',
    options: ['The Emax model', 'The linear model', 'The log-linear model', 'The hockey-stick model'],
    correct: 0,
    explanation: 'With γ = 1, C^γ/(EC50^γ + C^γ) = C/(EC50 + C), the hyperbolic Emax model.',
    tryIt: 'Set γ = 1 on the Sigmoidal Emax model: the curve matches the Emax model.',
  }),
  q({
    id: 'er-gamma-steep', difficulty: 'core', concept: 'Hill · steepness', models: ['sigmoid'],
    prompt: 'Increasing the Hill coefficient γ (EC50 and Emax fixed) makes the curve:',
    options: [
      'Steeper around EC50, with a narrower range between “little” and “full” effect',
      'Shallower around EC50',
      'Reach a higher plateau',
      'Shift to the right',
    ],
    correct: 0,
    explanation: 'γ controls steepness only. EC50 and the plateau do not move.',
  }),
  q({
    id: 'er-gamma-inv', difficulty: 'hard', concept: 'Hill · invariance', models: ['sigmoid'],
    prompt: 'EC50 = 3 mg/L. When γ is changed from 1 to 3, what happens to the effect at C = 3 mg/L?',
    options: [
      'It is unchanged: still E0 + Emax/2',
      'It increases to E0 + 0.89·Emax',
      'It decreases to E0 + 0.33·Emax',
      'It reaches the plateau',
    ],
    correct: 0,
    explanation: '(C/EC50)^γ = 1 at C = EC50 for every γ, so the fraction is 1/(1 + 1) = 0.5. All Hill curves pass through the same point at EC50.',
  }),
  q({
    id: 'er-hill-2x', difficulty: 'hard', concept: 'Hill · fraction', models: ['sigmoid'],
    prompt: 'With γ = 3, what fraction of Emax is reached at C = 2 × EC50?',
    options: ['89%', '67%', '80%', '94%'],
    correct: 0,
    explanation: 'r = 2^3 = 8, so fraction = 8/(1 + 8) = 0.889. For comparison, γ = 1 gives 67% and γ = 2 gives 80%.',
    tryIt: 'Set the exposure to Manual = 2 × EC50 and read “% of maximal effect”.',
  }),
  q({
    id: 'er-hill-window', difficulty: 'hard', concept: 'Hill · EC10–EC90', models: ['sigmoid'],
    prompt: 'For γ = 3, by what factor must concentration rise to move from 10% to 90% of Emax?',
    options: ['4.33-fold', '81-fold', '9-fold', '27-fold'],
    correct: 0,
    explanation: 'ECx = EC50·(x/(1 − x))^(1/γ), so EC90/EC10 = 81^(1/γ) = 81^(1/3) = 4.33. γ = 1 would need 81-fold and γ = 2 would need 9-fold.',
  }),
  q({
    id: 'er-hill-slope', difficulty: 'hard', concept: 'Hill · slope', models: ['sigmoid'],
    prompt: 'E0 = 5, Emax = 95, EC50 = 3 mg/L, γ = 3. What is the slope dE/dC at C = EC50?',
    options: ['23.75 per mg/L', '7.92 per mg/L', '31.7 per mg/L', '47.5 per mg/L'],
    correct: 0,
    explanation: 'At C = EC50 the slope is Emax·γ/(4·EC50) = 95·3/12 = 23.75. With γ = 1 (Emax model) it would be only 7.92.',
  }),
  q({
    id: 'er-window-gamma', difficulty: 'expert', concept: 'Hill · exposure window', models: ['sigmoid'],
    prompt: 'Two drugs have the same EC50 and Emax; drug 1 has γ = 1 and drug 2 has γ = 4. How wide is the concentration range from 10% to 90% of Emax for each?',
    options: [
      'Drug 1: 81-fold; drug 2: 3-fold',
      'Drug 1: 3-fold; drug 2: 81-fold',
      'Both 9-fold',
      'Drug 1: 9-fold; drug 2: 81-fold',
    ],
    correct: 0,
    explanation: 'EC90/EC10 = 81^(1/γ): 81^1 = 81 for γ = 1 and 81^(1/4) = 3 for γ = 4. A steep curve has a narrow exposure window, so small exposure differences between patients cause big differences in effect.',
  }),
  q({
    id: 'er-hill-drop', difficulty: 'expert', concept: 'Hill · sensitivity', models: ['sigmoid'],
    prompt: 'E0 = 5, Emax = 95, EC50 = 3. A patient’s exposure falls 20% from 3.3 to 2.64 mg/L. How does the loss of effect compare for γ = 1 and γ = 3?',
    options: [
      'About −5.3 for γ = 1 versus about −15.7 for γ = 3 (roughly 3× larger)',
      'About the same loss for both',
      'γ = 3 loses less than γ = 1',
      'About −5.3 for γ = 1 versus about −8.9 for γ = 3',
    ],
    correct: 0,
    explanation: 'γ = 1: E falls from 54.8 to 49.5 (−5.3). γ = 3: from 59.2 to 43.5 (−15.7). Near EC50 the steep curve amplifies exposure variability: slope there is Emax·γ/(4·EC50).',
  }),

  // ───────────── Hockey-stick ─────────────
  q({
    id: 'er-hs-below', difficulty: 'core', concept: 'Hockey-stick · threshold', models: ['hockey'],
    prompt: 'Hockey-stick model with E0 = 5, Ct = 2 mg/L and β = 1 per mg/L. What is E at C = 1.5 mg/L?',
    options: ['5', '4.5', '6.5', '3.5'],
    correct: 0,
    explanation: 'Below or at the threshold E = E0 = 5. The slope term only applies to the part of the concentration above Ct.',
  }),
  q({
    id: 'er-hs-above', difficulty: 'core', concept: 'Hockey-stick · prediction', models: ['hockey'],
    prompt: 'E0 = 5, Ct = 2 mg/L, β = 1 per mg/L. What is E at C = 12 mg/L?',
    options: ['15', '17', '12', '5'],
    correct: 0,
    explanation: 'E = E0 + β(C − Ct) = 5 + 1 × (12 − 2) = 15. 17 (= 5 + 12) wrongly uses the full concentration and ignores the threshold.',
  }),
  q({
    id: 'er-hs-slope', difficulty: 'core', concept: 'Hockey-stick · slope', models: ['hockey'],
    prompt: 'What is dE/dC in the hockey-stick model?',
    options: [
      '0 below the threshold and β above it',
      'β everywhere',
      'β/C everywhere',
      'Largest at C = 0',
    ],
    correct: 0,
    explanation: 'The curve is flat up to Ct and then linear with slope β. The curve is continuous at Ct, but its slope jumps from 0 to β (a kink).',
  }),
  q({
    id: 'er-hs-inverse', difficulty: 'hard', concept: 'Hockey-stick · inverse', models: ['hockey'],
    prompt: 'E0 = 5, Ct = 2 mg/L, β = 1 per mg/L. What concentration gives E = 35?',
    options: ['32 mg/L', '30 mg/L', '37 mg/L', '28 mg/L'],
    correct: 0,
    explanation: 'C = Ct + (E − E0)/β = 2 + 30/1 = 32 mg/L. 30 forgets that the line starts at Ct.',
    tryIt: 'Select Hockey-stick and set the Target effect to 35.',
  }),
  q({
    id: 'er-hs-dose', difficulty: 'expert', concept: 'Hockey-stick · threshold', models: ['hockey'],
    prompt: 'Hockey-stick with E0 = 5, Ct = 4 mg/L, β = 0.6. A patient on a linear-PK drug has Cavg,ss = 1.33 mg/L. Which statement is correct?',
    options: [
      'Doubling the dose (Cavg,ss ≈ 2.7) changes nothing; the dose must exceed about 3× before any effect appears',
      'Doubling the dose raises E by 0.8',
      'Any dose increase produces a proportional gain in E',
      'The patient has already reached the maximal effect',
    ],
    correct: 0,
    explanation: 'Effect stays at E0 until Cavg,ss exceeds Ct = 4 mg/L: 4/1.33 ≈ 3.0, so dose must rise just over 3-fold. Doubling gives 2.66 mg/L, still below the threshold. Dose changes below the threshold do nothing; above it the gain is β per mg/L.',
  }),
  q({
    id: 'er-hs-bio', difficulty: 'hard', concept: 'Hockey-stick · limits', models: ['hockey'],
    prompt: 'Why is the hockey-stick model usually an approximation rather than a mechanism?',
    options: [
      'Real responses switch on smoothly, so the sharp kink at Ct is a simplification',
      'Real responses are always linear',
      'Threshold effects never occur',
      'Real responses switch off at high concentration',
    ],
    correct: 0,
    explanation: 'The kink is a mathematical convenience. A sigmoidal Emax model with a large γ gives a smooth version of a threshold followed by a plateau.',
  }),
  q({
    id: 'er-hs-vs-lin', difficulty: 'core', concept: 'Hockey-stick · vs linear', models: ['hockey'],
    prompt: 'At a concentration below the threshold, how does the hockey-stick prediction differ from a linear model E0 + β·C with the same E0 and β?',
    options: [
      'Hockey-stick predicts no drug effect (E = E0); the linear model predicts a positive effect',
      'They give the same prediction',
      'Hockey-stick predicts a larger effect',
      'Hockey-stick predicts a negative effect',
    ],
    correct: 0,
    explanation: 'Up to Ct the hockey-stick is flat at E0. The linear model has no threshold, so it begins to rise from C = 0.',
  }),
  q({
    id: 'er-hs-metric', difficulty: 'hard', concept: 'Hockey-stick · exposure metric', models: ['hockey'],
    prompt: 'E0 = 5, Ct = 2 mg/L, β = 1. A patient has Cmin,ss = 1.2 mg/L and Cavg,ss = 3.25 mg/L. What effects are predicted from each metric?',
    options: ['5 from Cmin,ss and 6.25 from Cavg,ss', '6.2 from Cmin,ss and 8.25 from Cavg,ss', '5 from both', '5 from Cmin,ss and 8.25 from Cavg,ss'],
    correct: 0,
    explanation: 'Cmin,ss = 1.2 is below Ct, so E = E0 = 5. Cavg,ss = 3.25 is above it: 5 + 1 × (3.25 − 2) = 6.25. With a threshold model the trough can sit in the “no effect” zone while the average does not.',
  }),
  q({
    id: 'er-hs-baseline-target', difficulty: 'hard', concept: 'Hockey-stick · inverse', models: ['hockey'],
    prompt: 'E0 = 5, Ct = 2 mg/L, β = 1. What concentration is needed for a target effect of exactly 5?',
    options: [
      'Any concentration up to 2 mg/L: the effect is already at baseline, so there is no unique answer',
      '2 mg/L only',
      '5 mg/L',
      '7 mg/L',
    ],
    correct: 0,
    explanation: 'E = E0 for every C ≤ Ct, so a target equal to the baseline is met by a whole range of concentrations. Only a target above E0 has a unique inverse, C = Ct + (E − E0)/β.',
  }),
];

/** Questions to draw from for a given ER model: its own plus the general ones. */
export const erPoolFor = (model: ErModel): ErQuizQuestion[] =>
  ER_QUESTIONS.filter((x) => !x.models || x.models.includes(model));
