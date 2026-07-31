import { ALPHA_FULL_AT, blendFactor } from '../engine/score';
import type { DisplayMode } from '../storage/schema';
import { getHealth, getModel, getSettings, getStats, setSettings } from '../storage/store';

/**
 * Popup: the controls worth reaching in one click. Anything that needs typing
 * or thinking lives on the options page instead.
 */

function need<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

const enabled = need<HTMLInputElement>('enabled');
const threshold = need<HTMLInputElement>('threshold');
const thresholdValue = need<HTMLOutputElement>('threshold-value');
const learning = need<HTMLParagraphElement>('learning');
const health = need<HTMLParagraphElement>('health');

function setThresholdLabel(percent: number): void {
  thresholdValue.textContent = `${percent}%`;
}

async function renderLearning(): Promise<void> {
  const model = await getModel();
  const alpha = blendFactor(model.labelCount);
  if (model.labelCount === 0) {
    learning.textContent =
      'Using built-in rules only. Correct a few posts and SlopFilter starts learning your taste.';
    return;
  }
  const remaining = Math.max(0, ALPHA_FULL_AT - model.labelCount);
  learning.textContent =
    `Learned from ${model.labelCount} correction${model.labelCount === 1 ? '' : 's'} · ` +
    `your model carries ${Math.round(alpha * 100)}% of each score` +
    (remaining > 0 ? ` · ${remaining} more to reach full weight.` : '.');
}

async function renderStats(): Promise<void> {
  const stats = await getStats();
  need('stat-scanned').textContent = String(stats.scanned);
  need('stat-flagged').textContent = String(stats.flagged);
  need('stat-corrections').textContent = String(stats.corrections);
}

/**
 * Report whether the filter can still see posts.
 *
 * Reported rather than hidden: if LinkedIn changes its markup, the honest
 * failure mode is telling the user the filter is blind, not looking idle.
 *
 * This reads what the content script last observed rather than inspecting the
 * active tab. Checking the tab's URL would require host access to linkedin.com
 * that the extension deliberately does not request, and the observation is the
 * better signal regardless — it reports what the selectors actually matched
 * instead of what a URL implies they should have.
 */
async function renderHealth(): Promise<void> {
  const { at, postsFound } = await getHealth();

  if (at === 0) {
    health.textContent = 'Open your LinkedIn feed to see SlopFilter at work.';
    health.hidden = false;
    return;
  }
  if (postsFound === 0) {
    health.textContent =
      'No posts recognised on the last scan. If this persists, LinkedIn may have changed its layout — please open an issue.';
    health.hidden = false;
  }
}

async function init(): Promise<void> {
  const settings = await getSettings();

  enabled.checked = settings.enabled;
  const percent = Math.round(settings.threshold * 100);
  threshold.value = String(percent);
  setThresholdLabel(percent);
  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="mode"]')) {
    radio.checked = radio.value === settings.mode;
    radio.addEventListener('change', () => {
      if (radio.checked) void setSettings({ mode: radio.value as DisplayMode });
    });
  }

  enabled.addEventListener('change', () => {
    void setSettings({ enabled: enabled.checked });
  });

  threshold.addEventListener('input', () => {
    setThresholdLabel(Number(threshold.value));
  });
  threshold.addEventListener('change', () => {
    void setSettings({ threshold: Number(threshold.value) / 100 });
  });

  need('open-options').addEventListener('click', () => {
    void chrome.runtime.openOptionsPage();
  });

  await Promise.all([renderStats(), renderLearning(), renderHealth()]);
}

void init();
