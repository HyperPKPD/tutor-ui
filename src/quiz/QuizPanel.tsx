import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, GraduationCap, Lightbulb, RotateCcw, Shuffle, Trophy, XCircle } from 'lucide-react';
import { PERSISTENCE, QUIZ } from '../config/appConfig';
import { addQuizAttempt, getQuizStats } from '../db/persistence';
import { usePersistedState } from '../db/usePersistedState';
import { bool } from '../db/sanitize';
import { surface, muted } from '../components/simulator/ui';
import { drawDeck } from './deck';
import { DIFFICULTY_LABELS, type Difficulty, type QuizQuestion } from './quizQuestions';

const DIFF_STYLE: Record<Difficulty, [string, string]> = {
  core: ['bg-slate-200 text-slate-700', 'bg-slate-700 text-slate-200'],
  hard: ['bg-amber-100 text-amber-800', 'bg-amber-900/60 text-amber-200'],
  expert: ['bg-rose-100 text-rose-800', 'bg-rose-900/60 text-rose-200'],
};

/**
 * Each time the app loads (or a new round is requested) a fresh random set of questions is drawn from the
 * pool. Only the open/closed state of the panel and completed-attempt history are persisted.
 */
export const QuizPanel: React.FC<{ isDark: boolean; pool: readonly QuizQuestion[]; poolId: string }> = ({ isDark, pool, poolId }) => {
  const [open, setOpen] = usePersistedState<boolean>(PERSISTENCE.keys.quizOpen, QUIZ.openByDefault, bool);
  const [deck, setDeck] = useState(() => drawDeck(pool, QUIZ.questionsPerRound));
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(deck.length).fill(null));
  const [current, setCurrent] = useState(0);
  const [picked, setPicked] = useState<number | null>(null); // chosen but not yet checked
  const [recorded, setRecorded] = useState(false);
  const [stats, setStats] = useState<{ attempts: number; best: number | null; total: number | null }>({ attempts: 0, best: null, total: null });

  const N = deck.length;
  const answeredCount = answers.filter((a) => a !== null).length;
  const score = deck.reduce((s, qq, i) => (answers[i] === qq.correct ? s + 1 : s), 0);
  const finished = answeredCount === N;
  const q = deck[current];
  const answer = answers[current];
  const checked = answer !== null;
  const byLevel = (['core', 'hard', 'expert'] as Difficulty[])
    .map((d) => {
      const idx = deck.map((qq, i) => (qq.difficulty === d ? i : -1)).filter((i) => i >= 0);
      return { d, total: idx.length, right: idx.filter((i) => answers[i] === deck[i].correct).length };
    })
    .filter((l) => l.total > 0);

  useEffect(() => { void getQuizStats(poolId).then(setStats); }, [poolId]);

  // Record a completed round exactly once
  useEffect(() => {
    if (finished && !recorded) {
      setRecorded(true);
      void addQuizAttempt({ completedAt: Date.now(), score, total: N, answers, pool: poolId }).then(() => getQuizStats(poolId).then(setStats));
    }
  }, [finished, recorded, score, N, answers]);

  useEffect(() => { setPicked(null); }, [current]);

  const go = (i: number) => setCurrent(Math.min(N - 1, Math.max(0, i)));
  const check = () => {
    if (picked === null || checked) return;
    setAnswers((a) => a.map((v, i) => (i === current ? picked : v)));
  };
  const newRound = () => {
    const d = drawDeck(pool, QUIZ.questionsPerRound);
    setDeck(d);
    setAnswers(Array(d.length).fill(null));
    setCurrent(0);
    setPicked(null);
    setRecorded(false);
  };

  const dotTone = (i: number) => {
    const a = answers[i];
    if (a === null) return isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300';
    return a === deck[i].correct ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-rose-600 text-white border-rose-600';
  };

  const optionTone = (i: number) => {
    if (checked) {
      if (i === q.correct) return isDark ? 'border-emerald-500 bg-emerald-950/50 text-emerald-100' : 'border-emerald-500 bg-emerald-50 text-emerald-900';
      if (i === answer) return isDark ? 'border-rose-500 bg-rose-950/50 text-rose-100' : 'border-rose-500 bg-rose-50 text-rose-900';
      return isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400';
    }
    if (i === picked) return isDark ? 'border-blue-500 bg-blue-950/50 text-white' : 'border-blue-500 bg-blue-50 text-slate-900';
    return isDark ? 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/60 text-slate-200' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-800';
  };

  const btn = (primary = false) =>
    `px-3 py-1.5 rounded border text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
      primary
        ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
        : isDark ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
    }`;

  return (
    <section className={`${surface(isDark)} text-xs`} aria-label={QUIZ.title}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="quiz-body"
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer text-left"
      >
        <span className="flex items-center gap-2 font-semibold">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <GraduationCap className="w-4 h-4 text-blue-500" />
          <span className={isDark ? 'text-slate-100' : 'text-slate-900'}>{QUIZ.title}</span>
        </span>
        <span className={`flex items-center gap-3 font-mono text-[11px] ${muted(isDark)}`}>
          <span>{answeredCount}/{N} answered</span>
          <span className={score > 0 ? 'text-emerald-500 font-bold' : ''}>Score {score}/{answeredCount}</span>
          {stats.best !== null && <span className="hidden sm:inline">Best {stats.best}/{stats.total}</span>}
        </span>
      </button>

      {open && (
        <div id="quiz-body" className={`px-3 pb-3 pt-1 border-t space-y-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex flex-wrap items-center gap-1.5 pt-2" role="tablist" aria-label="Questions">
            {deck.map((qq, i) => (
              <button
                key={qq.id}
                role="tab"
                aria-selected={i === current}
                aria-label={`Question ${i + 1}`}
                onClick={() => go(i)}
                className={`w-7 h-7 rounded border text-[11px] font-mono font-bold cursor-pointer ${dotTone(i)} ${
                  i === current ? 'ring-2 ring-blue-500 ring-offset-1 ' + (isDark ? 'ring-offset-slate-900' : 'ring-offset-white') : ''
                }`}
              >
                {i + 1}
              </button>
            ))}
            <span className={`ml-auto text-[10px] font-mono ${muted(isDark)}`}>
              {N} random questions from a pool of {pool.length}
            </span>
          </div>

          {finished && (
            <div className={`flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 ${
              isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="flex items-center gap-2 font-semibold text-sm">
                <Trophy className="w-4 h-4 text-amber-500" />
                Round complete: {score}/{N}
                <span className={`font-normal text-xs ${muted(isDark)}`}>
                  {score === N ? 'Perfect!' : score / N >= 0.8 ? 'Excellent grasp of the concepts.' : score / N >= 0.5 ? 'Good start. Review the explanations you missed.' : 'Keep exploring the simulator and try again.'}
                </span>
              </span>
              <span className={`w-full order-last font-mono text-[11px] ${muted(isDark)}`}>
                {byLevel.map((l) => `${DIFFICULTY_LABELS[l.d]} ${l.right}/${l.total}`).join('  ·  ')}
              </span>
              <button onClick={newRound} className={`${btn()} flex items-center gap-1.5`}>
                <RotateCcw className="w-3.5 h-3.5" /> New round
              </button>
            </div>
          )}

          <div>
            <div className={`flex items-center justify-between mb-1 text-[11px] font-mono ${muted(isDark)}`}>
              <span>Question {current + 1} of {N}</span>
              <span className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${DIFF_STYLE[q.difficulty][isDark ? 1 : 0]}`}>
                  {DIFFICULTY_LABELS[q.difficulty]}
                </span>
                <span className="uppercase tracking-wider">{q.concept}</span>
              </span>
            </div>
            <p className={`text-sm font-semibold leading-snug mb-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{q.prompt}</p>

            <div role="radiogroup" aria-label="Answer choices" className="space-y-1.5">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  role="radio"
                  aria-checked={checked ? i === answer : i === picked}
                  disabled={checked}
                  onClick={() => setPicked(i)}
                  className={`w-full flex items-start gap-2 text-left rounded border px-3 py-2 ${checked ? 'cursor-default' : 'cursor-pointer'} ${optionTone(i)}`}
                >
                  <span className="font-mono font-bold shrink-0 w-4">{String.fromCharCode(65 + i)}</span>
                  <span className="flex-1">{opt}</span>
                  {checked && i === q.correct && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                  {checked && i === answer && i !== q.correct && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                </button>
              ))}
            </div>

            {checked && (
              <div
                role="status"
                className={`mt-2 rounded border px-3 py-2 leading-relaxed ${
                  answer === q.correct
                    ? isDark ? 'bg-emerald-950/30 border-emerald-800' : 'bg-emerald-50 border-emerald-200'
                    : isDark ? 'bg-rose-950/30 border-rose-900' : 'bg-rose-50 border-rose-200'
                }`}
              >
                <div className="font-bold mb-0.5">
                  {answer === q.correct ? 'Correct!' : `Not quite. The correct answer is ${String.fromCharCode(65 + q.correct)}.`}
                </div>
                <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>{q.explanation}</p>
                {q.tryIt && (
                  <p className={`mt-1.5 flex items-start gap-1.5 ${muted(isDark)}`}>
                    <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                    <span><strong>Try it:</strong> {q.tryIt}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button onClick={() => go(current - 1)} disabled={current === 0} className={btn()}>← Previous</button>
            <div className="flex items-center gap-2">
              {!checked && <button onClick={check} disabled={picked === null} className={btn(true)}>Check answer</button>}
              {checked && current < N - 1 && <button onClick={() => go(current + 1)} className={btn(true)}>Next question →</button>}
              {checked && current === N - 1 && !finished && (
                <button onClick={() => go(answers.findIndex((a) => a === null))} className={btn(true)}>Go to unanswered</button>
              )}
              {!finished && (
                <button onClick={newRound} className={`${btn()} flex items-center gap-1.5`} title="Discard this round and draw a new random set">
                  <Shuffle className="w-3.5 h-3.5" /> New round
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
