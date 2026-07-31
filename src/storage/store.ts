import { emptyModel } from '../engine/classifier';
import type { ModelState } from '../engine/types';
import {
  DEFAULT_HEALTH,
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  type Health,
  type Settings,
  type Stats,
  type StorageShape,
} from './schema';
import type { FeedbackEntry } from '../engine/types';

/**
 * Typed wrapper over `chrome.storage.local`.
 *
 * The extension has no background worker, so the content script, popup and
 * options page each read and write here directly and stay in sync through
 * `onChange`. Every getter returns a fully-populated object, so callers never
 * deal with a missing key on first run.
 */

const DEFAULTS: StorageShape = {
  settings: DEFAULT_SETTINGS,
  model: emptyModel(),
  feedback: [],
  stats: DEFAULT_STATS,
  overrides: {},
  health: DEFAULT_HEALTH,
};

async function readKey<K extends keyof StorageShape>(key: K): Promise<StorageShape[K]> {
  const result = await chrome.storage.local.get(key);
  const value = result[key] as StorageShape[K] | undefined;
  return value ?? structuredClone(DEFAULTS[key]);
}

export async function getSettings(): Promise<Settings> {
  // Spread over the defaults so a setting added in a later version is populated
  // for users upgrading from an earlier one.
  return { ...DEFAULT_SETTINGS, ...(await readKey('settings')) };
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.local.set({ settings: next });
  return next;
}

export async function getModel(): Promise<ModelState> {
  return readKey('model');
}

export async function setModel(model: ModelState): Promise<void> {
  await chrome.storage.local.set({ model });
}

export async function getFeedback(): Promise<FeedbackEntry[]> {
  return readKey('feedback');
}

export async function setFeedback(feedback: FeedbackEntry[]): Promise<void> {
  await chrome.storage.local.set({ feedback });
}

export async function getOverrides(): Promise<Record<string, 0 | 1>> {
  return readKey('overrides');
}

export async function setOverride(urn: string, label: 0 | 1): Promise<void> {
  const overrides = await getOverrides();
  overrides[urn] = label;
  await chrome.storage.local.set({ overrides });
}

export async function getStats(): Promise<Stats> {
  return { ...DEFAULT_STATS, ...(await readKey('stats')) };
}

export async function bumpStats(patch: Partial<Stats>): Promise<void> {
  const current = await getStats();
  await chrome.storage.local.set({
    stats: {
      scanned: current.scanned + (patch.scanned ?? 0),
      flagged: current.flagged + (patch.flagged ?? 0),
      corrections: current.corrections + (patch.corrections ?? 0),
    },
  });
}

export async function getHealth(): Promise<Health> {
  return { ...DEFAULT_HEALTH, ...(await readKey('health')) };
}

export async function setHealth(health: Health): Promise<void> {
  await chrome.storage.local.set({ health });
}

/** Wipe the learned model, feedback log, overrides and stats. Settings survive. */
export async function resetLearning(): Promise<void> {
  await chrome.storage.local.set({
    model: emptyModel(),
    feedback: [],
    overrides: {},
    stats: DEFAULT_STATS,
  });
}

/** Subscribe to changes for one key. Returns an unsubscribe function. */
export function onChange<K extends keyof StorageShape>(
  key: K,
  handler: (value: StorageShape[K]) => void,
): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void => {
    if (areaName !== 'local') return;
    const change = changes[key];
    if (change === undefined) return;
    handler((change.newValue as StorageShape[K]) ?? structuredClone(DEFAULTS[key]));
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
