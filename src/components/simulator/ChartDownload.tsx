import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { DOWNLOAD, PERSISTENCE } from '../../config/appConfig';
import { usePersistedState } from '../../db/usePersistedState';
import * as sanitize from '../../db/sanitize';
import { muted } from './ui';

export interface LegendItem { label: string; color: string; kind: 'line' | 'box' }

interface Props {
  isDark: boolean;
  getSvg: () => SVGSVGElement | null;
  title: string;
  legend: LegendItem[];
  fileBase: string;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Insert a pHYs chunk so image editors / Word / journals read the intended DPI. */
function withDpi(png: Uint8Array, dpi: number): Uint8Array {
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // 'pHYs'
  dv.setUint32(8, ppm);
  dv.setUint32(12, ppm);
  chunk[16] = 1; // metres
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));
  const at = 33; // right after the 25-byte IHDR chunk + 8-byte signature
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, at), 0);
  out.set(chunk, at);
  out.set(png.subarray(at), at + chunk.length);
  return out;
}

async function renderPng(svg: SVGSVGElement, o: sanitize.DownloadOpts, isDark: boolean, title: string, legend: LegendItem[]) {
  const W = Math.round(o.widthIn * o.dpi);
  const H = Math.round(o.heightIn * o.dpi);
  const s = W / 800; // text scales with the image width so a wider/denser export stays proportional
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  if (!o.transparent) {
    ctx.fillStyle = isDark ? DOWNLOAD.backgroundDark : DOWNLOAD.backgroundLight;
    ctx.fillRect(0, 0, W, H);
  }

  // Header (title + legend) drawn on the canvas; the SVG fills the area below.
  let top = 0;
  if (o.title) {
    const pad = 12 * s;
    let y = pad + 13 * s;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = isDark ? DOWNLOAD.titleColorDark : DOWNLOAD.titleColorLight;
    ctx.font = `600 ${14 * s}px ${DOWNLOAD.fontFamily}`;
    ctx.fillText(title, pad, y);
    y += 8 * s;
    ctx.font = `${11 * s}px ui-monospace, Menlo, Consolas, monospace`;
    let x = pad;
    let rowY = y + 12 * s;
    for (const it of legend) {
      const w = ctx.measureText(it.label).width + 26 * s;
      if (x + w > W - pad && x > pad) { x = pad; rowY += 16 * s; }
      ctx.fillStyle = it.color;
      if (it.kind === 'box') {
        ctx.globalAlpha = 0.25; ctx.fillRect(x, rowY - 9 * s, 11 * s, 11 * s); ctx.globalAlpha = 1;
        ctx.strokeStyle = it.color; ctx.lineWidth = s; ctx.strokeRect(x, rowY - 9 * s, 11 * s, 11 * s);
      } else {
        ctx.fillRect(x, rowY - 4 * s, 12 * s, 2.5 * s);
      }
      ctx.fillText(it.label, x + 17 * s, rowY);
      x += w + 10 * s;
    }
    top = rowY + 8 * s;
  }

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.removeAttribute('class');
  clone.setAttribute('width', String(W));
  clone.setAttribute('height', String(Math.max(10, H - top)));
  clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  clone.style.fontFamily = DOWNLOAD.fontFamily;
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('Could not render chart')); img.src = url; });
    ctx.drawImage(img, 0, top, W, Math.max(10, H - top));
  } finally {
    URL.revokeObjectURL(url);
  }
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('PNG encoding failed'))), 'image/png'));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return new Blob([withDpi(bytes, o.dpi) as BlobPart], { type: 'image/png' });
}

