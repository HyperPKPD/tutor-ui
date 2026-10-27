import React, { useMemo, useRef, useState } from 'react';
import { RotateCcw, Settings2 } from 'lucide-react';
import { CHART, PERSISTENCE } from '../../config/appConfig';
import { usePersistedState } from '../../db/usePersistedState';
import * as sanitize from '../../db/sanitize';
import { Segmented, faint, muted } from './ui';
import { ChartDownload, type LegendItem } from './ChartDownload';
import { DOWNLOAD } from '../../config/appConfig';

export interface ChartSeries {
  name: string;
  color: string;
  conc: number[];
  visible: boolean;
  tau: number;
  numDoses: number;
}

interface Props {
  isDark: boolean;
  title: string;
  dt: number;
  series: ChartSeries[];
  /** longest horizon among the visible populations */
  totalDuration: number;
  /** population whose therapeutic window / regimen drive the shaded band and zoom presets */
  refIdx: number;
  mec: number;
  mtc: number;
  /** draw the shaded target therapeutic window (MEC–MTC) */
  showWindow: boolean;
  windowColor: string;
}

const { width: W, height: H } = CHART;
const { x0: X0, x1: X1, y0: Y0, y1: Y1 } = CHART.plot;
const K = PERSISTENCE.keys;
const D = CHART.defaults;

const niceStepX = (range: number) => {
  const c = CHART.niceStepsX;
  return c.find((v) => range / v <= CHART.maxXTicks) ?? c[c.length - 1];
};
const niceStepY = (range: number) => {
  const raw = Math.max(range, 1e-9) / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
};
const fmt = (v: number) => String(+v.toFixed(3));

