import React from 'react';
import { ER_EXPOSURE_SOURCES, ER_LOG_BASES, ER_MODELS, ER_PARAM_UI as R } from '../../config/appConfig';
import { concForEffect } from '../../er/erEngine';
import type { ErModel, ErPop, ExposureSource, LogBase } from '../../er/erTypes';
import { PopEditHeader, PopTabStrip } from './PopTabs';
import { ParamSlider, Segmented, label, muted, panelCard } from './ui';

export const ER_EQUATION: Record<ErModel, string> = {
  linear: 'E = E0 + β·C',
  loglinear: 'E = E0 + β·ln(C)',
  emax: 'E = E0 + Emax·C / (EC50 + C)',
  sigmoid: 'E = E0 + Emax·C^γ / (EC50^γ + C^γ)',
  hockey: 'E = E0 (C ≤ Ct);  E0 + β·(C − Ct) (C > Ct)',
};

interface Props {
  isDark: boolean;
  model: ErModel;
  pops: ErPop[];
  activeIdx: number;
  visible: boolean[];
  /** reference exposure resolved for each population (mg/L) and a one-line description of where it came from */
  exposures: { value: number; note: string }[];
  onSelect: (i: number) => void;
  onChange: (patch: Partial<ErPop>) => void;
  onCopyFrom: (src: number) => void;
}

