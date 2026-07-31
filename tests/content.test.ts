/**
 * End-to-end test of the content script against a simulated feed.
 *
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://www.linkedin.com/feed/" }
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findPosts } from '../src/content/selectors';

const html = readFileSync(resolve(process.cwd(), 'tests/fixtures/feed-post.html'), 'utf8');

/** In-memory stand-in for chrome.storage.local, including change events. */
function installChromeStub(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const listeners: ((changes: Record<string, { newValue?: unknown }>, area: string) => void)[] = [];

  const stub = {
    storage: {
      local: {
        get: (key: string) =>
          Promise.resolve<Record<string, unknown>>(key in data ? { [key]: data[key] } : {}),
        set: (patch: Record<string, unknown>) => {
          Object.assign(data, patch);
          const changes = Object.fromEntries(
            Object.entries(patch).map(([k, v]) => [k, { newValue: v }]),
          );
          listeners.forEach((listener) => listener(changes, 'local'));
          return Promise.resolve();
        },
      },
      onChanged: {
        addListener: (fn: (typeof listeners)[number]) => listeners.push(fn),
        removeListener: (fn: (typeof listeners)[number]) => {
          const index = listeners.indexOf(fn);
          if (index >= 0) listeners.splice(index, 1);
        },
      },
    },
  };

  vi.stubGlobal('chrome', stub);
  return data;
}

/** Let the idle-scheduled scan and its awaited storage reads settle. */
async function settle(ms = 120): Promise<void> {
  await new Promise((done) => setTimeout(done, ms));
}

let storage: Record<string, unknown>;

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = html;
  storage = installChromeStub();
});

describe('content script on a feed page', () => {
  it('dims the slop post and leaves the job posting untouched', async () => {
    await import('../src/content/index');
    await settle();

    const posts = findPosts(document);
    expect(posts[0]!.getAttribute('data-sf-state')).toBe('flagged');
    expect(posts[1]!.getAttribute('data-sf-state')).toBe('clean');
  });

  it('keeps the flagged post in the DOM and readable', async () => {
    await import('../src/content/index');
    await settle();

    const post = document.querySelector('[data-sf-state="flagged"]')!;
    // The requirement is greyed out, not removed: the original text must survive.
    expect(post.textContent).toContain('Three lessons from scaling');
    expect(post.querySelector('.sf-dim-target')).not.toBeNull();
  });

  it('shows a chip whose panel explains the verdict', async () => {
    await import('../src/content/index');
    await settle();

    const post = document.querySelector('[data-sf-state="flagged"]')!;
    const chip = post.querySelector<HTMLButtonElement>('.sf-chip')!;
    expect(chip.textContent).toMatch(/^Slop \d+% · (AI-ish|Brag)$/);

    const panel = post.querySelector<HTMLElement>('.sf-panel')!;
    expect(panel.hidden).toBe(true);
    chip.click();
    expect(panel.hidden).toBe(false);
    expect(panel.textContent).toContain('Emoji-bulleted list');
  });

  it('un-dims the post and records feedback when the user says it is not slop', async () => {
    await import('../src/content/index');
    await settle();

    const post = document.querySelector('[data-sf-state="flagged"]')!;
    post.querySelector<HTMLButtonElement>('.sf-chip')!.click();
    const buttons = [...post.querySelectorAll<HTMLButtonElement>('.sf-panel .sf-btn')];
    buttons.find((button) => button.textContent === 'This was no slop')!.click();
    await settle();

    expect(post.getAttribute('data-sf-state')).toBe('cleared');
    expect(storage.overrides).toEqual({ 'sf:key:cF7f8Soh-cB2SgNUpFjb': 0 });
    expect((storage.model as { labelCount: number }).labelCount).toBe(1);
    expect((storage.feedback as unknown[]).length).toBe(1);
  });

  it('flags a post the user reports, and remembers it', async () => {
    await import('../src/content/index');
    await settle();

    const clean = findPosts(document)[1]!;
    clean.querySelector<HTMLButtonElement>('.sf-chip--quiet')!.click();
    const buttons = [...clean.querySelectorAll<HTMLButtonElement>('.sf-panel .sf-btn')];
    buttons.find((button) => button.textContent === 'This is slop')!.click();
    await settle();

    expect(storage.overrides).toEqual({ 'sf:key:CdCldOhmY8myQA6G6rMb': 1 });
    expect((storage.feedback as { label: number }[])[0]!.label).toBe(1);
  });

  it('skips posts with too little text to judge', async () => {
    await import('../src/content/index');
    await settle();

    const short = findPosts(document)[2]!;
    expect(short.getAttribute('data-sf-seen')).toBe('skip');
    expect(short.querySelector('.sf-chip')).toBeNull();
  });

  it('removes every trace of itself when switched off', async () => {
    await import('../src/content/index');
    await settle();
    expect(document.querySelector('.sf-chip')).not.toBeNull();

    await chrome.storage.local.set({
      settings: {
        enabled: false,
        mode: 'dim',
        threshold: 0.6,
        keywords: [],
        showBadge: true,
        showFlagAffordance: true,
      },
    });
    await settle();

    expect(document.querySelector('.sf-chip')).toBeNull();
    expect(document.querySelector('.sf-dim-target')).toBeNull();
    expect(document.querySelector('[data-sf-state]')).toBeNull();
    // LinkedIn's own markup is left exactly as it was found.
    expect(findPosts(document)[0]!.textContent).toContain('Three lessons from scaling');
  });

  it('scores newly appended posts as the feed grows', async () => {
    await import('../src/content/index');
    await settle();
    const before = document.querySelectorAll('[data-sf-state]').length;

    const added = document.createElement('div');
    added.setAttribute('componentkey', 'expandedNEWPOST9FeedType_MAIN_FEED_RELEVANCE');
    added.innerHTML =
      '<div data-testid="expandable-text-box">Humbled and honored to share that I have been named a Top Voice. Beyond grateful to everyone who supported me on this journey.</div>';
    document.querySelector('[componentkey^="container-update-list"]')!.appendChild(added);
    await settle();

    expect(document.querySelectorAll('[data-sf-state]').length).toBeGreaterThan(before);
    expect(added.getAttribute('data-sf-state')).toBe('flagged');
    expect(added.querySelector('.sf-chip')!.textContent).toContain('Brag');
  });
});
