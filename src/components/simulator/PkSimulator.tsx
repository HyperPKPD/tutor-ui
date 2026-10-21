import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import {
  ANALYSIS_MODES, DEFAULT_ACTIVE_POP, DEFAULT_ANALYSIS_MODE, DEFAULT_ER_MODEL, DEFAULT_MODEL, DEFAULT_TMDD_READOUT,
  DEFAULT_TMDD_ROUTE, ER_EXPOSURE_SOURCES, ER_MODELS, LAYOUT, MODEL_GROUPS, PERSISTENCE, POP_COLORS, POP_COUNT, POP_NAMES,
  TMDD_READOUT_OPTIONS, TMDD_ROUTE_OPTIONS,
  type AnalysisMode,
} from '../../config/appConfig';
import { makeDefaultErPops } from '../../er/erDefaults';
import { effectAt } from '../../er/erEngine';
import type { ErModel, ErPop } from '../../er/erTypes';
import { usePersistedState } from '../../db/usePersistedState';
import * as sanitize from '../../db/sanitize';
import { makeGrid, popDuration, simulatePop, type SimResult } from './pkEngine';
import {
  applyMabDefaults, isTmdd, makeDefaultPops,
  type ModelType, type PopState, type TmddReadout, type TmddRoute,
} from './types';
import { PopulationPanel } from './PopulationPanel';
import { PkChart, type ChartSeries } from './PkChart';
import { EquationsPanel } from './EquationsPanel';
import { ErPopulationPanel } from './ErPopulationPanel';
import { ErChart, type ErSeries } from './ErChart';
import { ErMetricsTable } from './ErMetricsTable';
import { ErEquationsPanel } from './ErEquationsPanel';
import { QuizPanel } from '../../quiz/QuizPanel';
import { QUIZ_QUESTIONS } from '../../quiz/quizQuestions';
import { erPoolFor } from '../../quiz/erQuestions';
import { Segmented, muted, surface } from './ui';

const K = PERSISTENCE.keys;
const ALL_VISIBLE = Array.from({ length: POP_COUNT }, () => true);

