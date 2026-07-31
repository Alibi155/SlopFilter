import type { PostFeatures, Verdict } from '../engine/types';
import { badgeText } from '../engine/score';
import type { DisplayMode } from '../storage/schema';

/** What the user can tell us about a post from the panel. */
export type FeedbackAction = 'not-slop' | 'slop';

export interface DecorateOptions {
  mode: DisplayMode;
  showBadge: boolean;
  showFlagAffordance: boolean;
  /**
   * The user's own ruling on this post, if they have given one.
   * 1 = they called it slop, 0 = they said it was not. Overrides the verdict
   * in both directions — a post the user marked stays greyed out even when the
   * score alone would not have flagged it.
   */
  override: 0 | 1 | undefined;
  onFeedback: (action: FeedbackAction) => void | Promise<void>;
}

const STATE_ATTR = 'data-sf-state';
const MODE_ATTR = 'data-sf-mode';

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
 * Whether our decoration is still present on a post.
 *
 * LinkedIn's feed is React, and re-rendering a post replaces its children —
 * taking our chip and panel with it. The container keeps its attributes, so the
 * only reliable evidence is whether the chip we appended is still there.
 */
export function decorationIntact(element: Element, chipExpected: boolean): boolean {
  if (!element.hasAttribute(STATE_ATTR)) return false;
  if (!chipExpected) return true;
  return element.querySelector(':scope > .sf-chip') !== null;
}

/**
 * Whether the panel is currently open.
 *
 * Re-scoring re-decorates the post, so an unrelated re-render would otherwise
 * snap a panel shut while the user is reading it. Giving feedback deliberately
 * closes it first, so that intent carries across too.
 */
function panelIsOpen(host: HTMLElement): boolean {
  const panel = host.querySelector<HTMLElement>(':scope > .sf-panel');
  return panel !== null && !panel.hidden;
}

function buildPanel(verdict: Verdict, options: DecorateOptions, title: string): HTMLElement {
  const panel = el('div', 'sf-panel');
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Why SlopFilter flagged this post');

  // LinkedIn puts its own click handlers on the post body. Without this, using
  // the panel can also open the post or trigger a re-render underneath us.
  panel.addEventListener('click', (event) => event.stopPropagation());

  panel.appendChild(el('p', 'sf-panel__title', title));

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

  const submit = (action: FeedbackAction) => {
    // Close immediately. The post greying out or un-greying is the confirmation
    // — a message inside a panel the user then has to dismiss made marking a
    // post a three-click job.
    panel.hidden = true;
    void Promise.resolve(options.onFeedback(action));
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
  // Read before undecorate: it is about to remove the panel we are reading.
  const wasOpen = panelIsOpen(host);
  undecorate(host);

  // The user's ruling wins over the score in both directions.
  const flagged = options.override === 1 || (options.override !== 0 && verdict.label !== 'clean');
  host.setAttribute(STATE_ATTR, options.override === 0 ? 'cleared' : flagged ? 'flagged' : 'clean');
  host.setAttribute(MODE_ATTR, options.mode);

  const wantsChip = flagged ? options.showBadge : options.showFlagAffordance;
  if (!wantsChip) return;

  // A post the user marked themselves has no meaningful score to report.
  const userMarked = options.override === 1 && verdict.label === 'clean';
  const label = flagged ? (userMarked ? 'Marked slop' : badgeText(verdict)) : 'Slop?';

  const chip = el('button', flagged ? 'sf-chip' : 'sf-chip sf-chip--quiet', label);
  chip.type = 'button';
  chip.dataset.sfKind = verdict.label === 'brag' ? 'brag' : 'ai';

  if (!flagged) {
    // One click, not three. The control says "Slop?" — clicking it is the
    // answer, so there is nothing to open and nothing to dismiss. Reversible
    // straight away: the post then carries a chip that opens the panel.
    chip.setAttribute('aria-label', 'Mark this post as slop');
    chip.addEventListener('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
      void Promise.resolve(options.onFeedback('slop'));
    });
    host.append(chip);
    return;
  }

  chip.setAttribute('aria-expanded', 'false');
  chip.setAttribute('aria-label', `${label} — from ${post.authorName || 'this author'}. Show why.`);

  const panel = buildPanel(
    verdict,
    options,
    userMarked
      ? 'You marked this as slop'
      : `Flagged as ${verdict.label === 'brag' ? 'bragging slop' : 'AI slop'}`,
  );
  if (wasOpen) {
    panel.hidden = false;
    chip.setAttribute('aria-expanded', 'true');
  }

  chip.addEventListener('click', (event) => {
    event.stopPropagation();
    event.preventDefault();
    panel.hidden = !panel.hidden;
    chip.setAttribute('aria-expanded', String(!panel.hidden));
  });

  host.append(chip, panel);
}

/**
 * Remove every trace of the extension from a post.
 *
 * Only ever removes nodes we added and attributes we set — LinkedIn's own DOM
 * is never touched, so switching the extension off leaves the page exactly as
 * it was found.
 */
export function undecorate(element: Element): void {
  const host = element as HTMLElement;
  host.querySelectorAll(':scope > .sf-chip, :scope > .sf-panel').forEach((node) => node.remove());
  host.removeAttribute(STATE_ATTR);
  host.removeAttribute(MODE_ATTR);
}
