import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { SITE } from '../config/appConfig';
import { useInstallPrompt } from './useInstallPrompt';

/** Header button that installs the app (hidden when it is already installed or cannot be installed). */
export const InstallButton: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const state = useInstallPrompt();
  const [showHint, setShowHint] = useState(false);
  if (state.kind === 'installed' || state.kind === 'unavailable') return null;

  const cls = `flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-semibold cursor-pointer ${
    isDark ? 'border-blue-500 bg-blue-600 text-white hover:bg-blue-500' : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
  }`;

  return (
    <div className="relative">
      <button
        onClick={() => { if (state.kind === 'prompt') void state.install(); else setShowHint((v) => !v); }}
        className={cls}
        title={`Install ${SITE.shortName} as an app on this device`}
        aria-label={`Install ${SITE.shortName} as an app`}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install app</span>
      </button>
      {state.kind === 'manual' && showHint && (
        <div
          role="dialog"
          className={`absolute right-0 top-full mt-1 w-64 z-50 rounded border p-3 text-xs shadow-xl ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
          }`}
        >
          <div className="font-bold mb-1">Install {SITE.shortName}</div>
          <p>{state.hint}</p>
          <button onClick={() => setShowHint(false)} className="mt-2 text-blue-500 hover:underline cursor-pointer">Got it</button>
        </div>
      )}
    </div>
  );
};
