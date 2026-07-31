/** Which flavour of slop a signal or verdict points at. */
export type SlopCategory = 'ai' | 'brag';

/** A verdict label: a slop category, or `clean` when nothing crossed the line. */
export type VerdictLabel = SlopCategory | 'clean';

/**
 * Everything the engine is allowed to know about a post.
 *
 * Extraction produces this from the DOM; the engine never touches the DOM
 * itself, which is what keeps it unit-testable without a browser.
 */
export interface PostFeatures {
  /** LinkedIn activity URN, or a content hash when the URN is unavailable. */
  urn: string;
  authorName: string;
  /** Stable-ish author identifier (profile slug), when we can find one. */
  authorId: string;
  /** Post body with unicode-bold characters preserved (rules look for them). */
  text: string;
  /** Non-empty lines of `text`, trimmed. */
  lines: string[];
  /** Hashtags without the leading `#`, lowercased. */
  hashtags: string[];
  hasMedia: boolean;
  isRepost: boolean;
  isPromoted: boolean;
}

/** One heuristic that fired, with the text that made it fire. */
export interface Signal {
  id: string;
  category: SlopCategory;
  /** Contribution to the raw rule score. Always > 0. */
  weight: number;
  /** Human-readable explanation shown in the UI. */
  label: string;
  /** The matched text, quoted back to the user as proof. */
  evidence: string;
}

/** Result of scoring a single post. */
export interface Verdict {
  /** Final blended score in [0, 1]. Higher means more slop-like. */
  score: number;
  /** Rule-only score in [0, 1], kept for transparency in the UI. */
  ruleScore: number;
  /** Classifier probability in [0, 1], or null before the model has learned. */
  modelScore: number | null;
  /** How much weight the classifier carried in `score`, in [0, 0.7]. */
  alpha: number;
  label: VerdictLabel;
  /** Signals that fired, strongest first. */
  reasons: Signal[];
}

/** Persisted logistic-regression state. */
export interface ModelState {
  /** Feature name -> weight. Sparse; absent means zero. */
  weights: Record<string, number>;
  bias: number;
  /** Number of labelled examples seen. Drives the blend factor. */
  labelCount: number;
  /** Schema version, so a future format change can migrate rather than crash. */
  version: number;
}

/** A user correction, kept locally so the model can be retrained from scratch. */
export interface FeedbackEntry {
  urn: string;
  /** 1 = the user says this is slop, 0 = the user says it is not. */
  label: 0 | 1;
  /** Feature vector at the time of labelling, so retraining needs no re-scrape. */
  features: Record<string, number>;
  /** Epoch millis. */
  at: number;
}
