import type { QuizQuestion } from './quizQuestions';

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(items: readonly T[], rnd: () => number = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Draw one quiz round: a random subset of `count` questions in random order, each with its four
 * options shuffled (the correct index is recomputed so the answer key stays right).
 */
export function drawDeck(pool: readonly QuizQuestion[], count: number, rnd: () => number = Math.random): QuizQuestion[] {
  return shuffle(pool, rnd)
    .slice(0, Math.min(count, pool.length))
    .map((q) => {
      const order = shuffle([0, 1, 2, 3], rnd);
      return {
        ...q,
        options: order.map((k) => q.options[k]) as QuizQuestion['options'],
        correct: order.indexOf(q.correct) as QuizQuestion['correct'],
      };
    });
}
