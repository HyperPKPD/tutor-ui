import React from 'react';
import { BookOpen } from 'lucide-react';
import { ER_MODELS, PERSISTENCE } from '../../config/appConfig';
import { usePersistedState } from '../../db/usePersistedState';
import { oneOf } from '../../db/sanitize';
import { concForEffect, ecFraction, effectAt, hasPlateau, slopeAt } from '../../er/erEngine';
import type { ErModel, ErPop } from '../../er/erTypes';
import { Segmented, surface } from './ui';

interface Props {
  isDark: boolean;
  model: ErModel;
  pop: ErPop;
  popName: string;
  popColor: string;
  cRef: number;
  exposureNote: string;
}

type Tab = 'equation' | 'params' | 'worked' | 'summary' | 'assumptions';
const TABS = ['equation', 'params', 'worked', 'summary', 'assumptions'] as const;

const g = (v: number) => (Number.isFinite(v) ? String(+v.toPrecision(5)) : '—');

export const SUMMARY: { model: ErModel; name: string; eq: string; shape: string; use: string }[] = [
  { model: 'linear', name: 'Linear', eq: 'E = E0 + β·C',
    shape: 'Straight line; constant slope β; no plateau (effect unbounded).',
    use: 'Narrow exposure range, far below saturation. Do not extrapolate beyond the observed range.' },
  { model: 'loglinear', name: 'Log-linear', eq: 'E = E0 + β·ln(C)',
    shape: 'Straight line against log C; flattens (diminishing returns) against linear C. No baseline or plateau; undefined at C ≤ 0.',
    use: 'Mid-range of a sigmoid curve (roughly 20–80% of maximal effect).' },
  { model: 'emax', name: 'Emax', eq: 'E = E0 + Emax·C / (EC50 + C)',
    shape: 'Hyperbola from E0 toward E0 + Emax; half-maximal effect at EC50; steepest at C = 0.',
    use: 'Saturable, one-to-one drug–receptor binding; the standard mechanistic default.' },
  { model: 'sigmoid', name: 'Sigmoidal Emax (Hill)', eq: 'E = E0 + Emax·C^γ / (EC50^γ + C^γ)',
    shape: 'S-shaped on a linear axis; γ sets steepness (γ = 1 reduces to Emax); half-maximal effect still at EC50.',
    use: 'Steeper-than-hyperbolic (γ > 1) or shallower (γ < 1) data; cooperative or amplified response.' },
  { model: 'hockey', name: 'Hockey-stick (threshold)', eq: 'E = E0 (C ≤ Ct);  E = E0 + β·(C − Ct) (C > Ct)',
    shape: 'Flat at E0 up to the threshold Ct, then linear with slope β (continuous at Ct).',
    use: 'A minimum concentration must be exceeded before any effect appears.' },
];

