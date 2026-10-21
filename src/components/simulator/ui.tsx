import React from 'react';

export const muted = (d: boolean) => (d ? 'text-slate-400' : 'text-slate-500');
export const faint = (d: boolean) => (d ? 'text-slate-500' : 'text-slate-400');
export const label = (d: boolean) => (d ? 'text-slate-300' : 'text-slate-700');
export const panelCard = (d: boolean) =>
  `border p-3 rounded ${d ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`;
export const surface = (d: boolean) =>
  `border rounded ${d ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`;
export const inputCls = (d: boolean) =>
  d ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900';

export const Segmented: React.FC<{
  isDark: boolean;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}> = ({ isDark, value, options, onChange }) => (
  <div className={`flex border rounded p-0.5 text-[11px] font-mono ${
    isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-100 border-slate-300'
  }`}>
    {options.map((o) => (
      <button
        key={o.value}
        onClick={() => onChange(o.value)}
        className={`px-2 py-0.5 rounded cursor-pointer ${
          value === o.value
            ? 'bg-blue-600 text-white font-bold'
            : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const ACCENT = {
  blue: { slider: 'accent-blue-500', num: ['text-blue-400', 'text-blue-700'] },
  emerald: { slider: 'accent-emerald-500', num: ['text-emerald-400', 'text-emerald-700'] },
  amber: { slider: 'accent-amber-500', num: ['text-amber-400', 'text-amber-700'] },
  purple: { slider: 'accent-purple-500', num: ['text-purple-400', 'text-purple-700'] },
  rose: { slider: 'accent-rose-500', num: ['text-rose-400', 'text-rose-700'] },
} as const;

export interface ParamSliderProps {
  isDark: boolean;
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  min: number; // slider range
  max: number;
  step: number;
  accent?: keyof typeof ACCENT;
  ticks?: [string, string, string];
  /** show an editable number box (default true) */
  numeric?: boolean;
  /** number box clamp (defaults to slider range) */
  clampMin?: number;
  clampMax?: number;
  decimals?: number;
}

export const ParamSlider: React.FC<ParamSliderProps> = ({
  isDark, label: text, unit, value, onChange, min, max, step, accent = 'blue', ticks,
  numeric = true, clampMin, clampMax, decimals,
}) => {
  const a = ACCENT[accent];
  const shown = decimals !== undefined ? Number(value.toFixed(decimals)) : value;
  return (
    <div className="space-y-1 mb-3 last:mb-0">
      <div className="flex justify-between items-center font-mono gap-2">
        <span className={label(isDark)}>{text}</span>
        <div className="flex items-center gap-1 shrink-0">
          {numeric ? (
            <input
              type="number"
              step={step}
              min={clampMin ?? min}
              max={clampMax ?? max}
              value={shown}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) onChange(v);
              }}
              className={`w-20 text-right font-bold border rounded px-1.5 py-0.5 text-xs ${
                isDark ? `bg-slate-900 border-slate-700 ${a.num[0]}` : `bg-white border-slate-300 ${a.num[1]}`
              }`}
            />
          ) : (
            <strong className={isDark ? 'text-white' : 'text-slate-900'}>{shown}</strong>
          )}
          <span className={`text-[11px] ${muted(isDark)}`}>{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full cursor-pointer ${a.slider}`}
      />
      {ticks && (
        <div className={`flex justify-between text-[10px] font-mono ${faint(isDark)}`}>
          <span>{ticks[0]}</span>
          <span>{ticks[1]}</span>
          <span>{ticks[2]}</span>
        </div>
      )}
    </div>
  );
};
