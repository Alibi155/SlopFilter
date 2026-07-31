import type { FeedbackEntry, ModelState, Signal } from './types';
import { featurize } from './tokenize';

/** Bumped when the feature encoding changes in a way that invalidates weights. */
export const MODEL_VERSION = 1;

const LEARNING_RATE = 0.12;
/** L2 penalty, applied only to features present in the current example. */
const L2 = 1e-4;

/**
 * Roughly how many gradient steps a full retrain should take, spread over
 * however many examples the log holds.
 *
 * What determines convergence for SGD is the total number of steps, not the
 * number of passes, so a small log gets many epochs and a large one gets few.
 * Keeping the product fixed means a retrain costs about the same whether the
 * user has corrected 50 posts or 2000 — which matters because it runs on the
 * main thread when they change a verdict they had already given.
 */
const RETRAIN_STEP_BUDGET = 6000;
const MIN_RETRAIN_EPOCHS = 3;
const MAX_RETRAIN_EPOCHS = 12;

/**
 * Cap on how many learned weights are kept.
 *
 * Every labelled post contributes a few hundred word and bigram features, and
 * real vocabulary keeps growing roughly with the square root of the text seen,
 * so without a cap the model would grow without bound. When the cap is passed,
 * the weights closest to zero are dropped: they are the ones carrying least
 * evidence, and any that mattered will be relearned the next time they appear.
 *
 * Rule features (`r:`) are never pruned. There are only a couple of dozen of
 * them and they encode the most valuable thing the model learns — which
 * built-in heuristics this particular user disagrees with.
 */
const MAX_MODEL_FEATURES = 20_000;

export function emptyModel(): ModelState {
  return { weights: {}, bias: 0, labelCount: 0, version: MODEL_VERSION };
}

function sigmoid(z: number): number {
  // Guarded against overflow at the tails.
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

/**
 * Build the feature vector for one post.
 *
 * Two families share the space: bag-of-words (`w:` / `b:`) from the post text,
 * and the rules that fired (`r:`). Including the rules lets the model learn
 * *which heuristics this user disagrees with* — the single most useful thing it
 * can learn — rather than only which words they dislike.
 */
export function buildFeatures(
  text: string,
  signals: readonly Signal[] | readonly string[],
): Record<string, number> {
  const features = featurize(text);
  for (const signal of signals) {
    features[`r:${typeof signal === 'string' ? signal : signal.id}`] = 1;
  }
  return features;
}

/** P(slop) for a feature vector. */
export function predict(model: ModelState, features: Record<string, number>): number {
  let z = model.bias;
  for (const [name, value] of Object.entries(features)) {
    const weight = model.weights[name];
    if (weight !== undefined) z += weight * value;
  }
  return sigmoid(z);
}

/**
 * One SGD step. Mutates and returns `model`.
 *
 * `countExample` is false during batch retraining, where `labelCount` is set
 * from the size of the feedback log instead of incremented per step.
 */
export function train(
  model: ModelState,
  features: Record<string, number>,
  label: 0 | 1,
  countExample = true,
): ModelState {
  const error = predict(model, features) - label;
  let added = 0;
  for (const [name, value] of Object.entries(features)) {
    const existing = model.weights[name];
    const current = existing ?? 0;
    const gradient = error * value + L2 * current;
    const next = current - LEARNING_RATE * gradient;
    // Drop weights that decay to noise, so storage does not grow without bound.
    if (Math.abs(next) < 1e-4) {
      delete model.weights[name];
    } else {
      if (existing === undefined) added += 1;
      model.weights[name] = next;
    }
  }
  model.bias -= LEARNING_RATE * error;
  if (countExample) model.labelCount += 1;

  // Counting keys is O(model), so it must not happen on every step — that cost
  // dwarfs the gradient update itself. Track new keys instead and only measure
  // once enough have accumulated to possibly matter.
  newFeaturesSinceCheck += added;
  if (newFeaturesSinceCheck >= PRUNE_CHECK_INTERVAL) {
    newFeaturesSinceCheck = 0;
    if (Object.keys(model.weights).length > MAX_MODEL_FEATURES) pruneWeights(model);
  }
  return model;
}

/** New keys seen since the last size check. See the note in {@link train}. */
let newFeaturesSinceCheck = 0;
const PRUNE_CHECK_INTERVAL = 2000;

/**
 * Drop the least-informative weights back down to the cap.
 *
 * Called only on the rare step that crosses {@link MAX_MODEL_FEATURES}, and
 * trims to 90% so it does not re-fire on the very next example.
 */
function pruneWeights(model: ModelState): void {
  const keep = Math.floor(MAX_MODEL_FEATURES * 0.9);
  const entries = Object.entries(model.weights);
  const rules = entries.filter(([name]) => name.startsWith('r:'));
  const rest = entries
    .filter(([name]) => !name.startsWith('r:'))
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, Math.max(0, keep - rules.length));
  model.weights = Object.fromEntries([...rules, ...rest]);
}

/**
 * Rebuild the model from the full feedback log.
 *
 * Used after a correction is retracted or the log is imported, where the
 * incremental path would leave stale weights behind. Examples are shuffled
 * deterministically per epoch so ordering does not bias the result.
 */
export function retrain(entries: FeedbackEntry[]): ModelState {
  const model = emptyModel();
  const ordered = [...entries].sort((a, b) => a.at - b.at);
  const epochs =
    ordered.length === 0
      ? 0
      : Math.min(
          MAX_RETRAIN_EPOCHS,
          Math.max(MIN_RETRAIN_EPOCHS, Math.round(RETRAIN_STEP_BUDGET / ordered.length)),
        );

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    for (let i = ordered.length - 1; i > 0; i -= 1) {
      // Deterministic shuffle: same log always yields the same model.
      const j = (i * 1103515245 + epoch * 12345) % (i + 1);
      const a = ordered[i];
      const b = ordered[j];
      if (a !== undefined && b !== undefined) {
        ordered[i] = b;
        ordered[j] = a;
      }
    }
    for (const entry of ordered) {
      train(model, buildFeatures(entry.text, entry.signals), entry.label, false);
    }
  }
  model.labelCount = entries.length;
  return model;
}