export const ErEquationsPanel: React.FC<Props> = ({ isDark, model, pop: p, popName, popColor, cRef, exposureNote }) => {
  const [tab, setTab] = usePersistedState<Tab>(PERSISTENCE.keys.erEquationsTab, 'equation', oneOf(TABS));
  const name = ER_MODELS.find((m) => m.value === model)?.label ?? model;
  const box = `p-3 rounded font-mono text-[11px] border space-y-1.5 ${
    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
  }`;
  const note = `mt-2 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`;
  const h5 = 'font-bold text-blue-600 dark:text-blue-400 mb-1.5';
  const sub = 'text-slate-500 text-[10px]';
  const lnb = p.logBase === 'ln';

  const E = effectAt(model, p, cRef);
  const slope = slopeAt(model, p, cRef);
  const E2 = effectAt(model, p, 2 * cRef);
  const inv = concForEffect(model, p, p.targetEffect);
  const x = p.targetEffect - p.e0;

  // worked substitution lines for the selected population at its reference exposure
  const worked: string[] = [];
  switch (model) {
    case 'linear':
      worked.push(`E = ${g(p.e0)} + ${g(p.beta)} × ${g(cRef)} = ${g(E)}`);
      worked.push(`dE/dC = β = ${g(p.beta)} (constant everywhere)`);
      break;
    case 'loglinear':
      worked.push(`E = ${g(p.logE1)} + ${g(p.betaLog)} × ${lnb ? 'ln' : 'log10'}(${g(cRef)}) = ${g(p.logE1)} + ${g(p.betaLog)} × ${g(lnb ? Math.log(cRef) : Math.log10(cRef))} = ${g(E)}`);
      worked.push(`dE/dC = β / ${lnb ? 'C' : 'C·ln10'} = ${g(p.betaLog)} / ${g(lnb ? cRef : cRef * Math.LN10)} = ${g(slope)} per mg/L`);
      worked.push(`Per doubling: ΔE = β·${lnb ? 'ln 2' : 'log10 2'} = ${g(p.betaLog * (lnb ? Math.LN2 : Math.log10(2)))} (independent of C)`);
      break;
    case 'emax':
      worked.push(`E = ${g(p.e0)} + ${g(p.emax)} × ${g(cRef)} / (${g(p.ec50)} + ${g(cRef)}) = ${g(E)}`);
      worked.push(`Fraction of Emax = C/(EC50 + C) = ${g(cRef / (p.ec50 + cRef))} (${g((cRef / (p.ec50 + cRef)) * 100)}%)`);
      worked.push(`dE/dC = Emax·EC50 / (EC50 + C)² = ${g(p.emax)}·${g(p.ec50)} / ${g((p.ec50 + cRef) ** 2)} = ${g(slope)} per mg/L`);
      break;
    case 'sigmoid': {
      const r = Math.pow(cRef / p.ec50, p.gamma);
      worked.push(`(C/EC50)^γ = (${g(cRef)}/${g(p.ec50)})^${g(p.gamma)} = ${g(r)}`);
      worked.push(`E = ${g(p.e0)} + ${g(p.emax)} × ${g(r)} / (1 + ${g(r)}) = ${g(E)}`);
      worked.push(`Fraction of Emax = r/(1 + r) = ${g(r / (1 + r))} (${g((r / (1 + r)) * 100)}%)`);
      worked.push(`dE/dC = Emax·γ·r / (C·(1 + r)²) = ${g(slope)} per mg/L`);
      break;
    }
    case 'hockey':
      worked.push(cRef <= p.ct
        ? `C = ${g(cRef)} ≤ Ct = ${g(p.ct)}  →  E = E0 = ${g(p.e0)}  (below threshold: no drug effect)`
        : `C = ${g(cRef)} > Ct = ${g(p.ct)}  →  E = ${g(p.e0)} + ${g(p.beta)} × (${g(cRef)} − ${g(p.ct)}) = ${g(E)}`);
      worked.push(`dE/dC = ${g(slope)} per mg/L (${cRef > p.ct ? 'β above the threshold' : '0 below the threshold'})`);
      break;
  }
  worked.push(`Doubling the exposure (${g(cRef)} → ${g(2 * cRef)} mg/L): E = ${g(E2)}, ΔE = ${g(E2 - E)}`);
  if (inv.kind === 'value') worked.push(`Target E* = ${g(p.targetEffect)} needs C = ${g(inv.c)} mg/L (inverse of the model)`);
  else if (inv.kind === 'atMost') worked.push(`Target E* = E0 = ${g(p.e0)} is met by any C ≤ Ct = ${g(inv.c)} mg/L`);
  else worked.push(`Target E* = ${g(p.targetEffect)} cannot be reached (${inv.reason})`);

  return (
    <div className={`${surface(isDark)} p-4`}>
      <div className="flex items-center justify-between mb-3 border-b pb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <BookOpen className="w-4 h-4 text-blue-500" />
          <h4 className={`font-semibold text-xs ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Exposure–Response Equations &amp; Assumptions
          </h4>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border" style={{ color: popColor, borderColor: popColor }}>
            values: {popName}
          </span>
        </div>
        <Segmented isDark={isDark} value={tab} onChange={(v) => setTab(v as Tab)}
          options={[
            { value: 'equation', label: 'Model Equation' },
            { value: 'params', label: 'Parameters' },
            { value: 'worked', label: 'Worked Values' },
            { value: 'summary', label: 'Model Summary' },
            { value: 'assumptions', label: 'Core Assumptions' },
          ]} />
      </div>

      {tab === 'equation' && (
        <div className="space-y-3 text-xs leading-relaxed">
          <h5 className={h5}>{name} model</h5>
          {model === 'linear' && (
            <>
              <div className={box}>
                <div>E = E0 + β·C</div>
                <div>dE/dC = β</div>
                <div>C = (E − E0) / β</div>
                <div className={sub}>E0 = effect with no drug; β = change in effect per 1 mg/L; C = exposure (mg/L)</div>
              </div>
              <p className={note}>The slope never changes, so effect rises without limit. It is a good local approximation when the observed exposures are small relative to EC50, but it cannot describe saturation.</p>
            </>
          )}
          {model === 'loglinear' && (
            <>
              <div className={box}>
                <div>E = E0 + β·{lnb ? 'ln' : 'log10'}(C),  C &gt; 0</div>
                <div>dE/dC = β / {lnb ? 'C' : '(C·ln 10)'}</div>
                <div>C = {lnb ? 'exp' : '10^'}( (E − E0) / β )</div>
                <div className={sub}>
                  E0 = effect at C = 1 mg/L (log 1 = 0). β(log10) = β(ln)·ln 10 ≈ 2.303·β(ln). Each 10-fold increase in C adds {lnb ? 'β·ln 10 = 2.303·β' : 'β'}; each doubling adds {lnb ? 'β·ln 2 = 0.693·β' : 'β·log10 2 = 0.301·β'}.
                </div>
              </div>
              <p className={note}>It is a straight line on a log-concentration axis and a flattening curve on a linear axis. There is no baseline or maximum: E → −∞ as C → 0 and keeps rising at high C, so use it only over the mid-range of exposures.</p>
            </>
          )}
          {model === 'emax' && (
            <>
              <div className={box}>
                <div>E = E0 + Emax·C / (EC50 + C)</div>
                <div>dE/dC = Emax·EC50 / (EC50 + C)²</div>
                <div>C = EC50·(E − E0) / (Emax − (E − E0)),  0 ≤ E − E0 &lt; Emax</div>
                <div className={sub}>E(EC50) = E0 + Emax/2 · initial slope Emax/EC50 · plateau E0 + Emax · EC90 = 9·EC50 · EC10 = EC50/9</div>
              </div>
              <p className={note}>The hyperbola is steepest at C = 0 and flattens as receptors saturate. Going from 50% to 90% of Emax needs a 9-fold rise in C.</p>
            </>
          )}
          {model === 'sigmoid' && (
            <>
              <div className={box}>
                <div>E = E0 + Emax·C^γ / (EC50^γ + C^γ)</div>
                <div>dE/dC = Emax·γ·C^(γ−1)·EC50^γ / (EC50^γ + C^γ)²</div>
                <div>C = EC50·((E − E0) / (Emax − (E − E0)))^(1/γ)</div>
                <div className={sub}>
                  E(EC50) = E0 + Emax/2 for every γ · slope at EC50 = Emax·γ/(4·EC50) · ECx = EC50·(x/(1−x))^(1/γ) · EC90/EC10 = 81^(1/γ)
                </div>
              </div>
              <p className={note}>γ = 1 gives the Emax model. Larger γ makes the transition from no effect to full effect steeper (a narrower exposure window); γ &lt; 1 makes it shallower than a hyperbola.</p>
            </>
          )}
          {model === 'hockey' && (
            <>
              <div className={box}>
                <div>E = E0                    if C ≤ Ct</div>
                <div>E = E0 + β·(C − Ct)       if C &gt; Ct</div>
                <div>dE/dC = 0 (C &lt; Ct), β (C &gt; Ct)</div>
                <div>C = Ct + (E − E0) / β,  E &gt; E0</div>
                <div className={sub}>Equivalent: E = E0 + β·max(0, C − Ct). Continuous at C = Ct but the slope jumps from 0 to β (a kink).</div>
              </div>
              <p className={note}>No drug effect is seen until exposure passes the threshold; above it the response is linear. Any target at or below E0 is already met, so only E* &gt; E0 has a unique required concentration.</p>
            </>
          )}
        </div>
      )}

      {tab === 'params' && (
        <ul className={`space-y-2 text-xs leading-relaxed list-disc pl-5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {model !== 'loglinear' && <li><strong>E0</strong> — baseline effect with no drug (C = 0). Shifts the whole curve up or down; it does not change any slope.</li>}
          {model === 'loglinear' && <li><strong>E0</strong> — effect at C = 1 mg/L (because log 1 = 0). It is a reference level, not a baseline: the model has none.</li>}
          {model === 'linear' && <li><strong>β</strong> — change in effect per 1 mg/L, constant across the range.</li>}
          {model === 'loglinear' && <li><strong>β</strong> — change in effect per unit of {lnb ? 'ln(C)' : 'log10(C)'}; doubling C always adds the same amount.</li>}
          {hasPlateau(model) && <li><strong>Emax</strong> — largest effect the drug can add above E0; the plateau is E0 + Emax.</li>}
          {hasPlateau(model) && <li><strong>EC50</strong> — concentration giving half of Emax. A <em>lower</em> EC50 means a more potent drug (the curve moves left); it does not change the plateau.</li>}
          {model === 'sigmoid' && <li><strong>γ (Hill coefficient)</strong> — steepness around EC50; does not move EC50 or the plateau. EC90/EC10 = 81^(1/γ): {g(Math.pow(81, 1 / p.gamma))}-fold for the current γ = {g(p.gamma)}.</li>}
          {model === 'hockey' && <li><strong>Ct</strong> — threshold concentration; no effect at or below it.</li>}
          {model === 'hockey' && <li><strong>β</strong> — slope above the threshold, in effect per mg/L.</li>}
          <li><strong>Reference exposure C</strong> — the steady-state concentration metric from the Population PK simulation (or entered manually). Cmax,ss &gt; Cavg,ss &gt; Cmin,ss, so the same drug gives different effects depending on which metric drives response.</li>
          <li><strong>Target effect E*</strong> — the effect you want; the required concentration is found by inverting the model.</li>
        </ul>
      )}

      {tab === 'worked' && (
        <div className="space-y-2 text-xs">
          <h5 className={h5}>{popName} · {name} · C = {g(cRef)} mg/L</h5>
          <div className={box}>{worked.map((l, i) => <div key={i}>{l}</div>)}</div>
          <p className={note}>Exposure source: {exposureNote}. All numbers update live as you change the inputs.</p>
          {hasPlateau(model) && (
            <p className={note}>
              Reference points: EC10 = {g(ecFraction(p, 0.1, model === 'emax' ? 1 : p.gamma))}, EC50 = {g(p.ec50)}, EC90 = {g(ecFraction(p, 0.9, model === 'emax' ? 1 : p.gamma))} mg/L.
            </p>
          )}
        </div>
      )}

      {tab === 'summary' && (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className={`text-left ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <th className="py-1.5 pr-3 font-normal">Model</th>
                <th className="py-1.5 pr-3 font-normal">Equation</th>
                <th className="py-1.5 pr-3 font-normal">Shape</th>
                <th className="py-1.5 font-normal">Typical use / caution</th>
              </tr>
            </thead>
            <tbody>
              {SUMMARY.map((r) => (
                <tr key={r.model} className={`border-t align-top ${isDark ? 'border-slate-800' : 'border-slate-200'} ${
                  r.model === model ? (isDark ? 'bg-blue-950/40' : 'bg-blue-50') : ''
                }`}>
                  <td className="py-1.5 pr-3 font-semibold whitespace-nowrap">{r.name}{r.model === model && ' ◄'}</td>
                  <td className="py-1.5 pr-3 font-mono">{r.eq}</td>
                  <td className="py-1.5 pr-3">{r.shape}</td>
                  <td className="py-1.5">{r.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'assumptions' && (
        <ul className={`space-y-2 text-xs leading-relaxed list-disc pl-5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <li>Effect is a <strong>direct, instantaneous, reversible</strong> function of one exposure value (no delay between concentration and effect, no hysteresis, no disease progression or tolerance).</li>
          <li>The exposure metric (Cavg,ss, Cmax,ss or Cmin,ss) is a valid surrogate for the concentration driving the response; for TMDD drugs it is the free or total drug you selected under Population PK.</li>
          <li>Parameters are <strong>typical population values</strong>: no between-subject variability, no residual error and no covariate effects on the ER parameters.</li>
          <li>Effect increases with exposure (E0, Emax, β, γ and EC50 are positive here). Effect units are arbitrary; concentration is in mg/L.</li>
          <li><strong>Extrapolation:</strong> every model is empirical. Linear and log-linear are only trustworthy over the exposure range they were fitted to; a plateau or threshold seen in simulation is only as real as the data behind it.</li>
          <li>Hill γ is an empirical steepness parameter, not necessarily the number of binding sites.</li>
        </ul>
      )}
    </div>
  );
};
