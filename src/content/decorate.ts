import type { PostFeatures, Verdict } from '../engine/types';
import { badgeText } from '../engine/score';
import type { DisplayMode } from '../storage/schema';

/** What the user can tell us about a post from the panel. */
export type FeedbackAction = 'not-slop' | 'slop';

export interface DecorateOptions {
  mode: DisplayMode;
  showBadge: boolean;
  showFlagAffordance: boolean;
  /** True when the user has already ruled on this post. */
  cleared: boolean;
  onFeedback: (action: FeedbackAction) => void | Promise<void>;
}

const STATE_ATTR = 'data-sf-state';
const MODE_ATTR = 'data-sf-mode';

/** Marks the subtree that actually gets dimmed, so our own chip stays crisp. */
const DIM_CLASS = 'sf-dim-target';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  // textContent, never innerHTML: post text is untrusted input and must never
  // be parsed as markup.
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Wrap the post's own children so dimming applies to them but not to the
 * controls we add. Idempotent — repeated calls reuse the existing wrapper.
 */
function dimTarget(post: HTMLElement): HTMLElement {
  const existing = post.querySelector<HTMLElement>(`:scope > .${DIM_CLASS}`);
  if (existing) return existing;
  const wrapper = el('div', DIM_CLASS);
  while (post.firstChild) wrapper.appendChild(post.firstChild);
  post.appendChild(wrapper);
  return wrapper;
}

function buildPanel(verdict: Verdict, options: DecorateOptions): HTMLElement {
  const panel = el('div', 'sf-panel');
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Why SlopFilter flagged this post');

  panel.appendChild(
    el(
      'p',
      'sf-panel__title',
      verdict.label === 'clean'
        ? 'This post was not flagged'
        : `Flagged as ${verdict.label === 'brag' ? 'bragging slop' : 'AI slop'}`,
    ),
  );

  if (verdict.reasons.length > 0) {
    const list = el('ul', 'sf-panel__reasons');
    for (const reason of verdict.reasons) {
      const item = el('li', 'sf-panel__reason');
      item.appendChild(el('span', 'sf-panel__reason-label', reason.label));
      item.appendChild(el('span', 'sf-panel__evidence', `“${reason.evidence}”`));
      list.appendChild(item);
    }
    panel.appendChild(list);
  } else {
    panel.appendChild(el('p', 'sf-panel__empty', 'No slop signals matched this post.'));
  }

  const actions = el('div', 'sf-panel__actions');
  const notSlop = el('button', 'sf-btn', 'This was no slop');
  const isSlop = el('button', 'sf-btn', 'This is slop');
  notSlop.type = 'button';
  isSlop.type = 'button';
  actions.append(notSlop, isSlop);
  panel.appendChild(actions);

  const footer = el(
    'p',
    'sf-panel__footer',
    verdict.modelScore === null
      ? `Rules only · score ${(verdict.ruleScore * 100).toFixed(0)}%. Your feedback starts training the model.`
      : `Rules ${(verdict.ruleScore * 100).toFixed(0)}% · your model ${(verdict.modelScore * 100).toFixed(0)}% (weight ${(verdict.alpha * 100).toFixed(0)}%)`,
  );
  panel.appendChild(footer);

  const status = el('p', 'sf-panel__status');
  status.hidden = true;
  panel.appendChild(status);

  const submit = (action: FeedbackAction) => {
    void Promise.resolve(options.onFeedback(action)).then(() => {
      status.textContent =
        action === 'not-slop' ? 'Thanks — learning from that.' : 'Noted — learning from that.';
      status.hidden = false;
    });
  };
  notSlop.addEventListener('click', () => submit('not-slop'));
  isSlop.addEventListener('click', () => submit('slop'));

  return panel;
}

/**
 * Apply (or refresh) the extension's UI on a single post.
 *
 * Safe to call repeatedly for the same element: previous decoration is removed
 * first, so a settings change can simply re-run it across the feed.
 */
export function decorate(
  element: Element,
  post: PostFeatures,
  verdict: Verdict,
  options: DecorateOptions,
): void {
  const host = element as HTMLElement;
  undecorate(host, { keepWrapper: true });

  const flagged = verdict.label !== 'clean' && !options.cleared;
  host.setAttribute(STATE_ATTR, options.cleared ? 'cleared' : flagged ? 'flagged' : 'clean');
  host.setAttribute(MODE_ATTR, options.mode);
  dimTarget(host);

  const wantsChip = flagged ? options.showBadge : options.showFlagAffordance;
  if (!wantsChip) return;

  const chip = el(
    'button',
    flagged ? 'sf-chip' : 'sf-chip sf-chip--quiet',
    flagged ? badgeText(verdict) : 'Slop?',
  );
  chip.type = 'button';
  chip.dataset.sfKind = verdict.label === 'brag' ? 'brag' : 'ai';
  chip.setAttribute('aria-expanded', 'false');
  chip.setAttribute(
    'aria-label',
    flagged
      ? `${badgeText(verdict)} — from ${post.authorName || 'this author'}. Show why.`
      : 'Mark this post as slop',
  );

  const panel = buildPanel(verdict, options);

  chip.addEventListener('click', (event) => {
    event.stopPropagation();
    event.preventDefault();
    panel.hidden = !panel.hidden;
    chip.setAttribute('aria-expanded', String(!panel.hidden));
  });

  host.append(chip, panel);
}

/** Remove every trace of the extension from a post. */
export function undecorate(element: Element, options: { keepWrapper?: boolean } = {}): void {
  const host = element as HTMLElement;
  host.querySelectorAll(':scope > .sf-chip, :scope > .sf-panel').forEach((node) => node.remove());
  host.removeAttribute(STATE_ATTR);
  host.removeAttribute(MODE_ATTR);

  if (options.keepWrapper === true) return;
  // Unwrap so disabling the extension leaves LinkedIn's DOM exactly as found.
  const wrapper = host.querySelector<HTMLElement>(`:scope > .${DIM_CLASS}`);
  if (!wrapper) return;
  while (wrapper.firstChild) host.insertBefore(wrapper.firstChild, wrapper);
  wrapper.remove();
}
