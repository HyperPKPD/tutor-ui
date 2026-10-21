import React from 'react';
import { BookOpen } from 'lucide-react';
import { getEffectiveParams, macroRates, type SimResult } from './pkEngine';
import { isOral, isTmdd, peripheralCount, type ModelType, type PopState, type TmddRoute } from './types';
import { COVARIATES as COV, LN2, PERSISTENCE } from '../../config/appConfig';
import { usePersistedState } from '../../db/usePersistedState';
import { oneOf } from '../../db/sanitize';
import { Segmented, muted, surface } from './ui';

interface Props {
  isDark: boolean;
  model: ModelType;
  route: TmddRoute;
  pop: PopState;
  popName: string;
  popColor: string;
  result: SimResult;
}

type Tab = 'equations' | 'derivations' | 'superposition' | 'assumptions';

export const EquationsPanel: React.FC<Props> = ({ isDark, model, route, pop, popName, popColor, result }) => {
  const [tab, setTab] = usePersistedState<Tab>(PERSISTENCE.keys.equationsTab, 'equations', oneOf(['equations', 'derivations', 'superposition', 'assumptions'] as const));
  const eff = getEffectiveParams(pop);
  const ke = eff.cl / eff.v1;
  const tmdd = isTmdd(model);
  const nPer = peripheralCount(model);
  // terminal (slowest) exponent: drives accumulation for multi-compartment linear models
  const lamZ = !tmdd ? macroRates(nPer, eff).lambdas.at(-1)! : ke;

  const box = `p-3 rounded font-mono text-[11px] border space-y-1.5 ${
    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
  }`;
  const note = `mt-2 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`;
  const h5 = 'font-bold text-blue-600 dark:text-blue-400 mb-1.5';

  return (
    <div className={`${surface(isDark)} p-4`}>
      <div className="flex items-center justify-between mb-3 border-b pb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-500" />
          <h4 className={`font-semibold text-xs ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Pharmacokinetic Equations &amp; Foundational Assumptions
          </h4>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border" style={{ color: popColor, borderColor: popColor }}>
            values: {popName}
          </span>
        </div>
        <Segmented isDark={isDark} value={tab} onChange={(v) => setTab(v as Tab)}
          options={[
            { value: 'equations', label: 'Model Equations' },
            { value: 'derivations', label: 'Parameter Linkage' },
            { value: 'superposition', label: tmdd ? 'Dosing & SS' : 'Superposition & SS' },
            { value: 'assumptions', label: 'Core Assumptions' },
          ]} />
      </div>

      {tab === 'equations' && (
        <div className="space-y-3 text-xs leading-relaxed">
          {model === '3cmt_oral' && (
            <div>
              <h5 className={h5}>Three-Compartment Oral Absorption Differential Equation System</h5>
              <div className={box}>
                <div>d(Agut)/dt = -Ka · Agut</div>
                <div>d(Acentral)/dt = Ka·Agut - (k10 + k12 + k13)·Acentral + k21·A2 + k31·A3</div>
                <div>d(A2)/dt = k12·Acentral - k21·A2</div>
                <div>d(A3)/dt = k13·Acentral - k31·A3</div>
                <div className="pt-1 text-slate-500 text-[10px]">
                  k10 = CL/V1, k12 = Q2/V1, k21 = Q2/V2, k13 = Q3/V1, k31 = Q3/V3 · C(t) = Acentral(t) / V1
                </div>
              </div>
              <p className={note}>
                Integrated solution: <code>C(t) = (Dose/V1) · Σ F_i · Ka/(Ka − λ_i) · [exp(−λ_i·t) − exp(−Ka·t)]</code>, i = 1…3, where the exponents α &gt; β &gt; γ are the three roots of
                λ³ − (k10+k12+k13+k21+k31)·λ² + (k10·k21 + k10·k31 + k12·k31 + k13·k21 + k21·k31)·λ − k10·k21·k31 = 0 and
                F_i = (k21 − λ_i)(k31 − λ_i) / Π<sub>j≠i</sub>(λ_j − λ_i). The slowest exponent γ gives the terminal half-life.
              </p>
            </div>
          )}
          {model === '3cmt_iv' && (
            <div>
              <h5 className={h5}>Three-Compartment Intravenous Bolus Differential Equation System</h5>
              <div className={box}>
                <div>d(Acentral)/dt = -(k10 + k12 + k13)·Acentral + k21·A2 + k31·A3,  Acentral(0) = Dose</div>
                <div>d(A2)/dt = k12·Acentral - k21·A2</div>
                <div>d(A3)/dt = k13·Acentral - k31·A3</div>
                <div className="pt-1 text-slate-500 text-[10px]">
                  k10 = CL/V1, k12 = Q2/V1, k21 = Q2/V2, k13 = Q3/V1, k31 = Q3/V3 · C(t) = Acentral(t) / V1
                </div>
              </div>
              <p className={note}>
                Integrated solution: <code>C(t) = (Dose/V1) · [F1·exp(−α·t) + F2·exp(−β·t) + F3·exp(−γ·t)]</code>, with F_i = (k21 − λ_i)(k31 − λ_i) / Π<sub>j≠i</sub>(λ_j − λ_i) (the F_i sum to 1, so C(0) = Dose/V1) and α, β, γ the roots of
                λ³ − (k10+k12+k13+k21+k31)·λ² + (k10·k21 + k10·k31 + k12·k31 + k13·k21 + k21·k31)·λ − k10·k21·k31 = 0.
              </p>
            </div>
          )}
          {model === '2cmt_iv' && (
            <div>
              <h5 className={h5}>Two-Compartment Intravenous Bolus Differential Equation System</h5>
              <div className={box}>
                <div>d(Acentral)/dt = -(CL/V1 + Q/V1)·Acentral + (Q/V2)·Aperiph,  Acentral(0) = Dose</div>
                <div>d(Aperiph)/dt = (Q/V1)·Acentral - (Q/V2)·Aperiph</div>
                <div className="pt-1 text-slate-500 text-[10px]">where C(t) = Acentral(t) / V1</div>
              </div>
              <p className={note}>
                Integrated bi-exponential solution: <code>C(t) = (Dose/V1) · [ (k21 − α)/(β − α) · exp(−α·t) + (k21 − β)/(α − β) · exp(−β·t) ]</code>, with α, β the hybrid rate constants (distribution and terminal phases).
              </p>
            </div>
          )}
          {model === '2cmt_oral' && (
            <div>
              <h5 className={h5}>Two-Compartment Oral Absorption Differential Equation System</h5>
              <div className={box}>
                <div>d(Agut)/dt = -Ka · Agut</div>
                <div>d(Acentral)/dt = Ka · Agut - (CL/V1 + Q/V1)·Acentral + (Q/V2)·Aperiph</div>
                <div>d(Aperiph)/dt = (Q/V1)·Acentral - (Q/V2)·Aperiph</div>
                <div className="pt-1 text-slate-500 text-[10px]">where C(t) = Acentral(t) / V1</div>
              </div>
              <p className={note}>
                Integrated analytical bi-exponential solution: <code>C(t) = A·exp(-α·t) + B·exp(-β·t) - (A+B)·exp(-Ka·t)</code>, with hybrid macro-rate constants α (distribution phase) and β (terminal elimination phase), where
                {' '}<code>A = (Dose/V1)·Ka/(Ka − α)·(k21 − α)/(β − α)</code> and <code>B = (Dose/V1)·Ka/(Ka − β)·(k21 − β)/(α − β)</code>, k21 = Q/V2.
              </p>
            </div>
          )}
          {model === '1cmt_oral' && (
            <div>
              <h5 className={h5}>One-Compartment First-Order Oral Bateman Equation</h5>
              <div className={box}>
                <div>C(t) = [Dose · Ka / (V1 · (Ka - ke))] · [exp(-ke · t) - exp(-Ka · t)]</div>
                <div className="text-slate-500 text-[10px]">where ke = CL / V1, t1/2 = ln(2) / ke = 0.69315 · V1 / CL</div>
              </div>
            </div>
          )}
          {model === '1cmt_iv' && (
            <div>
              <h5 className={h5}>One-Compartment Intravenous Bolus Equation</h5>
              <div className={box}><div>C(t) = (Dose / V1) · exp(-ke · t) = C0 · exp(-(CL / V1) · t)</div></div>
            </div>
          )}
          {tmdd && (
            <div>
              <h5 className={h5}>
                Full TMDD (Mager–Jusko) · {model === 'tmdd_2cmt' ? 'Two' : 'One'}-Compartment Drug Disposition
                {route === 'sc' ? ' · first-order SC absorption' : ' · IV bolus'}
              </h5>
              <div className={box}>
                {route === 'sc' && <div>d(Agut)/dt = -Ka · Agut</div>}
                <div>
                  dL/dt = {route === 'sc' ? 'Ka·Agut/V1 - ' : '-'}(CL/V1)·L{model === 'tmdd_2cmt' ? ' - (Q/V1)·(L - Lp)' : ''} - kon·L·R + koff·RL
                </div>
                {model === 'tmdd_2cmt' && <div>dLp/dt = (Q/V2)·(L - Lp)</div>}
                <div>dR/dt = ksyn - kdeg·R - kon·L·R + koff·RL</div>
                <div>dRL/dt = kon·L·R - (koff + kint)·RL</div>
                <div className="pt-1 text-slate-500 text-[10px]">
                  L = free drug, R = free target, RL = drug–target complex (all central, nM). R(0) = R0 = ksyn/kdeg, RL(0) = 0.
                  {route === 'iv' ? ' Each dose adds Dose/(MW·V1) to L.' : ' Each dose adds Dose/MW to Agut.'}
                </div>
              </div>
              <p className={note}>
                No closed-form solution exists, so the system is integrated numerically (fourth-order Runge–Kutta, with step size adapted to the fastest rate). Plotted concentration is converted from nM to mg/L using MW. Target-mediated clearance is saturable: at low L the drug is cleared quickly via binding and internalization, at high L the target is saturated and only the linear CL remains.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'derivations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
          <div className={`p-3 rounded border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="font-bold text-blue-500 font-mono text-xs block mb-1">Clearance, Volume &amp; Half-Life Linkage</span>
            <p className={`text-[11px] mb-2 ${muted(isDark)}`}>
              Elimination half-life is a secondary (hybrid) parameter arising from the ratio of clearance to distribution volume:
            </p>
            <div className={`font-mono text-[11px] space-y-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              <div>ke = CL / V1 = {eff.cl.toFixed(2)} / {eff.v1.toFixed(1)} = {ke.toFixed(4)} h⁻¹</div>
              <div>t1/2 = ln(2) / ke = {LN2} / {ke.toFixed(4)} = {((LN2 * eff.v1) / eff.cl).toFixed(2)} hours{nPer > 0 && !tmdd ? ' (central)' : ''}</div>
              {nPer > 0 && !tmdd && (
                <div>Terminal t1/2 = ln(2) / {nPer > 1 ? 'γ' : 'β'} = {LN2} / {lamZ.toFixed(4)} = {(LN2 / lamZ).toFixed(1)} hours</div>
              )}
              {tmdd && (
                <>
                  <div className="pt-1">KD = koff / kon = {(pop.koff / pop.kon).toPrecision(3)} nM</div>
                  <div>ksyn = R0 · kdeg = {(pop.r0 * pop.kdeg).toPrecision(3)} nM/h</div>
                  <div>t1/2,target = ln(2) / kdeg = {(LN2 / pop.kdeg).toFixed(1)} h</div>
                </>
              )}
            </div>
          </div>
          <div className={`p-3 rounded border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="font-bold text-emerald-500 font-mono text-xs block mb-1">Allometric Covariate Function</span>
            <p className={`text-[11px] mb-2 ${muted(isDark)}`}>Standard physiological body weight and renal creatinine clearance power models:</p>
            <div className={`font-mono text-[11px] space-y-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              <div>CL = CL_base · (WT/{COV.refWt})^{COV.clWtExponent} · (CRCL/{COV.refCrcl})^{COV.clCrclExponent}</div>
              <div>V1, V2, V3 = V_base · (WT/{COV.refWt})^{COV.vWtExponent.toFixed(2)}</div>
              <div>Q2, Q3 = Q_base · (WT/{COV.refWt})^{COV.qWtExponent}</div>
              {pop.useCovariateScaling ? (
                <div className="pt-1 text-[10px] text-slate-500">
                  WT = {pop.patientWt} kg, CRCL = {pop.patientCrcl} mL/min → CL = {eff.cl.toPrecision(3)} L/h, V1 = {eff.v1.toPrecision(3)} L
                  {nPer > 0 && `, Q2 = ${eff.q.toPrecision(3)} L/h, V2 = ${eff.v2.toPrecision(3)} L`}
                  {nPer > 1 && `, Q3 = ${eff.q3.toPrecision(3)} L/h, V3 = ${eff.v3.toPrecision(3)} L`}
                </div>
              ) : (
                <div className="pt-1 text-[10px] text-slate-500">Covariate scaling is off for {popName}: base values are used.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'superposition' && (
        <div className={box + ' text-xs'}>
          {tmdd ? (
            <>
              <div className="font-bold text-purple-500">Superposition does not apply</div>
              <div className="font-sans text-[11px] leading-relaxed">
                Target-mediated elimination is saturable (non-linear), so doses cannot be summed from a single-dose curve. Each dose is added to the state vector at its dosing time and the ODEs are integrated through the whole regimen.
              </div>
              <div className="mt-2 font-bold text-purple-500">Steady-state exposure ({popName}):</div>
              <div>Cmax,ss = {result.cmax_ss.toFixed(2)} · Cmin,ss = {result.cmin_ss.toFixed(2)} · Cavg,ss = AUCτ/τ = {result.auc_tau.toFixed(1)} / {pop.tauHours} = {result.cavg_ss.toFixed(2)} mg/L</div>
              <div>Accumulation (Cmax,ss / Cmax,dose 1) = {result.rac.toFixed(2)}x — not 1/[1-exp(-ke·τ)], because clearance changes with concentration.</div>
              <div className="font-sans text-[11px] leading-relaxed">
                Steady state is found by continuing to dose every τ until successive intervals stop changing{result.ssConverged ? '' : ' (not fully converged here: values are approximate)'}; the last plotted dose reaches {result.lastIntervalPctSs.toFixed(0)}% of the steady-state AUC.
                Mass balance at steady state: Dose/τ = CL·L̄ + kint·V1·RL̄, so free-drug Cavg,ss is always below Dose/(CL·τ) = {(pop.doseMg / (eff.cl * pop.tauHours)).toFixed(2)} mg/L.
                Total drug (free + complex) can sit above or below that value, because the complex is removed by kint instead of CL/V1.
              </div>
              {result.rMinPct !== null && <div>Lowest free target at steady state = {result.rMinPct.toFixed(0)}% of baseline R0</div>}
            </>
          ) : (
            <>
              <div className="font-bold text-purple-500 mb-1">Linear Superposition Formula:</div>
              <div>C_total(t) = ∑ C_single(t - j·tau) for all j such that t ≥ j·tau</div>
              <div className="mt-2 font-bold text-purple-500">True steady state (infinite dose train):</div>
              <div>Css(t) = ∑_i A_i·exp(−λ_i·t) / (1 − exp(−λ_i·tau)){isOral(model) ? ' − (∑_i A_i)·exp(−Ka·t) / (1 − exp(−Ka·tau))' : ''},  0 ≤ t ≤ tau</div>
              <div className="font-sans text-[11px] text-slate-500">Each exponential term of a single dose (A_i = its coefficient) is summed over all previous doses as a geometric series. The table's Cmax,ss, Cmin,ss and time ≥ MEC come from this curve, so they are true steady-state values whatever the number of doses plotted (the last simulated dose reaches {result.lastIntervalPctSs.toFixed(0)}% of steady-state AUC).</div>
              <div className="mt-2 font-bold text-purple-500">Steady-State Accumulation Factor (Rac):</div>
              <div>Rac ≈ 1 / [1 - exp(-{nPer > 0 ? (nPer > 1 ? 'γ' : 'β') : 'ke'} · tau)] = 1 / [1 - exp(-{lamZ.toFixed(4)} · {pop.tauHours})] = {(1 / (1 - Math.exp(-lamZ * pop.tauHours))).toFixed(2)}x
                <span className="text-slate-500"> (table: Cmax,ss / Cmax,dose 1 = {result.rac.toFixed(2)}x)</span></div>
              <div className="font-sans text-[11px] text-slate-500">
                {nPer === 0 && !isOral(model)
                  ? 'For a one-compartment IV bolus the formula is exact for both peaks and troughs.'
                  : nPer === 0
                    ? 'Exact for troughs; the oral peak ratio differs slightly because the peak time shifts as drug accumulates.'
                    : 'The terminal-exponent formula describes trough (late-phase) accumulation; peaks accumulate less for multi-compartment drugs because the fast distribution phase washes out within each interval.'}
              </div>
              <div className="mt-2 font-bold text-purple-500">Average Steady-State Concentration (Cavg_ss):</div>
              <div>Cavg_ss = AUC_tau,ss / tau = (Dose · F) / (CL · tau) = ({pop.doseMg}) / ({eff.cl.toPrecision(4)} · {pop.tauHours}) = {(pop.doseMg / (eff.cl * pop.tauHours)).toFixed(2)} mg/L</div>
            </>
          )}
        </div>
      )}

      {tab === 'assumptions' && (
        <ul className={`list-disc list-inside space-y-1 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {tmdd ? (
            <>
              <li><strong>Target in the central compartment:</strong> binding, complex formation and internalization all occur in V1; the peripheral compartment holds free drug only.</li>
              <li><strong>Zero-order synthesis, first-order degradation:</strong> free target is at baseline R0 = ksyn/kdeg before the first dose.</li>
              <li><strong>Complex shares the central volume:</strong> RL is eliminated only by internalization (kint); the complex does not distribute.</li>
              <li><strong>Non-specific clearance is linear:</strong> CL is constant and in parallel with target-mediated elimination.</li>
              <li><strong>Complete bioavailability:</strong> F = 1 for the SC route (apparent parameters CL/F, V/F).</li>
              <li><strong>Stationary parameters:</strong> no time-varying CL, no anti-drug antibodies, no target up-regulation beyond turnover.</li>
              <li><strong>Mass units:</strong> the drug is assumed to bind its target 1:1; dose is converted to nmol with the molecular weight.</li>
            </>
          ) : (
            <>
              <li><strong>Linear Pharmacokinetics:</strong> Elimination and absorption clearance operate within first-order non-saturated capacities.</li>
              <li><strong>Instantaneous Mixing:</strong> The central compartment volume assumes prompt, homogenous distribution upon drug entry.</li>
              <li><strong>Stationary Clearance:</strong> Metabolic and renal clearance parameters remain constant over time (no auto-induction or time-varying clearance).</li>
              <li><strong>Complete Bioavailability:</strong> Absolute oral bioavailability factor F is assumed to equal 1.0 (apparent clearances expressed as CL/F).</li>
              <li><strong>Superposition Validity:</strong> Successive doses sum linearly without pharmacokinetic drug-drug interaction or target receptor depletion.</li>
            </>
          )}
        </ul>
      )}
    </div>
  );
};
