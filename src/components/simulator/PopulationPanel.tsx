import React from 'react';
import { Pill } from 'lucide-react';
import { CLINICAL_PRESETS, LN2, PARAM_UI, PARAM_UI_TMDD, PRESET_BUTTONS, TAU_OPTIONS, WINDOW_COLOR } from '../../config/appConfig';
import { isOral, isTmdd, peripheralCount, type ModelType, type PopState, type TmddRoute } from './types';
import { getEffectiveParams, macroRates } from './pkEngine';
import { ParamSlider, faint, inputCls, label, muted, panelCard } from './ui';
import { PopEditHeader, PopTabStrip } from './PopTabs';

interface Props {
  isDark: boolean;
  model: ModelType;
  route: TmddRoute;
  pops: PopState[];
  activeIdx: number;
  visible: boolean[];
  onSelect: (i: number) => void;
  onChange: (patch: Partial<PopState>) => void;
  onCopyFrom: (src: number) => void;
  onLoadMab: () => void;
  showWindow: boolean;
  onShowWindow: (v: boolean) => void;
  windowColor: string;
  onWindowColor: (c: string) => void;
}

export const PopulationPanel: React.FC<Props> = ({
  isDark, model, route, pops, activeIdx, visible, onSelect, onChange, onCopyFrom, onLoadMab, showWindow, onShowWindow, windowColor, onWindowColor,
}) => {
  const p = pops[activeIdx];
  const tmdd = isTmdd(model);
  // TMDD (antibody) models use antibody-scale slider ranges for CL, V, t1/2, Q, V2 and Ka
  const R = (tmdd ? { ...PARAM_UI, ...PARAM_UI_TMDD } : PARAM_UI) as typeof PARAM_UI;
  const nPer = peripheralCount(model);
  const eff = getEffectiveParams(p);
  const showKa = tmdd ? route === 'sc' : isOral(model);
  const termHalfLife = !tmdd && nPer > 0
    ? LN2 / macroRates(nPer, eff).lambdas.at(-1)!
    : null;

  // CL, V1 and t1/2 are linked: t1/2 = ln2 * V1 / CL
  const setCl = (v: number) => {
    const cl = Math.max(R.clearance.clampMin, v);
    onChange({ clearance: cl, halfLife: Number(((LN2 * p.volume) / cl).toFixed(2)) });
  };
  const setV = (v: number) => {
    const vol = Math.max(R.volume.clampMin, v);
    onChange({ volume: vol, halfLife: Number(((LN2 * vol) / p.clearance).toFixed(2)) });
  };
  const setT12 = (v: number) => {
    const t = Math.max(R.halfLife.clampMin, v);
    onChange({ halfLife: t, clearance: Number(((LN2 * p.volume) / t).toPrecision(4)) });
  };
  const pos = (key: keyof typeof R & keyof PopState) => (v: number) =>
    onChange({ [key]: Math.max(R[key].clampMin, v) } as Partial<PopState>);

  const heading = (txt: string, extra?: React.ReactNode) => (
    <div className="flex items-center justify-between mb-3 gap-2">
      <h4 className="font-semibold uppercase tracking-wider text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
        {txt}
      </h4>
      {extra}
    </div>
  );

  const kd = p.koff / p.kon;

  return (
    <div className={`w-full lg:w-(--panel-w) shrink-0 border-b lg:border-b-0 lg:border-r lg:overflow-y-auto text-xs ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
    }`}>
      <PopTabStrip isDark={isDark} activeIdx={activeIdx} visible={visible} onSelect={onSelect} />

      <div className="p-4 space-y-4">
        <PopEditHeader isDark={isDark} activeIdx={activeIdx} visible={visible} onCopyFrom={onCopyFrom} />

        {/* PK parameters */}
        <div className={panelCard(isDark)}>
          {heading(
            'PK Parameters (CL, Vd, t1/2)',
            <span className={`text-[10px] font-mono ${muted(isDark)}`}>t1/2 = 0.693·V/CL</span>
          )}
          <div className="flex items-center gap-1 mb-3 flex-wrap pb-1 text-[10px] font-mono">
            <span className={faint(isDark)}>Presets:</span>
            {PRESET_BUTTONS.map((b) => (
              <button
                key={b.key}
                onClick={() => onChange({ ...CLINICAL_PRESETS[b.key] })}
                className={`px-1.5 py-0.5 rounded border cursor-pointer whitespace-nowrap ${
                  isDark ? `bg-slate-900 border-slate-700 hover:bg-slate-800 ${b.tone[1]}` : `bg-white border-slate-300 hover:bg-slate-100 ${b.tone[0]}`
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <ParamSlider isDark={isDark} label="Clearance (CL/F):" unit="L/h" value={p.clearance} onChange={setCl}
            {...R.clearance} accent="blue" />
          <ParamSlider isDark={isDark} label="Volume of Dist (V1/F):" unit="L" value={p.volume} onChange={setV}
            {...R.volume} accent="emerald" />
          <ParamSlider isDark={isDark} label="Elimination t1/2:" unit="hours" value={p.halfLife} onChange={setT12}
            {...R.halfLife} accent="amber" />
          {p.useCovariateScaling && (
            <p className={`mt-2 text-[10px] font-mono ${muted(isDark)}`}>
              Covariate-adjusted (used in the simulation): CL = <strong className={label(isDark)}>{eff.cl.toPrecision(3)} L/h</strong>,
              {' '}V1 = <strong className={label(isDark)}>{eff.v1.toPrecision(3)} L</strong>,
              {' '}t1/2 = <strong className={label(isDark)}>{((LN2 * eff.v1) / eff.cl).toPrecision(3)} h</strong>
            </p>
          )}
          {tmdd && (
            <p className={`mt-2 text-[10px] ${muted(isDark)}`}>
              For TMDD models CL is the <em>non-specific</em> linear clearance (t1/2 is its linear half-life); target-mediated elimination comes on top.
            </p>
          )}
        </div>

        {/* Absorption & distribution */}
        {(showKa || nPer > 0) && (
          <div className={panelCard(isDark)}>
            {heading(nPer > 0 && showKa ? 'Absorption & Distribution' : nPer > 0 ? 'Peripheral Distribution' : 'Absorption')}
            {showKa && (
              <ParamSlider isDark={isDark} label="Absorption rate (Ka):" unit="1/h" value={p.ka} onChange={pos('ka')}
                {...R.ka} accent="purple" />
            )}
            {nPer > 0 && (
              <>
                <ParamSlider isDark={isDark} label={nPer > 1 ? 'Inter-comp CL (Q2):' : 'Inter-comp CL (Q):'} unit="L/h" value={p.intercompCl} onChange={pos('intercompCl')}
                  {...R.intercompCl} accent="rose" />
                <ParamSlider isDark={isDark} label="Peripheral vol (V2):" unit="L" value={p.volume2} onChange={pos('volume2')}
                  {...R.volume2} accent="rose" />
              </>
            )}
            {nPer > 1 && (
              <>
                <ParamSlider isDark={isDark} label="Inter-comp CL (Q3):" unit="L/h" value={p.intercompCl3} onChange={pos('intercompCl3')}
                  {...R.intercompCl3} accent="amber" />
                <ParamSlider isDark={isDark} label="Deep peripheral vol (V3):" unit="L" value={p.volume3} onChange={pos('volume3')}
                  {...R.volume3} accent="amber" />
              </>
            )}
            {termHalfLife !== null && (
              <p className={`mt-2 text-[10px] font-mono ${muted(isDark)}`}>
                Terminal t1/2 (slowest exponent) = <strong className={label(isDark)}>{termHalfLife.toFixed(1)} h</strong>
                {' '}· the t1/2 above is only the central one, 0.693·V1/CL
              </p>
            )}
          </div>
        )}

        {/* TMDD */}
        {tmdd && (
          <div className={panelCard(isDark)}>
            {heading(
              'Target-Mediated (TMDD)',
              <button
                onClick={onLoadMab}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono cursor-pointer ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
                title="Sets dose, interval, CL, V and target parameters of ALL populations to typical monoclonal-antibody values (CL ×1, ×0.5, ×2 for Pop 1/2/3)"
              >
                <Pill className="w-3 h-3" />
                <span>mAb defaults (all)</span>
              </button>
            )}
            <ParamSlider isDark={isDark} label="Baseline target (R0):" unit="nM" value={p.r0} onChange={pos('r0')}
              {...R.r0} accent="emerald" />
            <ParamSlider isDark={isDark} label="Target turnover (kdeg):" unit="1/h" value={p.kdeg} onChange={pos('kdeg')}
              {...R.kdeg} accent="amber" />
            <ParamSlider isDark={isDark} label="Binding on-rate (kon):" unit="1/nM/h" value={p.kon} onChange={pos('kon')}
              {...R.kon} accent="blue" />
            <ParamSlider isDark={isDark} label="Dissociation (koff):" unit="1/h" value={p.koff} onChange={pos('koff')}
              {...R.koff} accent="blue" />
            <ParamSlider isDark={isDark} label="Complex internalization (kint):" unit="1/h" value={p.kint} onChange={pos('kint')}
              {...R.kint} accent="rose" />
            <ParamSlider isDark={isDark} label="Molecular weight:" unit="kDa" value={p.mw} onChange={pos('mw')}
              {...R.mw} accent="purple" />
            <div className={`mt-2 font-mono text-[10px] grid grid-cols-2 gap-x-2 gap-y-0.5 ${muted(isDark)}`}>
              <span>KD = koff/kon = <strong className={label(isDark)}>{Number.isFinite(kd) ? kd.toPrecision(3) : '—'} nM</strong></span>
              <span>ksyn = R0·kdeg = <strong className={label(isDark)}>{(p.r0 * p.kdeg).toPrecision(3)} nM/h</strong></span>
            </div>
          </div>
        )}

        {/* Dosing regimen */}
        <div className={panelCard(isDark)}>
          {heading('Dosing Regimen')}
          <ParamSlider isDark={isDark} label="Dose:" unit="mg" value={p.doseMg} onChange={pos('doseMg')}
            {...R.doseMg} accent="blue" />
          <div className="space-y-1 mb-3">
            <div className="flex justify-between font-mono">
              <span className={label(isDark)}>Interval (tau):</span>
              <strong className={isDark ? 'text-white' : 'text-slate-900'}>q{p.tauHours}h</strong>
            </div>
            <div className="grid grid-cols-4 gap-1.5 mt-1 font-mono text-xs">
              {TAU_OPTIONS.map(({ hours: tau, label: tauLabel }) => (
                <button
                  key={tau}
                  onClick={() => onChange({ tauHours: tau })}
                  className={`py-1 rounded border text-center cursor-pointer ${
                    p.tauHours === tau
                      ? 'bg-blue-600 border-blue-500 text-white font-bold'
                      : isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                        : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tauLabel}
                </button>
              ))}
            </div>
          </div>
          <ParamSlider isDark={isDark} label="Number of Doses:" unit="" value={p.numDoses} onChange={(v) => onChange({ numDoses: Math.round(v) })}
            {...R.numDoses} numeric={false} accent="blue" />
        </div>

        {/* Covariates */}
        <div className={panelCard(isDark)}>
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={p.useCovariateScaling}
              onChange={(e) => onChange({ useCovariateScaling: e.target.checked })}
              className="rounded border-slate-300 text-blue-600"
            />
            <span className={`font-semibold text-[11px] uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              Apply Patient Covariate Scaling (WT &amp; CRCL)
            </span>
          </label>
          {p.useCovariateScaling && (
            <div className="pt-2">
              <ParamSlider isDark={isDark} label="Body Weight (WT):" unit="kg" value={p.patientWt} onChange={(v) => onChange({ patientWt: v })}
                {...R.patientWt} numeric={false} accent="emerald" />
              <ParamSlider isDark={isDark} label="Creatinine Clearance (CRCL):" unit="mL/min" value={p.patientCrcl} onChange={(v) => onChange({ patientCrcl: v })}
                {...R.patientCrcl} numeric={false} accent="emerald" />
            </div>
          )}
        </div>

        {/* Target window */}
        <div className={panelCard(isDark)}>
          <div className="mb-3">
            <h4 className="font-semibold uppercase tracking-wider text-[11px] text-amber-600 dark:text-amber-400">
              Target Therapeutic Window
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-3 font-mono">
            {([['mec', 'MEC (Min Effective)'], ['mtc', 'MTC (Min Toxic)']] as const).map(([key, text]) => (
              <div key={key}>
                <label className={`text-[11px] block ${muted(isDark)}`}>{text}</label>
                <input
                  type="number"
                  step={R.window.step}
                  value={p[key]}
                  onChange={(e) => onChange({ [key]: Number(e.target.value) } as Partial<PopState>)}
                  className={`w-full border rounded px-2 py-1 mt-1 ${inputCls(isDark)}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div role="radiogroup" aria-label="Show therapeutic window on chart" className="flex items-center gap-3 text-[11px] font-mono">
              <span className={muted(isDark)}>Show on graph:</span>
              {([[true, 'On'], [false, 'Off']] as const).map(([val, text]) => (
                <label key={text} className={`flex items-center gap-1 cursor-pointer ${label(isDark)}`}>
                  <input
                    type="radio"
                    name="show-therapeutic-window"
                    checked={showWindow === val}
                    onChange={() => onShowWindow(val)}
                    className="accent-amber-500 cursor-pointer"
                  />
                  <span>{text}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className={muted(isDark)}>Color:</span>
              <input type="color" aria-label="Therapeutic window color" value={windowColor}
                onChange={(e) => onWindowColor(e.target.value)}
                className="w-7 h-6 p-0 border rounded cursor-pointer bg-transparent" />
              {WINDOW_COLOR.presets.map((c) => (
                <button key={c} type="button" title={c} aria-label={`Use color ${c}`} onClick={() => onWindowColor(c)}
                  className={`w-4 h-4 rounded-full cursor-pointer border ${windowColor === c ? 'ring-2 ring-offset-1 ring-amber-500' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <p className={`mt-2 text-[10px] ${muted(isDark)}`}>
            When on, the shaded band on the chart follows the population you are editing (if it is shown). The status badges still use MEC and MTC.
          </p>
        </div>
      </div>
    </div>
  );
};

