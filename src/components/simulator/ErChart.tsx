import React, { useMemo, useRef, useState } from 'react';
import { RotateCcw, Settings2 } from 'lucide-react';
import { CHART, ER_CHART, PERSISTENCE } from '../../config/appConfig';
import { usePersistedState } from '../../db/usePersistedState';
import * as sanitize from '../../db/sanitize';
import { concForEffect, effectAt, hasPlateau, sampleCurve } from '../../er/erEngine';
import type { ErModel, ErPop } from '../../er/erTypes';
import { Segmented, faint, muted } from './ui';

export interface ErSeries {
  name: string;
  color: string;
  pop: ErPop;
  visible: boolean;
  /** reference exposure (mg/L) */
  cRef: number;
}

interface Props {
  isDark: boolean;
  title: string;
  model: ErModel;
  series: ErSeries[];
  /** population being edited (target-effect line follows it) */
  refIdx: number;
}

const { width: W, height: H } = CHART;
const { x0: X0, x1: X1, y0: Y0, y1: Y1 } = CHART.plot;
const K = PERSISTENCE.keys;
const D = ER_CHART.defaults;
const TARGET = '#e11d48';

const niceCeil = (v: number) => {
  if (!(v > 0)) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
};
const niceStep = (range: number, ticks = 6) => {
  const raw = Math.max(range, 1e-12) / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
};
const fmt = (v: number) => String(+v.toPrecision(4));
const clampPx = (v: number) => Math.max(-1e5, Math.min(1e5, v));

