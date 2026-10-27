import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, HelpCircle } from 'lucide-react';
import { APP_VERSION } from '../version';
import { HELP } from '../config/appConfig';

/** One section of the help guide (id is used for in-modal navigation). */
interface Section { id: string; title: string; body: React.ReactNode }

const SECTIONS = (isDark: boolean): Section[] => {
  const code = `px-1 rounded font-mono text-[12px] ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`;
  const C = ({ children }: { children: React.ReactNode }) => <code className={code}>{children}</code>;
  return [
    {
      id: 'about', title: 'About',
      body: (
        <>
          <p><strong>HyperPKPD Tutor</strong> is a free, interactive teaching tool for <strong>population pharmacokinetics (PK)</strong> and <strong>exposure–response (ER)</strong> analysis. It is part of <a href={HELP.parentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">hyperpkpd.com</a>.</p>
          <p><strong>Author:</strong> {HELP.author}</p>
          <p><strong>Version:</strong> {APP_VERSION}</p>
          <p>Everything runs in your browser. There is no server, no account and no analytics: nothing you enter leaves your device. Your settings are saved automatically in the browser and restored the next time you open the app.</p>
        </>
      ),
    },
    {
      id: 'purpose', title: 'Why this app exists',
      body: (
        <>
          <p>PK/PD equations are easy to read and hard to <em>feel</em>. Students and practitioners often know that “clearance controls exposure” or that “a steep Hill curve amplifies variability”, but have rarely seen those statements play out numerically. This app turns the equations into something you can manipulate and watch.</p>
          <p>Its goals are to:</p>
          <ul>
            <li>build intuition for how <strong>dose, interval, clearance, volume, absorption and distribution</strong> shape concentration–time profiles;</li>
            <li>show why <strong>different patient populations</strong> (e.g. renal impairment, high clearance, body weight) need different regimens;</li>
            <li>contrast <strong>linear</strong> PK with <strong>non-linear target-mediated disposition (TMDD)</strong>, typical of monoclonal antibodies;</li>
            <li>connect <strong>exposure to effect</strong> with the five standard ER models, and answer the practical question “what concentration (and therefore what dose) gives the effect I want?”;</li>
            <li>let you <strong>test yourself</strong> with quizzes whose explanations point back to the simulator.</li>
          </ul>
          <p>It is an <strong>educational tool</strong>. It is not validated for clinical decision-making, dose selection or regulatory work.</p>
        </>
      ),
    },
    {
      id: 'layout', title: 'Screen layout',
      body: (
        <>
          <ol>
            <li><strong>Header</strong> (blue bar): app name and version, the <em>Install app</em> button (when your browser supports it), save status, <em>Reset</em> (erases all saved settings after a second click), this <em>Help</em> button and the light/dark theme toggle.</li>
            <li><strong>Control bar</strong>: the <em>Analysis</em> selector (Population PK or Exposure Response), the model selector, TMDD route and readout options, and status badges summarising each population at a glance.</li>
            <li><strong>Left panel – inputs</strong>: tabs <em>Pop 1</em>, <em>Pop 2</em>, <em>Pop 3</em>. Each population has its own full set of parameters; the tab you select is the one you are editing. <em>Copy from</em> copies another population's settings into the current one.</li>
            <li><strong>Right column – outputs</strong>, top to bottom: the <em>Concept Quiz</em>, the <em>Populations shown</em> bar (hide/show each population or show “only” one), the <strong>chart</strong>, the <strong>results table</strong> and the <strong>equations panel</strong>.</li>
          </ol>
          <p>On a desktop you can drag the divider between the panels to resize them (double-click to reset). On a phone the panels stack and the page scrolls; swipe the chart sideways to see all of it.</p>
        </>
      ),
    },
    {
      id: 'pk', title: 'Population PK mode',
      body: (
        <>
          <p>Choose <strong>Analysis → Population PK</strong>, then a model:</p>
          <ul>
            <li><strong>1-, 2- and 3-compartment oral</strong> (first-order absorption, Ka) and <strong>IV bolus</strong> models, solved exactly as sums of exponentials.</li>
            <li><strong>TMDD, 1- or 2-compartment</strong> (full Mager–Jusko model with free drug, free target and drug–target complex), IV bolus or SC, plotting free or total drug.</li>
          </ul>
          <p><strong>Inputs per population</strong> (left panel):</p>
          <ul>
            <li><strong>CL, V1 and t½</strong> are linked (t½ = 0.693·V1/CL): change any one and the others follow. Presets: Standard, Renal Impaired, High CL, High Vd.</li>
            <li><strong>Ka</strong> (oral/SC), <strong>Q2/V2</strong> and <strong>Q3/V3</strong> for multi-compartment models; the terminal half-life is shown underneath.</li>
            <li><strong>TMDD</strong>: R0, kdeg, kon, koff, kint and molecular weight, plus <em>mAb defaults (all)</em> for typical antibody values.</li>
            <li><strong>Dosing</strong>: dose, interval (q6h to q2w) and number of doses plotted.</li>
            <li><strong>Covariates</strong> (optional): body weight and creatinine clearance scale CL, volumes and Q allometrically.</li>
            <li><strong>Therapeutic window</strong>: MEC and MTC, drawn as a shaded band.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'er', title: 'Exposure–Response mode',
      body: (
        <>
          <p>Choose <strong>Analysis → Exposure Response</strong> and an ER model:</p>
          <ul>
            <li><strong>Linear</strong> <C>E = E0 + β·C</C></li>
            <li><strong>Log-linear</strong> <C>E = E0 + β·ln(C)</C> (or log10)</li>
            <li><strong>Emax</strong> <C>E = E0 + Emax·C/(EC50 + C)</C></li>
            <li><strong>Sigmoidal Emax (Hill)</strong> <C>E = E0 + Emax·C^γ/(EC50^γ + C^γ)</C></li>
            <li><strong>Hockey-stick</strong> <C>E = E0 + β·max(0, C − Ct)</C></li>
          </ul>
          <p>The left panel shows only the parameters of the chosen model. The <strong>Reference exposure</strong> is taken from each population's PK simulation (Cavg,ss, Cmax,ss or Cmin,ss) or typed in manually. This links the two halves of the app: change the dose on the PK side and the effect on the ER side moves with it. The <strong>Target effect</strong> box inverts the model and gives the concentration needed for the effect you want.</p>
        </>
      ),
    },
    {
      id: 'outputs', title: 'What you get (outputs)',
      body: (
        <>
          <p><strong>Population PK</strong></p>
          <ul>
            <li><strong>Concentration–time chart</strong> for each shown population, with dose markers and the therapeutic window; linear or semi-log axis, drag-to-zoom, zoom presets and hover read-outs.</li>
            <li><strong>Steady-state table</strong>: Cmax,ss, Cmin,ss, Cavg,ss, AUCτ, accumulation ratio, % time ≥ MEC and, for TMDD, the lowest free target. These are <em>true</em> steady-state values (as if dosing continued indefinitely); the “Last simulated dose” row shows how close the plotted regimen gets.</li>
            <li><strong>Status badges</strong>: target attained, toxicity risk (above MTC) or sub-therapeutic trough.</li>
            <li><strong>Equations panel</strong>: model equations, parameter linkage, superposition and steady-state formulas with your numbers substituted, and the core assumptions.</li>
          </ul>
          <p><strong>Exposure–Response</strong></p>
          <ul>
            <li><strong>Effect–concentration chart</strong> with reference-exposure dots, EC50 markers, plateau, threshold and the target-effect line.</li>
            <li><strong>Table</strong>: predicted effect, change from baseline, % of Emax, C/EC50, local slope, effect change per doubling of exposure, EC50/EC90 or threshold status, and the concentration needed for the target.</li>
            <li><strong>Equations panel</strong> with live worked values, a summary of all five models and assumptions.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'howto', title: 'How to use it (a 5-minute tour)',
      body: (
        <ol>
          <li><strong>Compare populations.</strong> On the default 2-compartment oral model, Pop 2 (renal impaired) climbs above the window. Click <em>only</em> next to Population 2 to see it alone.</li>
          <li><strong>Fix the regimen.</strong> On the Pop 2 tab, lower the dose or lengthen the interval until its badge turns green.</li>
          <li><strong>Change the structure.</strong> Switch to <em>3-Compartment IV Bolus</em> and read the terminal t½ in the left panel.</li>
          <li><strong>Go non-linear.</strong> Pick <em>TMDD · 2-Compartment</em>, click <em>mAb defaults (all)</em>, then double the dose: AUC rises more than twofold.</li>
          <li><strong>Link to effect.</strong> Switch to <em>Exposure Response</em>, choose <em>Sigmoidal Emax</em>, raise γ and watch the same exposures land on a steeper part of the curve.</li>
          <li><strong>Ask the inverse question.</strong> Set a target effect and read the concentration you need.</li>
          <li><strong>Test yourself.</strong> Answer the quiz; each explanation has a “Try it” tip telling you which control to move.</li>
        </ol>
      ),
    },
    {
      id: 'quiz', title: 'Concept quizzes',
      body: (
        <>
          <p>The collapsible quiz above the chart draws 15 random questions per round (core, hard and expert), shuffles the answers and explains every one. In PK mode the pool covers PK; in ER mode it covers the selected ER model plus general ER questions. Your best score is kept for each pool. Press <em>New round</em> for a fresh set.</p>
        </>
      ),
    },
    {
      id: 'tips', title: 'Tips, saving & offline use',
      body: (
        <ul>
          <li>Every input has a slider and a number box; type exact values in the box.</li>
          <li>All settings, chart zoom, theme and quiz progress are saved automatically. <em>Reset</em> restores factory defaults.</li>
          <li>Use <em>Install app</em> (Chrome/Edge) or <em>Add to Home Screen</em> (Safari) to install the app; it then works offline.</li>
          <li>For drugs with a long terminal phase, raise the number of doses to see the plotted curve approach steady state.</li>
        </ul>
      ),
    },
    {
      id: 'limits', title: 'Assumptions & limitations',
      body: (
        <ul>
          <li>Typical population values only: no between-subject variability or residual error.</li>
          <li>Bioavailability F = 1 (parameters are apparent CL/F, V/F). TMDD assumes 1:1 binding in the central compartment.</li>
          <li>ER models assume a direct, instantaneous, reversible effect of one exposure metric (no delay, tolerance or disease progression).</li>
          <li>Not validated for clinical decision-making, dose selection or regulatory use.</li>
        </ul>
      ),
    },
  ];
};

export const HelpButton: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Help and about"
        title="Help: how to use HyperPKPD"
        className={`p-1.5 rounded cursor-pointer ${
          isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-white hover:bg-blue-800'
        }`}
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {open && <HelpModal isDark={isDark} onClose={() => setOpen(false)} />}
    </>
  );
};

const HelpModal: React.FC<{ isDark: boolean; onClose: () => void }> = ({ isDark, onClose }) => {
  const sections = SECTIONS(isDark);
  const [active, setActive] = useState(sections[0].id);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Esc closes; lock focus target
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // highlight the section currently in view
  const onScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    let cur = sections[0].id;
    for (const s of sections) {
      const h = el.querySelector<HTMLElement>(`#help-${s.id}`);
      if (h && h.getBoundingClientRect().top - top <= 80) cur = s.id;
    }
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) cur = sections[sections.length - 1].id;
    setActive(cur);
  };
  const go = (id: string) => {
    const el = bodyRef.current?.querySelector<HTMLElement>(`#help-${id}`);
    if (el && bodyRef.current) bodyRef.current.scrollTo({ top: el.offsetTop - 12, behavior: 'smooth' });
    setActive(id);
  };

  const navItem = (on: boolean) => `text-left whitespace-nowrap px-3 py-1.5 rounded text-xs cursor-pointer ${
    on ? 'bg-blue-600 text-white font-semibold'
      : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'
  }`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-2 sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        className={`w-full max-w-5xl h-[92dvh] sm:h-[85vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-sky-200 text-slate-800'
        }`}
      >
        {/* Window title bar */}
        <div className={`relative flex items-center h-10 px-3 border-b shrink-0 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <button onClick={onClose} aria-label="Close help" title="Close"
              className="w-3.5 h-3.5 rounded-full bg-[#ff5f57] border border-black/10 cursor-pointer hover:brightness-90" />
            <span className="w-3.5 h-3.5 rounded-full bg-[#febc2e] border border-black/10" aria-hidden />
            <span className="w-3.5 h-3.5 rounded-full bg-[#28c840] border border-black/10" aria-hidden />
          </div>
          <h2 id="help-title" className="absolute left-1/2 -translate-x-1/2 text-xs font-semibold truncate max-w-[60%]">
            HyperPKPD Tutor · Help &amp; About
          </h2>
          <a href={HELP.parentUrl} target="_blank" rel="noopener noreferrer"
            className="ml-auto hidden sm:flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
            hyperpkpd.com <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Header block */}
        <div className={`px-5 py-4 border-b shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="text-lg font-bold">HyperPKPD Tutor</div>
          <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Interactive population PK and exposure–response simulator · by <strong>{HELP.author}</strong> ·{' '}
            <a href={HELP.parentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">
              {HELP.parentUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Navigation: side bar on desktop, scrollable strip on phones */}
          <nav aria-label="Help sections"
            className={`shrink-0 md:w-56 flex md:flex-col gap-1 p-2 overflow-x-auto md:overflow-y-auto border-b md:border-b-0 md:border-r ${
              isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
            }`}>
            {sections.map((s) => (
              <button key={s.id} onClick={() => go(s.id)} className={navItem(active === s.id)} aria-current={active === s.id}>
                {s.title}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div ref={bodyRef} onScroll={onScroll}
            className="relative flex-1 min-h-0 overflow-y-auto px-5 py-4 text-sm leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1">
            {sections.map((s) => (
              <section key={s.id} id={`help-${s.id}`} className="mb-6 scroll-mt-3">
                <h3 className="text-base font-bold text-blue-600 dark:text-blue-400 mb-2">{s.title}</h3>
                {s.body}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