export const ErPopulationPanel: React.FC<Props> = ({
  isDark, model, pops, activeIdx, visible, exposures, onSelect, onChange, onCopyFrom,
}) => {
  const p = pops[activeIdx];
  const exp = exposures[activeIdx];
  const pos = (key: keyof typeof R & keyof ErPop) => (v: number) =>
    onChange({ [key]: Math.max(R[key].clampMin, v) } as Partial<ErPop>);

  const heading = (txt: string, extra?: React.ReactNode) => (
    <div className="flex items-center justify-between mb-3 gap-2">
      <h4 className="font-semibold uppercase tracking-wider text-[11px] text-blue-600 dark:text-blue-400">{txt}</h4>
      {extra}
    </div>
  );

  // Switching the log base converts β so the plotted curve is unchanged: β(log10) = β(ln) · ln 10
  const setBase = (b: LogBase) => {
    if (b === p.logBase) return;
    const betaLog = b === 'log10' ? p.betaLog * Math.LN10 : p.betaLog / Math.LN10;
    onChange({ logBase: b, betaLog: Number(betaLog.toFixed(4)) });
  };

  const target = concForEffect(model, p, p.targetEffect);
  const targetText =
    target.kind === 'value' ? `${target.c.toPrecision(4)} mg/L`
      : target.kind === 'atMost' ? `any C ≤ ${target.c.toPrecision(3)} mg/L (already at baseline)`
        : `not reachable (${target.reason})`;
  const modelLabel = ER_MODELS.find((m) => m.value === model)?.label ?? model;

  return (
    <div className={`w-full lg:w-(--panel-w) shrink-0 border-r overflow-y-auto text-xs ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
    }`}>
      <PopTabStrip isDark={isDark} activeIdx={activeIdx} visible={visible} onSelect={onSelect} />

      <div className="p-4 space-y-4">
        <PopEditHeader isDark={isDark} activeIdx={activeIdx} visible={visible} onCopyFrom={onCopyFrom} />

        {/* Model parameters */}
        <div className={panelCard(isDark)}>
          {heading(`${modelLabel} parameters`)}
          <div className={`mb-3 rounded border px-2 py-1.5 font-mono text-[11px] ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
          }`}>
            {model === 'loglinear' && p.logBase === 'log10' ? 'E = E0 + β·log10(C)' : ER_EQUATION[model]}
          </div>

          {model === 'linear' && (
            <>
              <ParamSlider isDark={isDark} label="Baseline effect (E0):" unit="effect" value={p.e0} onChange={(v) => onChange({ e0: v })}
                {...R.e0} accent="emerald" />
              <ParamSlider isDark={isDark} label="Slope (β):" unit="effect per mg/L" value={p.beta} onChange={pos('beta')}
                {...R.beta} accent="blue" decimals={3} />
            </>
          )}

          {model === 'loglinear' && (
            <>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className={`font-mono ${label(isDark)}`}>Log base:</span>
                <Segmented isDark={isDark} value={p.logBase} options={ER_LOG_BASES} onChange={(v) => setBase(v as LogBase)} />
              </div>
              <ParamSlider isDark={isDark} label="E0 (effect at C = 1 mg/L):" unit="effect" value={p.logE1} onChange={(v) => onChange({ logE1: v })}
                {...R.logE1} accent="emerald" />
              <ParamSlider isDark={isDark} label={`Slope (β per ${p.logBase === 'ln' ? 'ln' : 'log10'} unit):`} unit="effect" value={p.betaLog} onChange={pos('betaLog')}
                {...R.betaLog} accent="blue" decimals={3} />
              <p className={`text-[10px] ${muted(isDark)}`}>
                ln(1) = 0, so E0 is the effect at 1 mg/L; the model has no baseline at C = 0 (E → −∞). Changing the log base rescales β
                (β<sub>log10</sub> = β<sub>ln</sub>·ln 10) so the curve itself does not move.
              </p>
            </>
          )}

          {(model === 'emax' || model === 'sigmoid') && (
            <>
              <ParamSlider isDark={isDark} label="Baseline effect (E0):" unit="effect" value={p.e0} onChange={(v) => onChange({ e0: v })}
                {...R.e0} accent="emerald" />
              <ParamSlider isDark={isDark} label="Maximum drug effect (Emax):" unit="effect" value={p.emax} onChange={pos('emax')}
                {...R.emax} accent="blue" />
              <ParamSlider isDark={isDark} label="Potency (EC50):" unit="mg/L" value={p.ec50} onChange={pos('ec50')}
                {...R.ec50} accent="amber" decimals={3} />
              {model === 'sigmoid' && (
                <ParamSlider isDark={isDark} label="Hill coefficient (γ):" unit="" value={p.gamma} onChange={pos('gamma')}
                  {...R.gamma} accent="purple" decimals={2} />
              )}
              <p className={`text-[10px] ${muted(isDark)}`}>
                Plateau E0 + Emax = <strong className={label(isDark)}>{(p.e0 + p.emax).toPrecision(4)}</strong>
                {' · '}E at EC50 = <strong className={label(isDark)}>{(p.e0 + p.emax / 2).toPrecision(4)}</strong>
              </p>
            </>
          )}

          {model === 'hockey' && (
            <>
              <ParamSlider isDark={isDark} label="Baseline effect (E0):" unit="effect" value={p.e0} onChange={(v) => onChange({ e0: v })}
                {...R.e0} accent="emerald" />
              <ParamSlider isDark={isDark} label="Threshold (Ct):" unit="mg/L" value={p.ct} onChange={(v) => onChange({ ct: Math.max(0, v) })}
                {...R.ct} accent="amber" decimals={2} />
              <ParamSlider isDark={isDark} label="Slope above threshold (β):" unit="effect per mg/L" value={p.beta} onChange={pos('beta')}
                {...R.beta} accent="blue" decimals={3} />
            </>
          )}
        </div>

        {/* Exposure */}
        <div className={panelCard(isDark)}>
          {heading('Reference Exposure')}
          <div className="mb-3">
            <Segmented isDark={isDark} value={p.exposureSource} options={ER_EXPOSURE_SOURCES}
              onChange={(v) => onChange({ exposureSource: v as ExposureSource })} />
          </div>
          {p.exposureSource === 'manual' ? (
            <ParamSlider isDark={isDark} label="Exposure (C):" unit="mg/L" value={p.cManual} onChange={pos('cManual')}
              {...R.cManual} accent="blue" decimals={3} />
          ) : (
            <div className={`font-mono text-[11px] space-y-1 ${muted(isDark)}`}>
              <div>
                C = <strong className={`text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{exp.value.toFixed(3)} mg/L</strong>
              </div>
              <div className="text-[10px] leading-snug">{exp.note}</div>
              <div className="text-[10px] leading-snug">
                Taken from this population’s Population PK simulation. Edit the PK model, dose and regimen under
                Analysis → Population PK.
              </div>
            </div>
          )}
        </div>

        {/* Target effect */}
        <div className={panelCard(isDark)}>
          {heading('Target Effect')}
          <ParamSlider isDark={isDark} label="Desired effect (E*):" unit="effect" value={p.targetEffect} onChange={(v) => onChange({ targetEffect: v })}
            {...R.targetEffect} accent="rose" />
          <div className={`font-mono text-[11px] ${muted(isDark)}`}>
            C needed for E* = <strong className={`text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{targetText}</strong>
          </div>
          <p className={`mt-1 text-[10px] ${muted(isDark)}`}>
            Found by inverting the model analytically. The target line and its concentration are drawn on the chart for the population being edited.
          </p>
        </div>
      </div>
    </div>
  );
};
