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
  // A fresh <body> per test, not just fresh innerHTML. The content script
  // observes document.body, and jsdom keeps one window for the whole file, so
  // a previous test's observer would otherwise stay live and keep decorating
  // the DOM this test is asserting on.
  document.documentElement.replaceChild(document.createElement('body'), document.body);
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
    // The requirement is greyed out, not removed: the original text must
    // survive, and dimming is CSS on the post's own children rather than a
    // wrapper, so nothing of LinkedIn's is moved.
    expect(post.textContent).toContain('Three lessons from scaling');
    expect(post.querySelector('[data-testid="expandable-text-box"]')).not.toBeNull();
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
    // The log stores text + fired-rule ids, not the expanded feature vector:
    // ~6x smaller, and it survives a change to the feature encoding.
    const entry = (storage.feedback as { text: string; signals: string[] }[])[0]!;
    expect(entry.text).toContain('Three lessons from scaling');
    expect(entry.signals).toContain('emoji-bullets');
  });

  it('flags a post the user reports, and remembers it', async () => {
    await import('../src/content/index');
    await settle();

    const clean = findPosts(document)[1]!;
    // One click: the control says "Slop?", so clicking it is the answer.
    clean.querySelector<HTMLButtonElement>('.sf-chip--quiet')!.click();
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
    expect(document.querySelector('.sf-panel')).toBeNull();
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

describe('health reporting', () => {
  it('records what the selectors matched, so the popup needs no tab access', async () => {
    await import('../src/content/index');
    await settle();

    const health = storage.health as { at: number; postsFound: number };
    expect(health.postsFound).toBe(4);
    expect(health.at).toBeGreaterThan(0);
  });

  it('reports zero when the markup stops being recognisable', async () => {
    document.body.innerHTML = '<div>redesigned beyond recognition</div>';
    await import('../src/content/index');
    await settle();

    expect((storage.health as { postsFound: number }).postsFound).toBe(0);
  });
});

describe('surviving LinkedIn re-rendering a post', () => {
  it('does not reparent LinkedIn’s own nodes', async () => {
    // The feed is React. Moving nodes it created into a wrapper of ours breaks
    // its reconciler — it later calls removeChild on a parent that no longer
    // owns the node. Decoration must be purely additive.
    const post = findPosts(document)[0]!;
    const ownBefore = [...post.children];

    await import('../src/content/index');
    await settle();

    for (const child of ownBefore) {
      expect(child.parentElement, 'LinkedIn node was reparented').toBe(post);
    }
  });

  it('re-decorates a post whose contents React has replaced', async () => {
    await import('../src/content/index');
    await settle();

    const post = document.querySelector('[data-sf-state="flagged"]')!;
    expect(post.querySelector('.sf-chip')).not.toBeNull();

    // React re-renders the subtree, wiping out whatever we injected.
    post.querySelectorAll('.sf-chip, .sf-panel').forEach((n) => n.remove());
    post.removeAttribute('data-sf-state');
    // Any feed mutation then schedules the next scan.
    document
      .querySelector('[componentkey^="container-update-list"]')!
      .appendChild(document.createElement('div'));
    await settle();

    expect(post.querySelector('.sf-chip'), 'decoration never came back').not.toBeNull();
    expect(post.getAttribute('data-sf-state')).toBe('flagged');
  });
});

describe('feedback changes what the user sees, in one or two clicks', () => {
  it('greys out a clean post the user marks as slop, in a single click', async () => {
    await import('../src/content/index');
    await settle();

    const post = document.querySelector('[data-sf-state="clean"]')!;
    const chip = post.querySelector<HTMLButtonElement>('.sf-chip--quiet')!;
    expect(chip.textContent).toBe('Slop?');

    chip.click();
    await settle();

    // The whole point: the user's ruling has to win over the score, or marking
    // a post that scored clean does nothing visible at all.
    expect(post.getAttribute('data-sf-state'), 'post did not grey out').toBe('flagged');
    expect(post.querySelector('.sf-chip')!.textContent).toBe('Marked slop');
    expect(storage.overrides).toEqual({ 'sf:key:CdCldOhmY8myQA6G6rMb': 1 });
  });

  it('un-greys a flagged post and closes the panel on "This was no slop"', async () => {
    await import('../src/content/index');
    await settle();

    const post = document.querySelector('[data-sf-state="flagged"]')!;
    post.querySelector<HTMLButtonElement>('.sf-chip')!.click();
    expect(post.querySelector<HTMLElement>('.sf-panel')!.hidden).toBe(false);

    [...post.querySelectorAll<HTMLButtonElement>('.sf-panel .sf-btn')]
      .find((b) => b.textContent === 'This was no slop')!
      .click();
    await settle();

    expect(post.getAttribute('data-sf-state')).toBe('cleared');
    const panel = post.querySelector<HTMLElement>('.sf-panel');
    expect(panel === null || panel.hidden, 'panel stayed open').toBe(true);
  });

  it('closes the panel on "This is slop" and keeps the post greyed', async () => {
    await import('../src/content/index');
    await settle();

    const post = document.querySelector('[data-sf-state="flagged"]')!;
    post.querySelector<HTMLButtonElement>('.sf-chip')!.click();
    [...post.querySelectorAll<HTMLButtonElement>('.sf-panel .sf-btn')]
      .find((b) => b.textContent === 'This is slop')!
      .click();
    await settle();

    expect(post.getAttribute('data-sf-state')).toBe('flagged');
    const panel = post.querySelector<HTMLElement>('.sf-panel');
    expect(panel === null || panel.hidden, 'panel stayed open').toBe(true);
  });

  it('lets the user undo a mark, and keeps the panel open across unrelated re-renders', async () => {
    await import('../src/content/index');
    await settle();

    const post = document.querySelector('[data-sf-state="clean"]')!;
    post.querySelector<HTMLButtonElement>('.sf-chip--quiet')!.click();
    await settle();
    expect(post.getAttribute('data-sf-state')).toBe('flagged');

    // Now reversible through the panel, and an unrelated feed mutation must
    // not snap that panel shut while it is being read.
    post.querySelector<HTMLButtonElement>('.sf-chip')!.click();
    document
      .querySelector('[componentkey^="container-update-list"]')!
      .appendChild(document.createElement('div'));
    await settle();
    expect(post.querySelector<HTMLElement>('.sf-panel')!.hidden, 'panel snapped shut').toBe(false);

    [...post.querySelectorAll<HTMLButtonElement>('.sf-panel .sf-btn')]
      .find((b) => b.textContent === 'This was no slop')!
      .click();
    await settle();
    expect(post.getAttribute('data-sf-state')).toBe('cleared');
  });
});
