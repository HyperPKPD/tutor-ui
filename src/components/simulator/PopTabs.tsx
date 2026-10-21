import React from 'react';
import { Copy, EyeOff } from 'lucide-react';
import { POP_COLORS, POP_NAMES } from '../../config/appConfig';
import { inputCls, muted } from './ui';

/** Sticky population tab strip shared by the PK and Exposure-Response left panels. */
export const PopTabStrip: React.FC<{
  isDark: boolean; activeIdx: number; visible: boolean[]; onSelect: (i: number) => void;
}> = ({ isDark, activeIdx, visible, onSelect }) => (
  <div role="tablist" className={`sticky top-0 z-10 flex border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
    {POP_NAMES.map((name, i) => {
      const active = i === activeIdx;
      return (
        <button
          key={name}
          role="tab"
          aria-selected={active}
          onClick={() => onSelect(i)}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-[11px] font-semibold cursor-pointer border-b-2 ${
            active
              ? isDark ? 'text-white bg-slate-950/60' : 'text-slate-900 bg-slate-50'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
          } ${visible[i] ? '' : 'opacity-60'}`}
          style={{ borderBottomColor: active ? POP_COLORS[i] : 'transparent' }}
        >
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: POP_COLORS[i], opacity: visible[i] ? 1 : 0.35 }} />
          <span>Pop {i + 1}</span>
          {!visible[i] && <EyeOff className="w-3 h-3" />}
        </button>
      );
    })}
  </div>
);

/** "Editing Population X" row with the Copy-from selector, plus the hidden-population banner. */
export const PopEditHeader: React.FC<{
  isDark: boolean; activeIdx: number; visible: boolean[]; onCopyFrom: (src: number) => void;
}> = ({ isDark, activeIdx, visible, onCopyFrom }) => {
  const color = POP_COLORS[activeIdx];
  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-semibold flex items-center gap-1.5" style={{ color }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          Editing {POP_NAMES[activeIdx]}
        </span>
        <label className={`flex items-center gap-1 text-[10px] font-mono ${muted(isDark)}`}>
          <Copy className="w-3 h-3" />
          <span>Copy from</span>
          <select
            value=""
            onChange={(e) => { if (e.target.value !== '') onCopyFrom(Number(e.target.value)); }}
            className={`border rounded px-1 py-0.5 cursor-pointer ${inputCls(isDark)}`}
          >
            <option value="">Select…</option>
            {POP_NAMES.map((n, i) => i !== activeIdx && <option key={n} value={i}>{n}</option>)}
          </select>
        </label>
      </div>

      {!visible[activeIdx] && (
        <div className={`flex items-center gap-1.5 rounded border px-2 py-1.5 text-[11px] ${
          isDark ? 'bg-amber-950/40 border-amber-900 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <EyeOff className="w-3.5 h-3.5 shrink-0" />
          <span>Hidden in the chart. Turn it back on under “Populations shown”.</span>
        </div>
      )}
    </>
  );
};
