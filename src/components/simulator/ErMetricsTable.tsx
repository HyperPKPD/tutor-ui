import React from 'react';
import { ER_EXPOSURE_SOURCES, POP_COLORS, POP_NAMES } from '../../config/appConfig';
import { computeMetrics, ecFraction, hasPlateau, type ErMetrics } from '../../er/erEngine';
import type { ErModel, ErPop } from '../../er/erTypes';
import { muted, surface } from './ui';

interface Props {
  isDark: boolean;
  model: ErModel;
  pops: ErPop[];
  cRefs: number[];
  shownIdx: number[];
}

const f = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d));

export const ErMetricsTable: React.FC<Props> = ({ isDark, model, pops, cRefs, shownIdx }) => {
  const m: Record<number, ErMetrics> = {};
  for (const i of shownIdx) m[i] = computeMetrics(model, pops[i], cRefs[i]);
  const gamma = (i: number) => (model === 'emax' ? 1 : pops[i].gamma);

  type Row = { label: string; unit?: string; value: (i: number) => string; tone?: (i: number) => string };
  const rows: Row[] = [
    {
      label: 'Reference exposure', unit: 'mg/L',
      value: (i) => `${cRefs[i].toFixed(2)}`,
    },
    { label: 'Source', value: (i) => ER_EXPOSURE_SOURCES.find((s) => s.value === pops[i].exposureSource)?.label ?? '' },
    { label: 'Predicted effect E(C)', value: (i) => f(m[i].effect), tone: () => 'text-blue-500' },
  ];
  if (model !== 'loglinear') rows.push({ label: 'Change from baseline (E − E0)', value: (i) => f(m[i].deltaFromBaseline) });
  if (hasPlateau(model)) {
    rows.push(
      { label: '% of maximal effect', unit: '%', value: (i) => f(m[i].pctOfEmax, 0), tone: () => 'text-purple-500' },
      { label: 'Exposure relative to EC50 (C / EC50)', value: (i) => f(cRefs[i] / pops[i].ec50, 2) },
      { label: 'Maximum effect (E0 + Emax)', value: (i) => f(pops[i].e0 + pops[i].emax) },
    );
  }
  if (model === 'hockey') {
    rows.push({
      label: 'Threshold status',
      value: (i) => (cRefs[i] > pops[i].ct ? `above Ct (+${(cRefs[i] - pops[i].ct).toFixed(2)} mg/L)` : 'at/below Ct (no effect)'),
      tone: (i) => (cRefs[i] > pops[i].ct ? 'text-emerald-500' : 'text-amber-500'),
    });
  }
  rows.push(
    { label: 'Local slope dE/dC', unit: 'effect per mg/L', value: (i) => f(m[i].slope, 3) },
    { label: 'Effect change if exposure doubles (2×C)', value: (i) => f(m[i].deltaPerDoubling) },
  );
  if (hasPlateau(model)) {
    rows.push(
      { label: 'EC50', unit: 'mg/L', value: (i) => f(pops[i].ec50, 3) },
      { label: 'EC90 (90% of Emax)', unit: 'mg/L', value: (i) => f(ecFraction(pops[i], 0.9, gamma(i)), 3) },
    );
  }
  if (model === 'hockey') rows.push({ label: 'Threshold Ct', unit: 'mg/L', value: (i) => f(pops[i].ct, 2) });
  rows.push({
    label: 'Concentration for target effect E*', unit: 'mg/L',
    value: (i) => {
      const inv = m[i].inverse;
      const t = `E*=${f(pops[i].targetEffect, 0)}: `;
      return inv.kind === 'value' ? `${t}${inv.c.toPrecision(4)}` : inv.kind === 'atMost' ? `${t}≤ ${f(inv.c, 2)}` : `${t}n/a`;
    },
    tone: () => 'text-rose-500',
  });

  return (
    <div className={`${surface(isDark)} overflow-x-auto`}>
      <table className="w-full text-xs">
        <thead>
          <tr className={`border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <th className={`text-left font-normal px-3 py-2 text-[11px] ${muted(isDark)}`}>Exposure–response at steady-state exposure</th>
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
                <td key={i} className={`px-3 py-1.5 text-right font-mono font-bold text-sm whitespace-nowrap ${row.tone?.(i) || (isDark ? 'text-slate-100' : 'text-slate-900')}`}>
                  {row.value(i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