export const PkChart: React.FC<Props> = ({ isDark, title, dt, series, totalDuration, refIdx, mec, mtc, showWindow, windowColor }) => {
  // Axis / scale / zoom settings are persisted (IndexedDB) so a refresh restores the exact view
  const [isLogScale, setIsLogScale] = usePersistedState(K.chartLog, D.isLogScale, sanitize.bool);
  const [showAxisMenu, setShowAxisMenu] = useState(false);
  const [autoYAxis, setAutoYAxis] = usePersistedState(K.chartAutoY, D.autoY, sanitize.bool);
  const [customYMin, setCustomYMin] = usePersistedState(K.chartYMin, D.customYMin, sanitize.num());
  const [customYMax, setCustomYMax] = usePersistedState(K.chartYMax, D.customYMax, sanitize.num());
  const [customYStep, setCustomYStep] = usePersistedState(K.chartYStep, D.customYStep, sanitize.num(0.001));
  const [autoXAxis, setAutoXAxis] = usePersistedState(K.chartAutoX, D.autoX, sanitize.bool);
  const [customXMin, setCustomXMin] = usePersistedState(K.chartXMin, D.customXMin, sanitize.num());
  const [customXMax, setCustomXMax] = usePersistedState(K.chartXMax, D.customXMax, sanitize.num());
  const [customXStep, setCustomXStep] = usePersistedState(K.chartXStep, D.customXStep, sanitize.num(0.001));
  const [zoomRange, setZoomRange] = usePersistedState<sanitize.ZoomRange | null>(K.chartZoom, null, sanitize.zoom);

  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<{ time: number; idx: number; svgX: number; svgY: number } | null>(null);

  const shown = series.filter((s) => s.visible);
  const ref = series[refIdx] ?? shown[0];
  const isZoomed = zoomRange !== null;

  const dataMax = useMemo(() => {
    let m = 0;
    for (const s of shown) for (let i = 0; i < s.conc.length; i++) if (s.conc[i] > m) m = s.conc[i];
    return m;
  }, [shown]);

  const defaultMaxY = Math.max(showWindow ? mtc * CHART.mtcHeadroom : 0, dataMax * CHART.dataHeadroom, CHART.minYAxisMax);
  const activeYMin = zoomRange ? zoomRange.yMin : !autoYAxis ? customYMin : isLogScale ? CHART.logAxisMin : 0;
  const activeYMax = zoomRange ? zoomRange.yMax : !autoYAxis ? customYMax : defaultMaxY;
  const activeXMin = zoomRange ? zoomRange.xMin : !autoXAxis ? customXMin : 0;
  const activeXMax = zoomRange ? zoomRange.xMax : !autoXAxis ? customXMax : totalDuration;

  const getSimX = (t: number) => X0 + ((t - activeXMin) / (activeXMax - activeXMin || 1)) * (X1 - X0);

  const logBounds = () => ({
    minLog: Math.log10(Math.max(0.001, activeYMin || 0.01)),
    maxLog: Math.log10(Math.max(0.01, activeYMax)),
  });
  const rawY = (c: number) => {
    const span = Y1 - Y0;
    if (isLogScale) {
      const { minLog, maxLog } = logBounds();
      return Y1 - ((Math.log10(Math.max(0.001, c)) - minLog) / (maxLog - minLog || 1)) * span;
    }
    return Y1 - ((c - activeYMin) / (activeYMax - activeYMin || 1)) * span;
  };
  const getSimY = (c: number) => Math.max(Y0, Math.min(Y1, rawY(c)));

  const pixelToCoord = (px: number, py: number) => {
    const time = activeXMin + ((px - X0) / (X1 - X0)) * (activeXMax - activeXMin);
    const fy = (Y1 - py) / (Y1 - Y0);
    let conc: number;
    if (isLogScale) {
      const { minLog, maxLog } = logBounds();
      conc = Math.pow(10, minLog + fy * (maxLog - minLog));
    } else {
      conc = activeYMin + fy * (activeYMax - activeYMin);
    }
    return { time: Math.max(0, time), conc: Math.max(0, conc) };
  };

  const toSvg = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (W / rect.width), y: (e.clientY - rect.top) * (H / rect.height) };
  };
  const inPlot = (x: number, y: number) => x >= X0 && x <= X1 && y >= Y0 && y <= Y1;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const { x, y } = toSvg(e);
    if (isDragging) setDragCurrent({ x, y });
    if (inPlot(x, y)) {
      const { time } = pixelToCoord(x, y);
      const len = shown[0]?.conc.length ?? 0;
      const idx = Math.min(len - 1, Math.max(0, Math.round(time / dt)));
      setHover({ time: idx * dt, idx, svgX: x, svgY: y });
    } else if (!isDragging) {
      setHover(null);
    }
  };
  const onDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const { x, y } = toSvg(e);
    if (inPlot(x, y)) {
      setIsDragging(true);
      setDragStart({ x, y });
      setDragCurrent({ x, y });
    }
  };
  const onUp = () => {
    if (isDragging && dragStart && dragCurrent) {
      const minX = Math.min(dragStart.x, dragCurrent.x), maxX = Math.max(dragStart.x, dragCurrent.x);
      const minY = Math.min(dragStart.y, dragCurrent.y), maxY = Math.max(dragStart.y, dragCurrent.y);
      if (maxX - minX > CHART.minDragPx && maxY - minY > CHART.minDragPx) {
        const c1 = pixelToCoord(minX, maxY);
        const c2 = pixelToCoord(maxX, minY);
        setZoomRange({
          xMin: Math.max(0, Number(c1.time.toFixed(2))),
          xMax: Number(c2.time.toFixed(2)),
          yMin: Math.max(0, Number(c1.conc.toFixed(3))),
          yMax: Number(c2.conc.toFixed(3)),
        });
      }
    }
    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  const resetZoom = () => {
    setZoomRange(null);
    setAutoXAxis(true);
    setAutoYAxis(true);
  };

  const applyZoomPreset = (preset: 'all' | 'first_dose' | 'steady_state') => {
    if (preset === 'all' || !ref) resetZoom();
    else if (preset === 'first_dose') {
      setZoomRange({ xMin: 0, xMax: Math.min(totalDuration, ref.tau * 2), yMin: 0, yMax: defaultMaxY });
    } else {
      setZoomRange({
        xMin: Math.max(0, (ref.numDoses - 2) * ref.tau),
        xMax: ref.numDoses * ref.tau,
        yMin: 0,
        yMax: defaultMaxY,
      });
    }
    setShowAxisMenu(false);
  };

  const xTicks = useMemo(() => {
    const range = activeXMax - activeXMin;
    const step = !autoXAxis && !zoomRange && customXStep > 0 ? customXStep : niceStepX(range);
    const out: number[] = [];
    const start = Math.ceil(activeXMin / step - 1e-9);
    for (let k = start; k * step <= activeXMax + 1e-9; k++) out.push(+(k * step).toFixed(6));
    return out;
  }, [activeXMin, activeXMax, autoXAxis, customXStep, zoomRange]);

  const yTicks = useMemo(() => {
    if (isLogScale) {
      return CHART.logTicks.filter((v) => v >= activeYMin * 0.999 && v <= activeYMax * 1.2);
    }
    const range = activeYMax - activeYMin;
    const step = !autoYAxis && !zoomRange && customYStep > 0 ? customYStep : niceStepY(range);
    const out: number[] = [];
    const start = Math.ceil(activeYMin / step - 1e-9);
    for (let k = start; k * step <= activeYMax + 1e-9; k++) out.push(+(k * step).toFixed(6));
    return out;
  }, [activeYMin, activeYMax, isLogScale, autoYAxis, customYStep, zoomRange]);

  const paths = useMemo(
    () =>
      series.map((s) => {
        if (!s.visible) return '';
        const parts: string[] = [];
        for (let i = 0; i < s.conc.length; i++) {
          parts.push(`${i === 0 ? 'M' : 'L'}${getSimX(i * dt).toFixed(1)} ${rawY(s.conc[i]).toFixed(1)}`);
        }
        return parts.join(' ');
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, dt, activeXMin, activeXMax, activeYMin, activeYMax, isLogScale]
  );

  const statusOf = (c: number) => (c > mtc ? '⚠ above MTC' : c < mec ? 'below MEC' : '✓ in window');
  // ggplot2 theme_classic look: solid axis lines + ticks, dark text, no grid
  const AX = CHART.axis;
  const axisStroke = isDark ? AX.lineDark : AX.lineLight;
  const axisText = isDark ? AX.textDark : AX.textLight;
  const gridStroke = isDark ? '#1e293b' : '#f1f5f9';
  const boxBtn = isDark ? 'bg-slate-950 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 hover:bg-slate-100';

  const axisRow = (
    title: string, auto: boolean, setAuto: (v: boolean) => void,
    vals: [number, number, number], setVals: [(v: number) => void, (v: number) => void, (v: number) => void],
    unit: string, minStep: number
  ) => (
    <div className="space-y-2 border-t pt-2 mb-1">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-xs">{title}</span>
        <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
          <input type="checkbox" checked={auto} onChange={(e) => { setAuto(e.target.checked); if (e.target.checked) setZoomRange(null); }} />
          <span>Auto Range</span>
        </label>
      </div>
      {!auto && (
        <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
          {['Min', 'Max', 'Step/Break'].map((lab, k) => (
            <div key={lab}>
              <span className="text-[10px] block opacity-70">{lab}{k < 2 ? ` (${unit})` : ''}</span>
              <input
                type="number"
                value={vals[k]}
                onChange={(e) => setVals[k](k === 2 ? Math.max(minStep, Number(e.target.value)) : Number(e.target.value))}
                className={`w-full border rounded px-1.5 py-0.5 ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={`border rounded p-4 relative ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className="flex flex-wrap items-center justify-between mb-3 text-xs gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h4 className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{title}</h4>
          <Segmented isDark={isDark} value={isLogScale ? 'log' : 'lin'}
            options={[{ value: 'lin', label: 'Linear' }, { value: 'log', label: 'Semi-Log' }]}
            onChange={(v) => setIsLogScale(v === 'log')} />
          {isZoomed && (
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
                  <div className="grid grid-cols-3 gap-1 font-mono text-[11px]">
                    <button onClick={() => applyZoomPreset('all')} className={`p-1 rounded border cursor-pointer ${boxBtn}`}>Full Horizon</button>
                    <button onClick={() => applyZoomPreset('first_dose')} className={`p-1 rounded border cursor-pointer ${boxBtn}`}>First 2 Doses</button>
                    <button onClick={() => applyZoomPreset('steady_state')} className={`p-1 rounded border cursor-pointer ${boxBtn}`}>Steady-State</button>
                  </div>
                </div>
                {axisRow('Y-Axis (Concentration)', autoYAxis, setAutoYAxis, [customYMin, customYMax, customYStep],
                  [setCustomYMin, setCustomYMax, setCustomYStep], 'mg/L', 0.01)}
                {axisRow('X-Axis (Time in Hours)', autoXAxis, setAutoXAxis, [customXMin, customXMax, customXStep],
                  [setCustomXMin, setCustomXMax, setCustomXStep], 'h', 0.5)}
              </div>
            )}
          </div>

          <ChartDownload isDark={isDark} getSvg={() => svgRef.current} title={title} fileBase={DOWNLOAD.fileBase.pk}
            legend={[
              ...(showWindow ? [{ label: `Target ${ref ? `(${ref.name.replace('Population ', 'Pop ')}) ` : ''}[${mec} – ${mtc} mg/L]`, color: windowColor, kind: 'box' } as LegendItem] : []),
              ...shown.map((x): LegendItem => ({ label: x.name.replace('Population ', 'Pop '), color: x.color, kind: 'line' })),
            ]} />

          <div className="hidden sm:flex items-center gap-3 text-xs font-mono flex-wrap">
            {showWindow && (
              <span className="flex items-center gap-1.5" style={{ color: windowColor }}>
                <span className="w-3 h-3 rounded-xs border" style={{ borderColor: windowColor, backgroundColor: `${windowColor}33` }}></span>
                <span>Target {ref ? `(${ref.name.replace('Population ', 'Pop ')})` : ''} [{mec} – {mtc} mg/L]</span>
              </span>
            )}
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
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox={`0 0 ${W} ${H}`}
          onMouseMove={onMove}
          onMouseDown={onDown}
          onMouseUp={onUp}
          onMouseLeave={() => { setHover(null); setIsDragging(false); setDragStart(null); setDragCurrent(null); }}
          onDoubleClick={resetZoom}
        >
          <defs>
            <clipPath id="plot-clip"><rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} /></clipPath>
          </defs>


          {showWindow && (
            <>
          {/* Therapeutic window */}
          <rect x={X0} y={Math.max(Y0, getSimY(mtc))} width={X1 - X0}
            height={Math.max(0, getSimY(mec) - Math.max(Y0, getSimY(mtc)))}
            fill={windowColor} fillOpacity={isDark ? 0.12 : 0.15} stroke={windowColor} strokeDasharray="4 2" strokeWidth="0.75" />
          {rawY(mtc) >= Y0 && rawY(mtc) <= Y1 && (
            <text x={755} y={rawY(mtc) - 4} fill="#ef4444" fontSize="10" textAnchor="end" fontFamily="monospace">MTC ({mtc} mg/L)</text>
          )}
          {rawY(mec) >= Y0 && rawY(mec) <= Y1 && (
            <text x={755} y={rawY(mec) + 12} fill={windowColor} fontSize="10" textAnchor="end" fontFamily="monospace">MEC ({mec} mg/L)</text>
          )}
            </>
          )}

          {xTicks.map((t) => {
            const x = getSimX(t);
            if (x < X0 - 0.5 || x > X1 + 0.5) return null;
            return (
              <g key={`x${t}`}>
                {AX.showGrid && <line x1={x} y1={Y0} x2={x} y2={Y1} stroke={gridStroke} strokeWidth="1" />}
                <line x1={x} y1={Y1} x2={x} y2={Y1 + AX.tickLength} stroke={axisStroke} strokeWidth={AX.tickWidth} />
                <text x={x} y={Y1 + AX.tickLength + 15} fill={axisText} fontSize={AX.tickFontSize} textAnchor="middle" fontFamily="monospace">{fmt(t)}</text>
              </g>
            );
          })}
          {yTicks.map((v) => {
            const y = getSimY(v);
            if (rawY(v) < Y0 - 0.5 || rawY(v) > Y1 + 0.5) return null;
            return (
              <g key={`y${v}`}>
                {AX.showGrid && <line x1={X0} y1={y} x2={X1} y2={y} stroke={gridStroke} strokeWidth="1" />}
                <line x1={X0 - AX.tickLength} y1={y} x2={X0} y2={y} stroke={axisStroke} strokeWidth={AX.tickWidth} />
                <text x={X0 - AX.tickLength - 5} y={y + 4} fill={axisText} fontSize={AX.tickFontSize} textAnchor="end" fontFamily="monospace">{fmt(v)}</text>
              </g>
            );
          })}

          {/* Dose markers, one colour per visible population (nudged apart so overlaps stay readable) */}
          <g clipPath="url(#plot-clip)">
            {series.map((s, si) =>
              s.visible
                ? Array.from({ length: s.numDoses }).map((_, d) => {
                    const x = getSimX(d * s.tau) + (si - 1) * 3;
                    if (x < X0 - 4 || x > X1 + 4) return null;
                    return (
                      <g key={`d${si}-${d}`}>
                        <line x1={x} y1={272} x2={x} y2={Y1} stroke={s.color} strokeWidth="1.5" opacity="0.85" />
                        <polygon points={`${x - 3},272 ${x + 3},272 ${x},265`} fill={s.color} opacity="0.85" />
                      </g>
                    );
                  })
                : null
            )}

            {series.map((s, si) =>
              s.visible ? <path key={s.name} d={paths[si]} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" /> : null
            )}
          </g>

          {/* Axis lines (left + bottom only, thick, square caps so the corner joins cleanly) */}
          <line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke={axisStroke} strokeWidth={AX.width} strokeLinecap="square" />
          <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke={axisStroke} strokeWidth={AX.width} strokeLinecap="square" />

          {hover && !isDragging && (
            <g pointerEvents="none">
              <line x1={hover.svgX} y1={Y0} x2={hover.svgX} y2={Y1} stroke={isDark ? '#94a3b8' : '#475569'} strokeDasharray="3 3" strokeWidth="1" />
              {shown.map((s) => {
                const c = s.conc[hover.idx];
                if (c === undefined) return null;
                return <circle key={s.name} cx={getSimX(hover.time)} cy={getSimY(c)} r="4" fill={s.color} stroke="#ffffff" strokeWidth="2" />;
              })}
            </g>
          )}

          {isDragging && dragStart && dragCurrent && (
            <rect x={Math.min(dragStart.x, dragCurrent.x)} y={Math.min(dragStart.y, dragCurrent.y)}
              width={Math.abs(dragCurrent.x - dragStart.x)} height={Math.abs(dragCurrent.y - dragStart.y)}
              fill="#3b82f6" fillOpacity="0.25" stroke="#2563eb" strokeDasharray="4 2" strokeWidth="1.5" />
          )}

          <text x={-(Y0 + Y1) / 2} y={13} fill={axisText} fontSize={AX.titleFontSize} textAnchor="middle" fontWeight="bold" transform="rotate(-90)">
            {isLogScale ? CHART.yAxisTitleLog : CHART.yAxisTitle}
          </text>
          <text x={(X0 + X1) / 2} y={H - 8} fill={axisText} fontSize={AX.titleFontSize} textAnchor="middle" fontWeight="bold">
            {CHART.xAxisTitle}
          </text>
        </svg>

        {hover && !isDragging && (
          <div
            className={`absolute pointer-events-none border rounded px-2.5 py-1.5 text-[11px] font-mono shadow-md z-40 whitespace-nowrap ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
            }`}
            style={{
              left: `${Math.min(68, Math.max(10, (hover.svgX / W) * 100 + 1))}%`,
              top: `${Math.min(55, Math.max(4, (hover.svgY / H) * 100 - 12))}%`,
            }}
          >
            <div className="font-bold mb-0.5">Time: <span className="text-blue-500">{fmt(hover.time)}h</span></div>
            {shown.map((s) => {
              const c = s.conc[hover.idx] ?? 0;
              return (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span>{s.name.replace('Population ', 'Pop ')}: <strong>{c.toFixed(2)}</strong> mg/L</span>
                  <span className="text-[10px] opacity-70">{statusOf(c)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>

      <div className={`mt-2 text-xs font-mono flex flex-wrap items-center justify-between border-t pt-2 gap-2 ${
        isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
      }`}>
        <span>Drag box to zoom. Double-click or click “Reset Zoom” to reset.</span>
        <span className={faint(isDark)}>
          Range: [{activeXMin.toFixed(0)}h – {activeXMax.toFixed(0)}h] | Y: [{activeYMin.toFixed(2)} – {activeYMax.toFixed(2)} mg/L]
        </span>
      </div>
    </div>
  );
};

