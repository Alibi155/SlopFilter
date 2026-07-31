import { buildFeatures, retrain, train } from '../engine/classifier';
import type { FeedbackEntry, ModelState } from '../engine/types';
import { MAX_FEEDBACK_ENTRIES } from './schema';
import { bumpStats, getFeedback, getModel, setFeedback, setModel, setOverride } from './store';

/**
 * Record one user correction and learn from it.
 *
 * The common case is cheap: append to the log and take a single SGD step. A
 * full retrain only happens when the user changes their mind about a post they
 * already labelled, where the stale gradient would otherwise be baked in.
 */
export async function recordFeedback(
  urn: string,
  text: string,
  signals: string[],
  label: 0 | 1,
): Promise<ModelState> {
  const log = await getFeedback();
  const existing = log.findIndex((entry) => entry.urn === urn);
  const entry: FeedbackEntry = { urn, label, text, signals, at: Date.now() };

  let model: ModelState;
  if (existing >= 0) {
    log[existing] = entry;
    model = retrain(log);
  } else {
    log.push(entry);
    if (log.length > MAX_FEEDBACK_ENTRIES) log.splice(0, log.length - MAX_FEEDBACK_ENTRIES);
    model = train(await getModel(), buildFeatures(text, signals), label);
    // The log is capped, so keep the two in agreement rather than letting
    // labelCount drift above the number of examples we can actually replay.
    model.labelCount = log.length;
  }

  await Promise.all([
    setFeedback(log),
    setModel(model),
    setOverride(urn, label),
    bumpStats({ corrections: 1 }),
  ]);
  return model;
}

/** Rebuild the model from the stored log — used after import or a settings reset. */
export async function retrainFromLog(): Promise<ModelState> {
  const model = retrain(await getFeedback());
  await setModel(model);
  return model;
}

export interface ExportBundle {
  kind: 'slopfilter-model';
  version: 1;
  exportedAt: string;
  feedback: FeedbackEntry[];
  model: ModelState;
}

/** Serialize the learned state so the user can back it up or move machines. */
export async function exportLearning(): Promise<ExportBundle> {
  return {
    kind: 'slopfilter-model',
    version: 1,
    exportedAt: new Date().toISOString(),
    feedback: await getFeedback(),
    model: await getModel(),
  };
}

/**
 * Restore from an export bundle.
 *
 * The model is recomputed from the feedback log rather than trusted from the
 * file, so a hand-edited or corrupted bundle cannot install arbitrary weights.
 */
export async function importLearning(bundle: unknown): Promise<ModelState> {
  if (
    typeof bundle !== 'object' ||
    bundle === null ||
    (bundle as ExportBundle).kind !== 'slopfilter-model' ||
    !Array.isArray((bundle as ExportBundle).feedback)
  ) {
    throw new Error('Not a SlopFilter export file.');
  }
  const feedback = (bundle as ExportBundle).feedback.filter(
    (entry): entry is FeedbackEntry =>
      typeof entry?.urn === 'string' &&
      (entry.label === 0 || entry.label === 1) &&
      typeof entry.text === 'string' &&
      Array.isArray(entry.signals),
  );
  await setFeedback(feedback.slice(-MAX_FEEDBACK_ENTRIES));
  return retrainFromLog();
}
