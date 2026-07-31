import type { ModelState, PostFeatures, Verdict } from './types';
import { dominantCategory, ruleScore, runRules, type KeywordRule } from './rules';
import { buildFeatures, predict } from './classifier';

/** Ceiling on how much of the final score the classifier may ever carry. */
export const MAX_ALPHA = 0.7;
/** Corrections needed before the classifier reaches {@link MAX_ALPHA}. */
export const ALPHA_FULL_AT = 100;

/**
 * How much to trust the personal model, given how much it has been taught.
 *
 * Zero at cold start (pure heuristics), rising to 0.7. The rules always keep at
 * least 30% of the vote so a handful of unlucky corrections cannot invert the
 * filter's behaviour on posts unlike anything the user has labelled.
 */
export function blendFactor(labelCount: number): number {
  if (labelCount <= 0) return 0;
  return Math.min(MAX_ALPHA, (labelCount / ALPHA_FULL_AT) * MAX_ALPHA);
}

export interface ScoreOptions {
  keywords?: KeywordRule[];
  /** Score at or above which a post is treated as slop. */
  threshold: number;
}

/** Score a post: heuristics first, blended with whatever the model has learned. */
export function scorePost(post: PostFeatures, model: ModelState, options: ScoreOptions): Verdict {
  const reasons = runRules(post, options.keywords ?? []);
  const rules = ruleScore(reasons);

  const alpha = blendFactor(model.labelCount);
  const modelScore = alpha > 0 ? predict(model, buildFeatures(post.text, reasons)) : null;
  const score = modelScore === null ? rules : (1 - alpha) * rules + alpha * modelScore;

  return {
    score,
    ruleScore: rules,
    modelScore,
    alpha,
    label: score >= options.threshold ? dominantCategory(reasons) : 'clean',
    reasons,
  };
}

/** Human-readable badge text, e.g. `Slop 78% · AI-ish`. */
export function badgeText(verdict: Verdict): string {
  const percent = Math.round(verdict.score * 100);
  const kind = verdict.label === 'brag' ? 'Brag' : 'AI-ish';
  return `Slop ${percent}% · ${kind}`;
}