export const ErChart: React.FC<Props> = ({ isDark, title, model, series, refIdx }) => {
  const [xLog, setXLog] = usePersistedState(K.erChartLog, D.xLog, sanitize.bool);
  const [showAxisMenu, setShowAxisMenu] = useState(false);
  const [autoY, setAutoY] = usePersistedState(K.erChartAutoY, D.autoY, sanitize.bool);
  const [customYMin, setCustomYMin] = usePersistedState(K.erChartYMin, D.yMin, sanitize.num());
  const [customYMax, setCustomYMax] = usePersistedState(K.erChartYMax, D.yMax, sanitize.num());
  const [customYStep, setCustomYStep] = usePersistedState(K.erChartYStep, D.yStep, sanitize.num(0.001));
  const [autoX, setAutoX] = usePersistedState(K.erChartAutoX, D.autoX, sanitize.bool);
  const [customXMin, setCustomXMin] = usePersistedState(K.erChartXMin, D.xMin, sanitize.num());
  const [customXMax, setCustomXMax] = usePersistedState(K.erChartXMax, D.xMax, sanitize.num());
  const [customXStep, setCustomXStep] = usePersistedState(K.erChartXStep, D.xStep, sanitize.num(0.001));
  const [zoom, setZoom] = usePersistedState<sanitize.ZoomRange | null>(K.erChartZoom, null, sanitize.zoom);

  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCur, setDragCur] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<{ c: number; svgX: number; svgY: number } | null>(null);

  const shown = series.filter((s) => s.visible);
  const ref = series[refIdx]?.visible ? series[refIdx] : shown[0];
  const A = ER_CHART.autoX;

  // ───── axis ranges ─────
  const autoXRange = useMemo(() => {
    const maxRef = Math.max(0, ...shown.map((s) => s.cRef));
    if (xLog) {
      const hi = Math.max(ER_CHART.logXMaxDefault, Math.pow(10, Math.ceil(Math.log10(Math.max(1e-9, maxRef * A.refFactor)))));
      return [ER_CHART.logXMin, hi] as const;
    }
    let m = A.minMax;
    for (const s of shown) {
      m = Math.max(m, s.cRef * A.refFactor);
      if (hasPlateau(model)) m = Math.max(m, s.pop.ec50 * A.ec50Factor);
      if (model === 'hockey') m = Math.max(m, s.pop.ct * A.ctFactor + s.pop.ct);
    }
    return [0, niceCeil(m)] as const;
  }, [shown, xLog, model, A.refFactor, A.ec50Factor, A.ctFactor, A.minMax]);

  let xMin: number, xMax: number;
  if (zoom) { xMin = zoom.xMin; xMax = zoom.xMax; }
  else if (!autoX) { xMin = customXMin; xMax = customXMax; }
  else { xMin = autoXRange[0]; xMax = autoXRange[1]; }
  if (xLog) xMin = Math.max(xMin, 1e-6);
  if (!(xMax > xMin)) xMax = xMin * 10 || 1;

  const toX = (c: number) => {
    if (xLog) return X0 + ((Math.log10(Math.max(c, 1e-12)) - Math.log10(xMin)) / (Math.log10(xMax) - Math.log10(xMin) || 1)) * (X1 - X0);
    return X0 + ((c - xMin) / (xMax - xMin || 1)) * (X1 - X0);
  };
  const fromX = (px: number) => {
    const f = (px - X0) / (X1 - X0);
    return xLog ? Math.pow(10, Math.log10(xMin) + f * (Math.log10(xMax) - Math.log10(xMin))) : xMin + f * (xMax - xMin);
  };

  // curves are sampled over the visible x-range (log-linear skips the C → 0 blow-up on a linear axis)
  const curves = useMemo(() => {
    const lo = xLog ? xMin : model === 'loglinear' ? Math.max(xMin, xMax * ER_CHART.logLinearFloor) : xMin;
    return series.map((s) => (s.visible ? sampleCurve(model, s.pop, lo, xMax, xLog, ER_CHART.curvePoints) : null));
  }, [series, model, xMin, xMax, xLog]);

  const autoYRange = useMemo(() => {
    let hi = 0, lo = 0;
    curves.forEach((cv, i) => {
      if (!cv) return;
      for (const y of cv.y) if (Number.isFinite(y)) { if (y > hi) hi = y; if (y < lo) lo = y; }
      if (hasPlateau(model)) hi = Math.max(hi, series[i].pop.e0 + series[i].pop.emax);
    });
    if (ref && ref.pop.targetEffect <= hi * ER_CHART.targetYReach) hi = Math.max(hi, ref.pop.targetEffect);
    return [lo < 0 ? lo * ER_CHART.yHeadroom : 0, Math.max(ER_CHART.minYMax, hi * ER_CHART.yHeadroom)] as const;
  }, [curves, series, model, ref]);

  let yMin: number, yMax: number;
  if (zoom) { yMin = zoom.yMin; yMax = zoom.yMax; }
  else if (!autoY) { yMin = customYMin; yMax = customYMax; }
  else { yMin = autoYRange[0]; yMax = autoYRange[1]; }
  if (!(yMax > yMin)) yMax = yMin + 1;

  const toY = (e: number) => Y1 - ((e - yMin) / (yMax - yMin || 1)) * (Y1 - Y0);
  const fromY = (py: number) => yMin + ((Y1 - py) / (Y1 - Y0)) * (yMax - yMin);

  // ───── ticks ─────
  const xTicks = useMemo(() => {
    if (xLog) {
      const out: number[] = [];
      const decades = Math.log10(xMax / xMin);
      const mults = decades > 4 ? [1] : [1, 2, 5];
      for (let k = Math.floor(Math.log10(xMin)); k <= Math.ceil(Math.log10(xMax)); k++)
        for (const m of mults) { const v = +(m * Math.pow(10, k)).toPrecision(6); if (v >= xMin * 0.999 && v <= xMax * 1.001) out.push(v); }
      return out;
    }
    const step = !autoX && !zoom && customXStep > 0 ? customXStep : niceStep(xMax - xMin);
    const out: number[] = [];
    for (let k = Math.ceil(xMin / step - 1e-9); k * step <= xMax + 1e-9; k++) out.push(+(k * step).toPrecision(8));
    return out;
  }, [xLog, xMin, xMax, autoX, zoom, customXStep]);
  const yTicks = useMemo(() => {
    const step = !autoY && !zoom && customYStep > 0 ? customYStep : niceStep(yMax - yMin);
    const out: number[] = [];
    for (let k = Math.ceil(yMin / step - 1e-9); k * step <= yMax + 1e-9; k++) out.push(+(k * step).toPrecision(8));
    return out;
  }, [yMin, yMax, autoY, zoom, customYStep]);

  // ───── paths ─────
  const paths = curves.map((cv) => {
    if (!cv) return '';
    let d = '', pen = false;
    for (let i = 0; i < cv.x.length; i++) {
      const y = cv.y[i];
      if (!Number.isFinite(y)) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${toX(cv.x[i]).toFixed(1)} ${clampPx(toY(y)).toFixed(1)} `;
      pen = true;
    }
    return d;
  });

  // ───── interaction ─────
  const toSvg = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (W / rect.width), y: (e.clientY - rect.top) * (H / rect.height) };
  };
  const inPlot = (x: number, y: number) => x >= X0 && x <= X1 && y >= Y0 && y <= Y1;
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const { x, y } = toSvg(e);
    if (dragging) setDragCur({ x, y });
    if (inPlot(x, y)) setHover({ c: fromX(x), svgX: x, svgY: y });
    else if (!dragging) setHover(null);
  };
  const onDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const { x, y } = toSvg(e);
    if (inPlot(x, y)) { setDragging(true); setDragStart({ x, y }); setDragCur({ x, y }); }
  };
  const onUp = () => {
    if (dragging && dragStart && dragCur) {
      const minX = Math.min(dragStart.x, dragCur.x), maxX = Math.max(dragStart.x, dragCur.x);
      const minY = Math.min(dragStart.y, dragCur.y), maxY = Math.max(dragStart.y, dragCur.y);
      if (maxX - minX > CHART.minDragPx && maxY - minY > CHART.minDragPx) {
        setZoom({
          xMin: Number(fromX(minX).toPrecision(4)), xMax: Number(fromX(maxX).toPrecision(4)),
          yMin: Number(fromY(maxY).toPrecision(4)), yMax: Number(fromY(minY).toPrecision(4)),
        });
      }
    }
    setDragging(false); setDragStart(null); setDragCur(null);
  };
  const resetZoom = () => { setZoom(null); setAutoX(true); setAutoY(true); };
  const fitRefs = () => {
    const cs = shown.map((s) => s.cRef).filter((c) => c > 0);
    if (cs.length) {
      const lo = Math.min(...cs), hi = Math.max(...cs);
      setZoom({ xMin: xLog ? lo / 4 : 0, xMax: hi * 2.5, yMin: autoYRange[0], yMax: autoYRange[1] });
    }
    setShowAxisMenu(false);
  };

  const AX = CHART.axis;
  const axisStroke = isDark ? AX.lineDark : AX.lineLight;
  const axisText = isDark ? AX.textDark : AX.textLight;
  const boxBtn = isDark ? 'bg-slate-950 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 hover:bg-slate-100';

  const axisRow = (
    t: string, auto: boolean, setAuto: (v: boolean) => void, vals: [number, number, number],
    setVals: [(v: number) => void, (v: number) => void, (v: number) => void], unit: string
  ) => (
    <div className="space-y-2 border-t pt-2 mb-1">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-xs">{t}</span>
        <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
          <input type="checkbox" checked={auto} onChange={(e) => { setAuto(e.target.checked); if (e.target.checked) setZoom(null); }} />
          <span>Auto Range</span>
        </label>
      </div>
      {!auto && (
        <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
          {['Min', 'Max', 'Step/Break'].map((lab, k) => (
            <div key={lab}>
              <span className="text-[10px] block opacity-70">{lab}{k < 2 ? ` (${unit})` : ''}</span>
              <input type="number" value={vals[k]}
                onChange={(e) => setVals[k](k === 2 ? Math.max(0.001, Number(e.target.value)) : Number(e.target.value))}
                className={`w-full border rounded px-1.5 py-0.5 ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-300'}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const refTarget = ref ? concForEffect(model, ref.pop, ref.pop.targetEffect) : null;
  const inX = (c: number) => c >= xMin && c <= xMax;
  const inY = (e: number) => e >= yMin && e <= yMax;

  return (
    <div className={`border rounded p-4 relative ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className="flex flex-wrap items-center justify-between mb-3 text-xs gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h4 className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{title}</h4>
          <Segmented isDark={isDark} value={xLog ? 'log' : 'lin'}
            options={[{ value: 'lin', label: 'Linear x' }, { value: 'log', label: 'Log x' }]}
            onChange={(v) => { setXLog(v === 'log'); setZoom(null); }} />
          {zoom && (
            <button onClick={resetZoom}
              className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-mono px-2 py-0.5 rounded cursor-pointer">
              <RotateCcw className="w-3 h-3" /><span>Reset Zoom</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <button onClick={() => setShowAxisMenu(!showAxisMenu)}
              className={`flex items-center gap-1.5 border px-2.5 py-1 rounded text-xs cursor-pointer ${
                showAxisMenu ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                  : isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
              }`}>
              <Settings2 className="w-3.5 h-3.5" /><span>Axis Limits &amp; Breaks</span>
            </button>
            {showAxisMenu && (
              <div className={`absolute right-0 top-full mt-1 w-80 border rounded z-50 p-3 text-xs shadow-xl font-sans ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
              }`}>
                <div className="font-bold border-b pb-1.5 mb-2.5 flex items-center justify-between">
                  <span>Graph Axis Settings</span>
                  <button onClick={resetZoom} className="text-[11px] text-blue-500 hover:underline cursor-pointer">Auto Reset</button>
                </div>
                <div className="mb-3">
                  <label className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${muted(isDark)}`}>Quick Range Presets:</label>
                  <div className="grid grid-cols-2 gap-1 font-mono text-[11px]">
                    <button onClick={() => { resetZoom(); setShowAxisMenu(false); }} className={`p-1 rounded border cursor-pointer ${boxBtn}`}>Full Range</button>
                    <button onClick={fitRefs} className={`p-1 rounded border cursor-pointer ${boxBtn}`}>Fit Exposures</button>
                  </div>
                </div>
                {axisRow('Y-Axis (Effect)', autoY, setAutoY, [customYMin, customYMax, customYStep], [setCustomYMin, setCustomYMax, setCustomYStep], 'E')}
                {axisRow('X-Axis (Concentration)', autoX, setAutoX, [customXMin, customXMax, customXStep], [setCustomXMin, setCustomXMax, setCustomXStep], 'mg/L')}
              </div>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs font-mono flex-wrap">
            {shown.map((s) => (
              <span key={s.name} className="flex items-center gap-1.5" style={{ color: s.color }}>
                <span className="w-3 h-0.5" style={{ backgroundColor: s.color }}></span>
                <span>{s.name.replace('Population ', 'Pop ')}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
      {/* On narrow screens the chart keeps a readable minimum width (swipe sideways) and its height follows the aspect ratio */}
      <div className="relative w-full min-w-[600px] select-none cursor-crosshair" style={{ aspectRatio: `${W} / ${H}`, maxHeight: CHART.heightPx }}>
        <svg ref={svgRef} className="w-full h-full" viewBox={`0 0 ${W} ${H}`}
          onMouseMove={onMove} onMouseDown={onDown} onMouseUp={onUp}
          onMouseLeave={() => { setHover(null); setDragging(false); setDragStart(null); setDragCur(null); }}
          onDoubleClick={resetZoom}>
          <defs><clipPath id="er-plot-clip"><rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} /></clipPath></defs>

          {xTicks.map((t) => {
            const x = toX(t);
            if (x < X0 - 0.5 || x > X1 + 0.5) return null;
            return (
              <g key={`x${t}`}>
                <line x1={x} y1={Y1} x2={x} y2={Y1 + AX.tickLength} stroke={axisStroke} strokeWidth={AX.tickWidth} />
                <text x={x} y={Y1 + AX.tickLength + 15} fill={axisText} fontSize={AX.tickFontSize} textAnchor="middle" fontFamily="monospace">{fmt(t)}</text>
              </g>
            );
          })}
          {yTicks.map((v) => {
            const y = toY(v);
            if (y < Y0 - 0.5 || y > Y1 + 0.5) return null;
            return (
              <g key={`y${v}`}>
                <line x1={X0 - AX.tickLength} y1={y} x2={X0} y2={y} stroke={axisStroke} strokeWidth={AX.tickWidth} />
                <text x={X0 - AX.tickLength - 5} y={y + 4} fill={axisText} fontSize={AX.tickFontSize} textAnchor="end" fontFamily="monospace">{fmt(v)}</text>
              </g>
            );
          })}

          <g clipPath="url(#er-plot-clip)">
            {/* Plateau (E0 + Emax), baseline for hockey-stick */}
            {shown.map((s) => hasPlateau(model) && (
              <line key={`pl${s.name}`} x1={X0} x2={X1} y1={toY(s.pop.e0 + s.pop.emax)} y2={toY(s.pop.e0 + s.pop.emax)}
                stroke={s.color} strokeDasharray="6 4" strokeWidth="1" opacity="0.55" />
            ))}
            {shown.map((s) => (hasPlateau(model) || model === 'hockey' || model === 'linear') && (
              <line key={`bl${s.name}`} x1={X0} x2={X1} y1={toY(s.pop.e0)} y2={toY(s.pop.e0)}
                stroke={s.color} strokeDasharray="2 4" strokeWidth="1" opacity="0.4" />
            ))}

            {/* Target effect line for the population being edited */}
            {ref && (
              <g>
                <line x1={X0} x2={X1} y1={toY(ref.pop.targetEffect)} y2={toY(ref.pop.targetEffect)} stroke={TARGET} strokeDasharray="4 3" strokeWidth="1.25" />
                {refTarget?.kind === 'value' && inX(refTarget.c) && (
                  <>
                    <line x1={toX(refTarget.c)} x2={toX(refTarget.c)} y1={toY(ref.pop.targetEffect)} y2={Y1} stroke={TARGET} strokeDasharray="2 3" strokeWidth="1.25" />
                    <circle cx={toX(refTarget.c)} cy={toY(ref.pop.targetEffect)} r="5.5" fill="none" stroke={TARGET} strokeWidth="2" />
                  </>
                )}
              </g>
            )}

            {/* curves */}
            {series.map((s, i) => s.visible && (
              <path key={s.name} d={paths[i]} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" />
            ))}

            {/* EC50 / threshold markers */}
            {shown.map((s) => {
              if (hasPlateau(model)) {
                const e = s.pop.e0 + s.pop.emax / 2;
                return (
                  <g key={`ec${s.name}`}>
                    <line x1={toX(s.pop.ec50)} x2={toX(s.pop.ec50)} y1={toY(e)} y2={Y1} stroke={s.color} strokeDasharray="1 3" strokeWidth="1.25" opacity="0.8" />
                    <circle cx={toX(s.pop.ec50)} cy={toY(e)} r="4.5" fill={isDark ? '#0f172a' : '#ffffff'} stroke={s.color} strokeWidth="2" />
                  </g>
                );
              }
              if (model === 'hockey') {
                const x = toX(s.pop.ct), y = toY(s.pop.e0);
                return (
                  <g key={`ct${s.name}`}>
                    <line x1={x} x2={x} y1={y} y2={Y1} stroke={s.color} strokeDasharray="1 3" strokeWidth="1.25" opacity="0.8" />
                    <polygon points={`${x},${y - 5.5} ${x + 5.5},${y} ${x},${y + 5.5} ${x - 5.5},${y}`} fill={isDark ? '#0f172a' : '#ffffff'} stroke={s.color} strokeWidth="2" />
                  </g>
                );
              }
              return null;
            })}

            {/* Reference exposure on each curve */}
            {shown.map((s) => {
              const e = effectAt(model, s.pop, s.cRef);
              if (!Number.isFinite(e) || !(s.cRef > 0)) return null;
              return (
                <g key={`ref${s.name}`}>
                  <line x1={toX(s.cRef)} x2={toX(s.cRef)} y1={clampPx(toY(e))} y2={Y1} stroke={s.color} strokeDasharray="4 3" strokeWidth="1.25" opacity="0.9" />
                  <line x1={X0} x2={toX(s.cRef)} y1={clampPx(toY(e))} y2={clampPx(toY(e))} stroke={s.color} strokeDasharray="4 3" strokeWidth="1.25" opacity="0.9" />
                  <circle cx={toX(s.cRef)} cy={clampPx(toY(e))} r="5" fill={s.color} stroke="#ffffff" strokeWidth="2" />
                </g>
              );
            })}
          </g>

          <line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke={axisStroke} strokeWidth={AX.width} strokeLinecap="square" />
          <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke={axisStroke} strokeWidth={AX.width} strokeLinecap="square" />

          {ref && inY(ref.pop.targetEffect) && (
            <text x={X1 - 4} y={toY(ref.pop.targetEffect) - 4} fill={TARGET} fontSize="10" textAnchor="end" fontFamily="monospace">
              target E* = {fmt(ref.pop.targetEffect)}
            </text>
          )}

          {hover && !dragging && (
            <g pointerEvents="none">
              <line x1={hover.svgX} y1={Y0} x2={hover.svgX} y2={Y1} stroke={isDark ? '#94a3b8' : '#475569'} strokeDasharray="3 3" strokeWidth="1" />
              {shown.map((s) => {
                const e = effectAt(model, s.pop, hover.c);
                if (!Number.isFinite(e) || !inY(e)) return null;
                return <circle key={s.name} cx={hover.svgX} cy={toY(e)} r="4" fill={s.color} stroke="#ffffff" strokeWidth="2" />;
              })}
            </g>
          )}

          {dragging && dragStart && dragCur && (
            <rect x={Math.min(dragStart.x, dragCur.x)} y={Math.min(dragStart.y, dragCur.y)}
              width={Math.abs(dragCur.x - dragStart.x)} height={Math.abs(dragCur.y - dragStart.y)}
              fill="#3b82f6" fillOpacity="0.25" stroke="#2563eb" strokeDasharray="4 2" strokeWidth="1.5" />
          )}

          <text x={-(Y0 + Y1) / 2} y={13} fill={axisText} fontSize={AX.titleFontSize} textAnchor="middle" fontWeight="bold" transform="rotate(-90)">
            {ER_CHART.yAxisTitle}
          </text>
          <text x={(X0 + X1) / 2} y={H - 8} fill={axisText} fontSize={AX.titleFontSize} textAnchor="middle" fontWeight="bold">
            {xLog ? ER_CHART.xAxisTitleLog : ER_CHART.xAxisTitle}
          </text>
        </svg>

        {hover && !dragging && (
          <div
            className={`absolute pointer-events-none border rounded px-2.5 py-1.5 text-[11px] font-mono shadow-md z-40 whitespace-nowrap ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
            }`}
            style={{
              left: `${Math.min(62, Math.max(10, (hover.svgX / W) * 100 + 1))}%`,
              top: `${Math.min(55, Math.max(4, (hover.svgY / H) * 100 - 12))}%`,
            }}
          >
            <div className="font-bold mb-0.5">C: <span className="text-blue-500">{fmt(hover.c)} mg/L</span></div>
            {shown.map((s) => {
              const e = effectAt(model, s.pop, hover.c);
              const pct = hasPlateau(model) ? ((e - s.pop.e0) / s.pop.emax) * 100 : null;
              return (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span>{s.name.replace('Population ', 'Pop ')}: E = <strong>{Number.isFinite(e) ? e.toFixed(2) : '—'}</strong></span>
                  {pct !== null && Number.isFinite(pct) && <span className="text-[10px] opacity-70">{pct.toFixed(0)}% of Emax</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>

      <div className={`mt-2 text-[11px] font-mono flex flex-wrap items-center justify-between border-t pt-2 gap-x-4 gap-y-1 ${
        isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
      }`}>
        <span>
          ● reference exposure
          {hasPlateau(model) && ' · ○ EC50 · dashed top line = E0 + Emax'}
          {model === 'hockey' && ' · ◇ threshold Ct'}
          <span style={{ color: TARGET }}> · red = target E* and the C needed for it</span>
        </span>
        <span className={faint(isDark)}>
          x: [{fmt(xMin)} – {fmt(xMax)} mg/L{xLog ? ', log' : ''}] · y: [{fmt(yMin)} – {fmt(yMax)}] · drag to zoom, double-click to reset
        </span>
      </div>
    </div>
  );
};
