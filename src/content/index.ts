import './content.css';

import { buildFeatures } from '../engine/classifier';
import { scorePost } from '../engine/score';
import type { ModelState, PostFeatures, Verdict } from '../engine/types';
import { recordFeedback } from '../storage/feedback';
import type { Settings } from '../storage/schema';
import { bumpStats, getModel, getOverrides, getSettings, onChange } from '../storage/store';
import { decorate, undecorate, type FeedbackAction } from './decorate';
import { extractPost, isScorable } from './extract';
import { findFeedRoot, findPosts, isFeedPage } from './selectors';

/**
 * Content script entry point.
 *
 * Scoring runs synchronously on the main thread — it is pure string work and
 * costs well under a millisecond per post — but it is scheduled off the
 * critical path via requestIdleCallback so scrolling never waits on it.
 */

const PROCESSED_ATTR = 'data-sf-seen';
const IDLE_TIMEOUT_MS = 500;

interface Tracked {
  element: Element;
  post: PostFeatures;
  verdict: Verdict;
}

let settings: Settings;
let model: ModelState;
let overrides: Record<string, 0 | 1> = {};

/** Everything we have decorated this page-load, keyed by URN. */
const tracked = new Map<string, Tracked>();
let pending = false;

const idle: (callback: () => void) => void =
  typeof requestIdleCallback === 'function'
    ? (callback) => requestIdleCallback(() => callback(), { timeout: IDLE_TIMEOUT_MS })
    : (callback) => setTimeout(callback, 50);

function optionsFor(post: PostFeatures, verdict: Verdict) {
  return {
    mode: settings.mode,
    showBadge: settings.showBadge,
    showFlagAffordance: settings.showFlagAffordance,
    cleared: overrides[post.urn] === 0,
    onFeedback: (action: FeedbackAction) => handleFeedback(post, verdict, action),
  };
}

function render(entry: Tracked): void {
  decorate(entry.element, entry.post, entry.verdict, optionsFor(entry.post, entry.verdict));
}

/** Learn from a correction, then re-render every post with the updated model. */
async function handleFeedback(
  post: PostFeatures,
  verdict: Verdict,
  action: FeedbackAction,
): Promise<void> {
  const label: 0 | 1 = action === 'slop' ? 1 : 0;
  const features = buildFeatures(post.text, verdict.reasons);
  model = await recordFeedback(post.urn, features, label);
  overrides = { ...overrides, [post.urn]: label };
  rescoreAll();
}

/** Re-score and re-render everything we are tracking. */
function rescoreAll(): void {
  for (const entry of tracked.values()) {
    if (!entry.element.isConnected) {
      tracked.delete(entry.post.urn);
      continue;
    }
    entry.verdict = scorePost(entry.post, model, {
      threshold: settings.threshold,
      keywords: settings.keywords,
    });
    render(entry);
  }
}

/** Score and decorate any posts we have not seen yet. */
function scan(): void {
  if (!settings.enabled || !isFeedPage()) return;

  let scanned = 0;
  let flagged = 0;

  for (const element of findPosts(document)) {
    if (element.hasAttribute(PROCESSED_ATTR)) continue;

    const post = extractPost(element);
    if (!isScorable(post)) {
      // Mark it anyway so we do not re-extract the same unscorable card on
      // every mutation for the rest of the session.
      element.setAttribute(PROCESSED_ATTR, 'skip');
      continue;
    }

    const verdict = scorePost(post, model, {
      threshold: settings.threshold,
      keywords: settings.keywords,
    });

    element.setAttribute(PROCESSED_ATTR, post.urn);
    const entry: Tracked = { element, post, verdict };
    tracked.set(post.urn, entry);
    render(entry);

    scanned += 1;
    if (verdict.label !== 'clean' && overrides[post.urn] !== 0) flagged += 1;
  }

  if (scanned > 0) void bumpStats({ scanned, flagged });
}

function scheduleScan(): void {
  if (pending) return;
  pending = true;
  idle(() => {
    pending = false;
    scan();
  });
}

/** Strip all decoration — used when the user switches the extension off. */
function teardown(): void {
  for (const entry of tracked.values()) undecorate(entry.element);
  document
    .querySelectorAll(`[${PROCESSED_ATTR}]`)
    .forEach((node) => node.removeAttribute(PROCESSED_ATTR));
  tracked.clear();
}

async function start(): Promise<void> {
  [settings, model, overrides] = await Promise.all([getSettings(), getModel(), getOverrides()]);

  const observer = new MutationObserver(scheduleScan);
  observer.observe(findFeedRoot(), { childList: true, subtree: true });

  // LinkedIn is a single-page app: navigating to and from the feed does not
  // reload the script, so the URL has to be polled to catch re-entry.
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    tracked.clear();
    scheduleScan();
  }, 1000);

  onChange('settings', (next) => {
    const wasEnabled = settings.enabled;
    settings = next;
    if (!next.enabled) teardown();
    else if (!wasEnabled) scheduleScan();
    else rescoreAll();
  });

  onChange('model', (next) => {
    model = next;
    rescoreAll();
  });

  onChange('overrides', (next) => {
    overrides = next;
    rescoreAll();
  });

  scheduleScan();
}

void start();
