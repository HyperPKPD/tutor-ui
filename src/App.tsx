import React, { useState } from 'react';
import { CloudOff, Database, Loader2, Moon, RotateCcw, Sun } from 'lucide-react';
import { PkSimulator } from './components/simulator/PkSimulator';
import { APP } from './config/appConfig';
import { useTheme } from './context/ThemeContext';
import { resetAll, useSaveStatus } from './db/persistence';
import { APP_VERSION } from './version';
import { InstallButton } from './pwa/InstallButton';
import { HelpButton } from './help/HelpModal';

const SaveIndicator: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const { status } = useSaveStatus();
  const [confirming, setConfirming] = useState(false);
  // light theme: the header is blue, so text and borders use light tints
  const tone = isDark ? 'text-slate-400' : 'text-blue-100';

  const label =
    status === 'saving' ? { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, text: 'Saving…', cls: tone }
    : status === 'error' ? { icon: <CloudOff className="w-3.5 h-3.5" />, text: 'Save failed – retrying', cls: isDark ? 'text-rose-500' : 'text-rose-200' }
    : status === 'unavailable' ? { icon: <CloudOff className="w-3.5 h-3.5" />, text: 'Not saved (storage unavailable)', cls: isDark ? 'text-amber-500' : 'text-amber-200' }
    : { icon: <Database className="w-3.5 h-3.5" />, text: 'All changes saved', cls: isDark ? 'text-emerald-400' : 'text-white' };

  return (
    <div className="flex items-center gap-2 text-[11px] font-mono">
      <span className={`flex items-center gap-1 ${label.cls}`} role="status" title="Settings are stored in your browser (IndexedDB)">
        {label.icon}<span className="hidden sm:inline">{label.text}</span>
      </span>
      <button
        onClick={() => { if (confirming) void resetAll(); else setConfirming(true); }}
        onBlur={() => setConfirming(false)}
        title="Erase all saved settings and quiz history and restore defaults"
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded border cursor-pointer ${
          confirming
            ? 'border-rose-500 bg-rose-600 text-white'
            : isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-blue-300 text-white hover:bg-blue-800'
        }`}
      >
        <RotateCcw className="w-3 h-3" />
        <span>{confirming ? 'Click again to confirm' : 'Reset'}</span>
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className={`h-screen h-dvh overflow-hidden flex flex-col ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 border-b ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-blue-700 border-blue-800 text-white'
      }`}>
        <div className="flex items-baseline gap-2 flex-wrap">
          <h1 className="text-sm font-bold tracking-tight">{APP.name}</h1>
          <span className={`hidden sm:inline text-xs ${isDark ? 'text-slate-400' : 'text-blue-100'}`}>{APP.subtitle}</span>
          <span
            title="Application version (see VERSIONS.md)"
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
              isDark ? 'border-slate-700 text-slate-400' : 'border-blue-300 text-blue-100'
            }`}
          >
            v{APP_VERSION}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <InstallButton isDark={isDark} />
          <SaveIndicator isDark={isDark} />
          <HelpButton isDark={isDark} />
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`p-1.5 rounded border cursor-pointer ${
              isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-blue-300 text-white hover:bg-blue-800'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>
      <main className="flex-1 min-h-0">
        <PkSimulator />
      </main>
    </div>
  );
};

export default App;
