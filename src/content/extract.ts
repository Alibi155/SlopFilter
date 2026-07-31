import type { PostFeatures } from '../engine/types';
import { extractHashtags, splitLines } from '../engine/tokenize';
import { AUTHOR_NAME, MEDIA, POST_TEXT, postKeyId, queryFirst } from './selectors';

/**
 * The trailing affordance LinkedIn appends to truncated posts. Usually lives in
 * a `<button>` that {@link readText} already skips, but the markup varies by
 * locale and rollout, so it is stripped defensively too.
 */
const SEE_MORE =
  /(?:…|\.\.\.)\s*(?:mehr anzeigen|mehr|see more|more|voir plus|ver más|さらに表示)\s*$/i;

/** Tags whose boundaries are paragraph breaks in the rendered post. */
const BLOCK_TAGS = new Set([
  'p',
  'div',
  'li',
  'ul',
  'ol',
  'section',
  'article',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
]);

/** Tags that are chrome rather than content — "…see more", scripts, icons. */
const SKIP_TAGS = new Set(['button', 'script', 'style', 'svg', 'noscript']);

/**
 * Read a post's text with its line structure intact.
 *
 * `textContent` is not usable here: LinkedIn separates paragraphs with `<br>`
 * elements, which `textContent` drops entirely, collapsing a post into a single
 * line. Half the rule catalogue reads line structure — emoji bullets, staccato
 * cadence — so losing the breaks silently disables those rules.
 *
 * `innerText` would preserve them but forces layout on every post, which is the
 * difference between an imperceptible scan and a janky feed. So we walk the
 * tree ourselves.
 */
export function readText(root: Element | null): string {
  if (!root) return '';
  const parts: string[] = [];

  const walk = (node: Node): void => {
    if (node.nodeType === 3 /* TEXT_NODE */) {
      // Whitespace inside a text node — including newlines and indentation in
      // the source markup — renders as a single space. Only <br> and block
      // boundaries are real line breaks, so every \n below is one we inserted.
      parts.push((node.nodeValue ?? '').replace(/\s+/g, ' '));
      return;
    }
    if (node.nodeType !== 1 /* ELEMENT_NODE */) return;

    const element = node as Element;
    const tag = element.tagName.toLowerCase();
    if (SKIP_TAGS.has(tag)) return;
    if (tag === 'br') {
      parts.push('\n');
      return;
    }

    const isBlock = BLOCK_TAGS.has(tag);
    if (isBlock) parts.push('\n');
    for (const child of element.childNodes) walk(child);
    if (isBlock) parts.push('\n');
  };

  walk(root);

  return (
    parts
      .join('')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      // Collapse runs of blank lines to one, matching how the post reads on screen.
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/** Plain text of an element, for short single-line fields like a name. */
function textOf(element: Element | null): string {
  if (!element) return '';
  return (element.textContent ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The post author's profile or company slug.
 *
 * The redesign has no author-specific class, and a post can link to several
 * profiles — "<some contact> and 74 others follow this page" sits above the
 * author's own name. The author is the one linked *most often* within the post
 * (avatar, name and control menu all point at them), which holds regardless of
 * markup or interface language.
 */
function authorIdFrom(element: Element): string {
  const counts = new Map<string, number>();
  for (const link of element.querySelectorAll('a[href]')) {
    const href = link.getAttribute('href') ?? '';
    const slug = /\/(?:in|company|school)\/([^/?#]+)/.exec(href)?.[1];
    if (slug === undefined) continue;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }

  let best = '';
  let bestCount = 0;
  for (const [slug, count] of counts) {
    if (count > bestCount) {
      best = slug;
      bestCount = count;
    }
  }
  return best;
}

/**
 * The author's display name.
 *
 * Legacy markup has a dedicated node. The redesign does not, but every post
 * carries `aria-label`s naming the author on the links pointing at their
 * profile. Only used for the chip's accessible label, so a miss is cosmetic.
 */
function authorNameFrom(element: Element, slug: string): string {
  const legacy = textOf(queryFirst(element, AUTHOR_NAME));
  if (legacy.length > 0) return legacy;

  if (slug.length > 0) {
    for (const node of element.querySelectorAll('a[aria-label]')) {
      if (!(node.getAttribute('href') ?? '').includes(slug)) continue;
      const label = (node.getAttribute('aria-label') ?? '').trim();
      if (label.length > 0) return label;
    }
  }
  // The slug is at least recognisable to the user.
  return slug.replace(/-/g, ' ');
}

/**
 * Stable identifier for a post.
 *
 * Prefers the id embedded in the redesign's `componentkey`, then the legacy
 * activity URN. When neither exists we hash the author and text, so a
 * correction still sticks to the right post across reloads.
 */
function identify(element: Element, authorId: string, text: string): string {
  const keyId = postKeyId(element);
  if (keyId !== null) return `sf:key:${keyId}`;

  const urn =
    element.getAttribute('data-urn') ??
    element.getAttribute('data-id') ??
    element.querySelector('[data-urn]')?.getAttribute('data-urn');
  if (urn !== null && urn !== undefined && urn.includes('urn:li:activity')) return urn;

  // FNV-1a: short, dependency-free, and collision-resistant enough for a key.
  let hash = 0x811c9dc5;
  const source = `${authorId} ${text}`;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `sf:hash:${hash.toString(36)}`;
}

/** Turn a post container into the pure feature record the engine consumes. */
export function extractPost(element: Element): PostFeatures {
  const raw = readText(queryFirst(element, POST_TEXT));
  const text = raw.replace(SEE_MORE, '').trim();
  const authorId = authorIdFrom(element);
  // Only the post header can say "promoted" or "reposted"; scanning the whole
  // post would trip on any body text that happens to use the word.
  const header = textOf(element).slice(0, 160);

  return {
    urn: identify(element, authorId, text),
    authorName: authorNameFrom(element, authorId),
    authorId,
    text,
    lines: splitLines(text),
    hashtags: extractHashtags(text),
    hasMedia: queryFirst(element, MEDIA) !== null,
    isRepost: /\breposted\b|\bgeteilt\b/i.test(header),
    isPromoted: /\bpromoted\b|\banzeige\b|\bsponsored\b|\bgesponsert\b/i.test(header),
  };
}

/**
 * Whether a post is worth scoring at all.
 *
 * Posts with almost no text (a bare image share, a "likes this" card) carry no
 * signal, and flagging them would only produce noise the user has to undo.
 */
export function isScorable(post: PostFeatures): boolean {
  return post.text.length >= 40;
}
