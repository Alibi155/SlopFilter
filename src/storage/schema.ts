import type { KeywordRule } from '../engine/rules';
import type { FeedbackEntry, ModelState } from '../engine/types';

/** How flagged posts are presented. Both keep the post reachable. */
export type DisplayMode = 'dim' | 'collapse';

export interface Settings {
  /** Master switch. When false the content script decorates nothing. */
  enabled: boolean;
  mode: DisplayMode;
  /** Score at or above which a post counts as slop, in [0, 1]. */
  threshold: number;
  /** User-defined keyword rules, merged into the built-in catalogue. */
  keywords: KeywordRule[];
  /** Show the "Slop 78% · AI-ish" chip on flagged posts. */
  showBadge: boolean;
  /** Show a subtle "flag as slop" control on posts that were not flagged. */
  showFlagAffordance: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  mode: 'dim',
  threshold: 0.6,
  keywords: [],
  showBadge: true,
  showFlagAffordance: true,
};

/** Rolling counters shown in the popup. Reset when the model is reset. */
export interface Stats {
  scanned: number;
  flagged: number;
  corrections: number;
}

export const DEFAULT_STATS: Stats = { scanned: 0, flagged: 0, corrections: 0 };

/**
 * What the content script saw the last time it ran.
 *
 * The popup cannot inspect the active tab — that would need host access it
 * deliberately does not have — so the content script reports its own state here
 * instead. This is the better signal anyway: it reflects what the selectors
 * actually matched rather than what the URL implies.
 */
export interface Health {
  /** Epoch millis of the last scan, or 0 if the content script never ran. */
  at: number;
  /** Post containers the selectors recognised. Zero here means DOM breakage. */
  postsFound: number;
}

export const DEFAULT_HEALTH: Health = { at: 0, postsFound: 0 };

/**
 * Cap on the stored feedback log.
 *
 * Bounded so `chrome.storage.local` cannot grow without limit; the oldest
 * corrections are dropped first. 2000 examples is far more than the blend
 * factor needs (it saturates at 100) and keeps a full retrain under ~100ms.
 */
export const MAX_FEEDBACK_ENTRIES = 2000;

export interface StorageShape {
  settings: Settings;
  model: ModelState;
  feedback: FeedbackEntry[];
  stats: Stats;
  /** Per-post user overrides, keyed by URN: 1 = slop, 0 = not slop. */
  overrides: Record<string, 0 | 1>;
  health: Health;
}

export type StorageKey = keyof StorageShape;
