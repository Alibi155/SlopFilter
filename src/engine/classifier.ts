import type { FeedbackEntry, ModelState, Signal } from './types';
import { featurize } from './tokenize';

/** Bumped when the feature encoding changes in a way that invalidates weights. */
export const MODEL_VERSION = 1;

const LEARNING_RATE = 0.12;
/** L2 penalty, applied only to features present in the current example. */
const L2 = 1e-4;
/** Passes over the feedback log when retraining from scratch. */
const RETRAIN_EPOCHS = 12;

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
  for (const [name, value] of Object.entries(features)) {
    const current = model.weights[name] ?? 0;
    const gradient = error * value + L2 * current;
    const next = current - LEARNING_RATE * gradient;
    // Drop weights that decay to noise, so storage does not grow without bound.
    if (Math.abs(next) < 1e-4) delete model.weights[name];
    else model.weights[name] = next;
  }
  model.bias -= LEARNING_RATE * error;
  if (countExample) model.labelCount += 1;
  return model;
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
  for (let epoch = 0; epoch < RETRAIN_EPOCHS; epoch += 1) {
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