export const ChartDownload: React.FC<Props> = ({ isDark, getSvg, title, legend, fileBase }) => {
  const K = PERSISTENCE.keys;
  const [open, setOpen] = useState(false);
  const [o, setO] = usePersistedState<sanitize.DownloadOpts>(K.downloadOpts, DOWNLOAD.defaults, sanitize.downloadOpts);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const pxW = Math.round(o.widthIn * o.dpi);
  const pxH = Math.round(o.heightIn * o.dpi);
  const tooBig = pxW > DOWNLOAD.maxSidePx || pxH > DOWNLOAD.maxSidePx || pxW * pxH > DOWNLOAD.maxPixels;

  const num = (k: 'widthIn' | 'heightIn' | 'dpi', lo: number, hi: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (Number.isFinite(v)) setO((p) => ({ ...p, [k]: Math.min(hi, Math.max(lo, v)) }));
  };
  const inp = `w-full border rounded px-1.5 py-1 font-mono ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`;
  const lbl = `text-[10px] uppercase font-bold tracking-wider block mb-1 ${muted(isDark)}`;

  const go = async () => {
    const svg = getSvg();
    if (!svg || tooBig) return;
    setBusy(true); setErr('');
    try {
      const blob = await renderPng(svg, o, isDark, title, legend);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${fileBase}-${pxW}x${pxH}-${o.dpi}dpi.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-haspopup="true" aria-expanded={open}
        className={`flex items-center gap-1.5 border px-2.5 py-1 rounded text-xs cursor-pointer ${
          open ? 'bg-blue-600 text-white border-blue-600 font-semibold'
            : isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
        }`}>
        <Download className="w-3.5 h-3.5" /><span>Download</span>
      </button>
      {open && (
        <div className={`absolute right-0 top-full mt-1 w-72 border rounded z-50 p-3 text-xs shadow-xl font-sans ${
          isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
        }`}>
          <div className="font-bold border-b pb-1.5 mb-2.5">Download as PNG</div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className={lbl} htmlFor="dl-w">Width (in)</label>
              <input id="dl-w" type="number" className={inp} value={o.widthIn}
                min={DOWNLOAD.widthIn.min} max={DOWNLOAD.widthIn.max} step={DOWNLOAD.widthIn.step}
                onChange={num('widthIn', DOWNLOAD.widthIn.min, DOWNLOAD.widthIn.max)} />
            </div>
            <div>
              <label className={lbl} htmlFor="dl-h">Height (in)</label>
              <input id="dl-h" type="number" className={inp} value={o.heightIn}
                min={DOWNLOAD.heightIn.min} max={DOWNLOAD.heightIn.max} step={DOWNLOAD.heightIn.step}
                onChange={num('heightIn', DOWNLOAD.heightIn.min, DOWNLOAD.heightIn.max)} />
            </div>
          </div>
          <label className={lbl} htmlFor="dl-dpi">Resolution (DPI)</label>
          <input id="dl-dpi" type="number" className={inp} value={o.dpi}
            min={DOWNLOAD.dpi.min} max={DOWNLOAD.dpi.max} step={DOWNLOAD.dpi.step}
            onChange={num('dpi', DOWNLOAD.dpi.min, DOWNLOAD.dpi.max)} />
          <div className="flex gap-1 mt-1.5 font-mono text-[11px]">
            {DOWNLOAD.dpi.presets.map((d) => (
              <button key={d} onClick={() => setO((p) => ({ ...p, dpi: d }))}
                className={`flex-1 p-1 rounded border cursor-pointer ${o.dpi === d ? 'bg-blue-600 text-white border-blue-600'
                  : isDark ? 'bg-slate-950 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>{d}</button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 mt-2.5 cursor-pointer">
            <input type="checkbox" checked={o.title} onChange={(e) => setO((p) => ({ ...p, title: e.target.checked }))} />
            <span>Include title &amp; legend</span>
          </label>
          <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
            <input type="checkbox" checked={o.transparent} onChange={(e) => setO((p) => ({ ...p, transparent: e.target.checked }))} />
            <span>Transparent background</span>
          </label>
          <div className={`mt-2 font-mono text-[11px] ${tooBig ? 'text-red-500' : muted(isDark)}`}>
            {tooBig ? `Too large (${pxW} × ${pxH} px) — reduce size or DPI.` : `Output: ${pxW} × ${pxH} px`}
          </div>
          {err && <div className="mt-1 text-red-500">{err}</div>}
          <button onClick={go} disabled={busy || tooBig}
            className="mt-2.5 w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-1.5 rounded cursor-pointer">
            <Download className="w-3.5 h-3.5" /><span>{busy ? 'Rendering…' : 'Download PNG'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