export const PkSimulator: React.FC = () => {
  const { isDark } = useTheme();

  // Everything below is restored from IndexedDB on load and saved on every change
  const [analysisMode, setAnalysisMode] = usePersistedState<AnalysisMode>(
    K.analysisMode, DEFAULT_ANALYSIS_MODE, sanitize.oneOf(ANALYSIS_MODES.map((m) => m.value))
  );
  const [modelType, setModelType] = usePersistedState<ModelType>(
    K.model, DEFAULT_MODEL, sanitize.oneOf(MODEL_GROUPS.flatMap((g) => g.options.map((o) => o.value)))
  );
  const [tmddRoute, setTmddRoute] = usePersistedState<TmddRoute>(
    K.route, DEFAULT_TMDD_ROUTE, sanitize.oneOf(TMDD_ROUTE_OPTIONS.map((o) => o.value))
  );
  const [tmddReadout, setTmddReadout] = usePersistedState<TmddReadout>(
    K.readout, DEFAULT_TMDD_READOUT, sanitize.oneOf(TMDD_READOUT_OPTIONS.map((o) => o.value))
  );
  const [pops, setPops] = usePersistedState<PopState[]>(K.pops, makeDefaultPops(), sanitize.pops);
  const [activeIdx, setActiveIdx] = usePersistedState<number>(K.activeIdx, DEFAULT_ACTIVE_POP, sanitize.index(POP_COUNT));
  const [visible, setVisible] = usePersistedState<boolean[]>(K.visible, ALL_VISIBLE, sanitize.visible);
  const [erModel, setErModel] = usePersistedState<ErModel>(
    K.erModel, DEFAULT_ER_MODEL, sanitize.oneOf(ER_MODELS.map((m) => m.value))
  );
  const [erPops, setErPops] = usePersistedState<ErPop[]>(K.erPops, makeDefaultErPops(), sanitize.erPops);
  const isEr = analysisMode === 'exposureResponse';

  // Draggable left-panel width (desktop layout only)
  const splitRef = useRef<HTMLDivElement>(null);
  const [panelW, setPanelW] = usePersistedState<number>(
    K.panelWidth, LAYOUT.leftPanelDefault, sanitize.num(LAYOUT.leftPanelMin, 4000)
  );
  const [resizing, setResizing] = useState(false);
  const clampW = useCallback((w: number) => {
    const total = splitRef.current?.getBoundingClientRect().width ?? 1400;
    return Math.round(Math.min(Math.max(LAYOUT.leftPanelMin, w), Math.max(LAYOUT.leftPanelMin, total - LAYOUT.rightColumnMin)));
  }, []);
  // A stored width may be too wide for a smaller window: re-clamp once mounted and on resize
  useEffect(() => {
    const fit = () => setPanelW((w) => clampW(w));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [clampW, setPanelW]);
  const onSplitDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setResizing(true);
  };
  const onSplitMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizing || !splitRef.current) return;
    setPanelW(clampW(e.clientX - splitRef.current.getBoundingClientRect().left));
  };
  const onSplitKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = LAYOUT.dividerKeyStep;
    if (e.key === 'ArrowLeft') { e.preventDefault(); setPanelW((w) => clampW(w - step)); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setPanelW((w) => clampW(w + step)); }
    if (e.key === 'Home' || e.key === 'Enter') { e.preventDefault(); setPanelW(LAYOUT.leftPanelDefault); }
  };

  const tmdd = isTmdd(modelType);

  const updateActive = (patch: Partial<PopState>) =>
    setPops((prev) => prev.map((p, i) => (i === activeIdx ? { ...p, ...patch } : p)));
  const copyFrom = (src: number) =>
    setPops((prev) => prev.map((p, i) => (i === activeIdx ? { ...prev[src] } : p)));
  const updateActiveEr = (patch: Partial<ErPop>) =>
    setErPops((prev) => prev.map((p, i) => (i === activeIdx ? { ...p, ...patch } : p)));
  const copyFromEr = (src: number) =>
    setErPops((prev) => prev.map((p, i) => (i === activeIdx ? { ...prev[src] } : p)));

  const loadMab = () => setPops((prev) => prev.map((p, i) => applyMabDefaults(p, i)));

  const toggleVisible = (i: number) =>
    setVisible((prev) => {
      if (prev[i] && prev.filter(Boolean).length === 1) return prev; // keep at least one curve
      return prev.map((v, k) => (k === i ? !v : v));
    });
  const showOnly = (i: number) => setVisible(POP_NAMES.map((_, k) => k === i));
  const showAll = () => setVisible(ALL_VISIBLE);

  // Simulate all three populations on one shared time grid
  const { grid, results } = useMemo(() => {
    const g = makeGrid(Math.max(...pops.map(popDuration)));
    return { grid: g, results: pops.map((p) => simulatePop(p, modelType, g, tmddRoute, tmddReadout)) as SimResult[] };
  }, [pops, modelType, tmddRoute, tmddReadout]);

  const series: ChartSeries[] = useMemo(
    () => pops.map((p, i) => ({
      name: POP_NAMES[i], color: POP_COLORS[i], conc: results[i].concPoints,
      visible: visible[i], tau: p.tauHours, numDoses: p.numDoses,
    })),
    [pops, results, visible]
  );

  // Population that drives the shaded window + zoom presets: the one being edited, if it is shown
  const refIdx = visible[activeIdx] ? activeIdx : visible.findIndex(Boolean);
  const totalDuration = Math.max(...pops.filter((_, i) => visible[i]).map(popDuration));

  const shownIdx = POP_NAMES.map((_, i) => i).filter((i) => visible[i]);

  // ── Exposure–response: reference exposure per population (from its PK simulation, or entered manually)
  const pkModelLabel = MODEL_GROUPS.flatMap((g) => g.options).find((o) => o.value === modelType)?.label ?? modelType;
  const exposures = useMemo(
    () => erPops.map((ep, i) => {
      const r = results[i];
      const src = ER_EXPOSURE_SOURCES.find((x) => x.value === ep.exposureSource)!;
      if (ep.exposureSource === 'manual') return { value: ep.cManual, note: 'entered manually' };
      const value = ep.exposureSource === 'cavg' ? r.cavg_ss : ep.exposureSource === 'cmax' ? r.cmax_ss : r.cmin_ss;
      return { value, note: `${src.label} from PK model “${pkModelLabel}”, ${pops[i].doseMg} mg q${pops[i].tauHours}h × ${pops[i].numDoses}` };
    }),
    [erPops, results, pops, pkModelLabel]
  );
  const erSeries: ErSeries[] = useMemo(
    () => erPops.map((ep, i) => ({ name: POP_NAMES[i], color: POP_COLORS[i], pop: ep, visible: visible[i], cRef: exposures[i].value })),
    [erPops, visible, exposures]
  );
  const quizId = isEr ? `er-${erModel}` : 'pk';
  const quizPool = useMemo(() => (isEr ? erPoolFor(erModel) : QUIZ_QUESTIONS), [isEr, erModel]);
  const erLabel = ER_MODELS.find((m) => m.value === erModel)?.label ?? erModel;

  const status = (i: number) => {
    const r = results[i];
    if (r.timeAboveMtc > 0)
      return { tone: 'rose', icon: ShieldAlert, text: `Toxicity risk (${r.timeAboveMtc.toFixed(0)}% > MTC)` };
    if (r.timeAboveMec >= 95) return { tone: 'emerald', icon: CheckCircle2, text: 'Target attained (> MEC)' };
    return { tone: 'amber', icon: AlertCircle, text: `Sub-therapeutic trough (${r.timeAboveMec.toFixed(0)}% ≥ MEC)` };
  };
  const toneCls = (tone: string) =>
    ({
      rose: isDark ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-rose-50 text-rose-800 border-rose-300',
      emerald: isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-300',
      amber: isDark ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-800 border-amber-300',
    })[tone];

  const sel = `bg-transparent font-mono text-xs focus:outline-none cursor-pointer ${isDark ? 'text-slate-200' : 'text-slate-800'}`;
  const opt = isDark ? 'bg-slate-900' : 'bg-white';
  const unit = tmdd && tmddReadout === 'total' ? 'total drug' : tmdd ? 'free drug' : 'conc';

  type Row = { label: string; unit: string; value: (i: number) => string; tone?: (i: number) => string };
  const rows: Row[] = [
    {
      label: 'Steady-state Cmax', unit: 'mg/L', value: (i) => results[i].cmax_ss.toFixed(2),
      tone: (i) => (results[i].cmax_ss > pops[i].mtc ? 'text-rose-500' : ''),
    },
    {
      label: 'Steady-state Cmin (trough)', unit: 'mg/L', value: (i) => results[i].cmin_ss.toFixed(2),
      tone: (i) => (results[i].cmin_ss < pops[i].mec ? 'text-amber-500' : 'text-emerald-500'),
    },
    { label: 'Average conc (Cavg,ss)', unit: 'mg/L', value: (i) => results[i].cavg_ss.toFixed(2), tone: () => 'text-blue-500' },
    { label: 'AUC_tau (per dose)', unit: 'mg·h/L', value: (i) => results[i].auc_tau.toFixed(1) },
    { label: 'Accumulation ratio (Rac)', unit: '', value: (i) => `${results[i].rac.toFixed(2)}x`, tone: () => 'text-purple-500' },
    { label: 'Time ≥ MEC at SS', unit: '%', value: (i) => results[i].timeAboveMec.toFixed(0) },
    {
      label: 'Last simulated dose: AUC as % of steady state', unit: '%',
      value: (i) => results[i].lastIntervalPctSs.toFixed(0),
      tone: (i) => (results[i].lastIntervalPctSs < 90 ? 'text-amber-500' : ''),
    },
  ];
  if (tmdd) {
    rows.push({
      label: 'Min free target at SS', unit: '% of R0',
      value: (i) => (results[i].rMinPct === null ? '—' : results[i].rMinPct!.toFixed(0)),
      tone: () => 'text-emerald-500',
    });
  }

  return (
    <div className={`flex flex-col h-full font-sans overflow-y-auto ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top controls */}
      <div className={`border-b p-3 flex flex-wrap items-center justify-between gap-3 text-xs ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Analysis selector: switches between the Population PK and Exposure Response workspaces */}
          <label className={`flex items-center gap-1.5 border rounded px-2.5 py-1 font-semibold ${
            isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'
          }`}>
            <span className={`text-[11px] font-normal ${muted(isDark)}`}>Analysis:</span>
            <select
              aria-label="Analysis type"
              value={analysisMode}
              onChange={(e) => setAnalysisMode(e.target.value as AnalysisMode)}
              className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
            >
              {ANALYSIS_MODES.map((m) => (
                <option key={m.value} value={m.value} className={opt}>{m.label}</option>
              ))}
            </select>
          </label>
          <div className={`h-4 w-px ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

          {isEr && (
            <div className={`flex items-center gap-1 border rounded px-2.5 py-1 ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
              <span className={`text-[11px] ${muted(isDark)}`}>ER model:</span>
              <select aria-label="Exposure-response model" value={erModel} onChange={(e) => setErModel(e.target.value as ErModel)} className={sel}>
                {ER_MODELS.map((m) => <option key={m.value} className={opt} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          )}

          {!isEr && (
          <div className={`flex items-center gap-1 border rounded px-2.5 py-1 ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
            <span className={`text-[11px] ${muted(isDark)}`}>Model:</span>
            <select value={modelType} onChange={(e) => setModelType(e.target.value as ModelType)} className={sel}>
              {MODEL_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.options.map((o) => <option key={o.value} className={opt} value={o.value}>{o.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          )}

          {!isEr && tmdd && (
            <>
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] ${muted(isDark)}`}>Route:</span>
                <Segmented isDark={isDark} value={tmddRoute} onChange={(v) => setTmddRoute(v as TmddRoute)}
                  options={TMDD_ROUTE_OPTIONS} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] ${muted(isDark)}`}>Plot:</span>
                <Segmented isDark={isDark} value={tmddReadout} onChange={(v) => setTmddReadout(v as TmddReadout)}
                  options={TMDD_READOUT_OPTIONS} />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isEr && shownIdx.map((i) => {
            const e = effectAt(erModel, erPops[i], exposures[i].value);
            return (
              <span key={i} className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold border px-2 py-1 rounded ${
                isDark ? 'bg-blue-950 text-blue-200 border-blue-800' : 'bg-blue-50 text-blue-800 border-blue-300'
              }`}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: POP_COLORS[i] }} />
                <span>P{i + 1}: E = {Number.isFinite(e) ? e.toFixed(1) : '—'} at C = {exposures[i].value.toFixed(2)} mg/L</span>
              </span>
            );
          })}
          {!isEr && shownIdx.map((i) => {
            const s = status(i);
            const Icon = s.icon;
            return (
              <span key={i} className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold border px-2 py-1 rounded ${toneCls(s.tone)}`}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: POP_COLORS[i] }} />
                <Icon className="w-3.5 h-3.5" />
                <span>P{i + 1}: {s.text}</span>
              </span>
            );
          })}
        </div>
      </div>

      <div
        ref={splitRef}
        className={`flex-1 flex flex-col lg:flex-row overflow-hidden ${resizing ? 'select-none' : ''}`}
        style={{ ['--panel-w' as string]: `${panelW}px` }}
      >
        {isEr ? (
          <ErPopulationPanel
            isDark={isDark}
            model={erModel}
            pops={erPops}
            activeIdx={activeIdx}
            visible={visible}
            exposures={exposures}
            onSelect={setActiveIdx}
            onChange={updateActiveEr}
            onCopyFrom={copyFromEr}
          />
        ) : (
          <PopulationPanel
            isDark={isDark}
            model={modelType}
            route={tmddRoute}
            pops={pops}
            activeIdx={activeIdx}
            visible={visible}
            onSelect={setActiveIdx}
            onChange={updateActive}
            onCopyFrom={copyFrom}
            onLoadMab={loadMab}
          />
        )}

        {/* Drag handle: drag to resize, double-click or Home to reset, arrow keys to nudge */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize parameter panel"
          aria-valuenow={panelW}
          aria-valuemin={LAYOUT.leftPanelMin}
          tabIndex={0}
          title="Drag to resize · double-click to reset"
          onPointerDown={onSplitDown}
          onPointerMove={onSplitMove}
          onPointerUp={() => setResizing(false)}
          onPointerCancel={() => setResizing(false)}
          onDoubleClick={() => setPanelW(LAYOUT.leftPanelDefault)}
          onKeyDown={onSplitKey}
          className={`group hidden lg:flex shrink-0 w-2 -ml-1 z-20 items-center justify-center cursor-col-resize touch-none focus:outline-none ${
            resizing ? 'bg-blue-500/30' : 'hover:bg-blue-500/20 focus-visible:bg-blue-500/30'
          }`}
        >
          <span className={`h-10 w-0.5 rounded-full ${resizing ? 'bg-blue-500' : isDark ? 'bg-slate-600 group-hover:bg-blue-400' : 'bg-slate-300 group-hover:bg-blue-500'}`} />
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto min-w-0">
          <QuizPanel key={quizId} isDark={isDark} pool={quizPool} poolId={quizId} />

          {/* Population visibility */}
          <div className={`${surface(isDark)} px-3 py-2 flex flex-wrap items-center gap-2 text-xs`}>
            <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Populations shown:</span>
            {POP_NAMES.map((name, i) => {
              const on = visible[i];
              const last = on && shownIdx.length === 1;
              return (
                <div key={name} className="inline-flex items-stretch">
                  <label
                    title={last ? 'At least one population must stay on' : on ? 'Hide from chart' : 'Show in chart'}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-l border text-[11px] font-mono select-none ${
                      last ? 'cursor-not-allowed' : 'cursor-pointer'
                    } ${on
                      ? isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'
                      : isDark ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`}
                  >
                    <input type="checkbox" className="sr-only" checked={on} disabled={last} onChange={() => toggleVisible(i)} />
                    {on ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: POP_COLORS[i], opacity: on ? 1 : 0.35 }} />
                    <span className={on ? '' : 'line-through'}>{name}</span>
                  </label>
                  <button
                    onClick={() => showOnly(i)}
                    title={`Show only ${name}`}
                    className={`px-1.5 rounded-r border border-l-0 text-[10px] font-mono cursor-pointer ${
                      isDark ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800' : 'border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    only
                  </button>
                </div>
              );
            })}
            <button onClick={showAll} className="text-[11px] text-blue-500 hover:underline cursor-pointer ml-1">Show all</button>
          </div>

          {isEr ? (
            <>
              <ErChart
                isDark={isDark}
                title={`Simulated Exposure–Response · ${erLabel}`}
                model={erModel}
                series={erSeries}
                refIdx={visible[activeIdx] ? activeIdx : visible.findIndex(Boolean)}
              />
              <ErMetricsTable isDark={isDark} model={erModel} pops={erPops} cRefs={exposures.map((x) => x.value)} shownIdx={shownIdx} />
              <ErEquationsPanel
                isDark={isDark}
                model={erModel}
                pop={erPops[activeIdx]}
                popName={POP_NAMES[activeIdx]}
                popColor={POP_COLORS[activeIdx]}
                cRef={exposures[activeIdx].value}
                exposureNote={exposures[activeIdx].note}
              />
            </>
          ) : (
            <>
          <PkChart
            isDark={isDark}
            title={`Simulated Plasma Concentration vs. Time${tmdd ? ` (${unit})` : ''}`}
            dt={grid.dt}
            series={series}
            totalDuration={totalDuration}
            refIdx={refIdx}
            mec={pops[refIdx].mec}
            mtc={pops[refIdx].mtc}
          />

          {/* Comparison metrics */}
          <div className={`${surface(isDark)} overflow-x-auto`}>
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <th className={`text-left font-normal px-3 py-2 text-[11px] ${muted(isDark)}`}>
                    Exposure at steady state{tmdd ? ` (${unit})` : ''}
                  </th>
                  {shownIdx.map((i) => (
                    <th key={i} className="text-right px-3 py-2 font-semibold whitespace-nowrap" style={{ color: POP_COLORS[i] }}>
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: POP_COLORS[i] }} />
                      {POP_NAMES[i]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className={`border-b last:border-b-0 ${isDark ? 'border-slate-800/70' : 'border-slate-100'}`}>
                    <td className={`px-3 py-1.5 text-[11px] ${muted(isDark)}`}>
                      {row.label} {row.unit && <span className="opacity-70">({row.unit})</span>}
                    </td>
                    {shownIdx.map((i) => (
                      <td key={i} className={`px-3 py-1.5 text-right font-mono font-bold text-sm ${row.tone?.(i) || (isDark ? 'text-slate-100' : 'text-slate-900')}`}>
                        {row.value(i)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={`px-3 py-1.5 text-[10px] border-t ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
              Steady-state values are for true steady state (as if dosing continued indefinitely), whatever the number of doses plotted.
              {shownIdx.some((i) => !results[i].ssConverged) && ' ≈ TMDD steady state not fully converged within the computation budget for at least one population; values are approximate.'}
            </p>
          </div>

          <EquationsPanel
            isDark={isDark}
            model={modelType}
            route={tmddRoute}
            pop={pops[activeIdx]}
            popName={POP_NAMES[activeIdx]}
            popColor={POP_COLORS[activeIdx]}
            result={results[activeIdx]}
          />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
