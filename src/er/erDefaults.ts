import { ER_BASE_DEFAULTS, ER_POP_DEFAULT_OVERRIDES, POP_COUNT } from '../config/appConfig';
import type { ErPop } from './erTypes';

export const makeDefaultErPops = (): ErPop[] =>
  Array.from({ length: POP_COUNT }, (_, i) => ({ ...ER_BASE_DEFAULTS, ...(ER_POP_DEFAULT_OVERRIDES[i] ?? {}) }));
