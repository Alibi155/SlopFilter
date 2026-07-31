/**
 * Every LinkedIn DOM assumption in the extension lives in this file.
 *
 * LinkedIn ships markup changes constantly and without notice, so nothing here
 * is treated as guaranteed. Each lookup is a list of candidates tried in order,
 * from the most specific and stable to a structural last resort. When the first
 * candidate stops matching the extension keeps working on the next one, and
 * {@link feedHealth} makes a total breakage visible instead of silent.
 *
 * As of the 2026 redesign LinkedIn ships **hashed CSS class names** (`_4633da7f`)
 * and no `data-urn` attributes, so the old `.feed-shared-update-v2[data-urn]`
 * selectors match nothing. What survived the redesign, and what we key off now:
 *
 * - `componentkey`, a React-style key. Post containers carry one shaped
 *   `expanded<id>FeedType_MAIN_FEED_<SORT>`, which doubles as a stable post id.
 * - `data-testid`, used on a handful of semantic landmarks (`mainFeed`,
 *   `expandable-text-box`).
 *
 * The legacy selectors are kept behind the new ones: they cost nothing when
 * they match nothing, and they keep the extension working for anyone still on
 * an older rollout.
 */

/** Marks the componentkey of a feed post container. */
const FEED_TYPE_MARKER = 'FeedType_MAIN_FEED';

/**
 * Post containers, most-specific first.
 *
 * The `expanded` prefix matters: sibling components inside a post (the comment
 * tools, for one) carry the same `FeedType_MAIN_FEED` marker but are not posts.
 */
export const POST_CONTAINERS = [
  `div[componentkey^="expanded"][componentkey*="${FEED_TYPE_MARKER}"]`,
  // Legacy markup, pre-2026 redesign.
  'div.feed-shared-update-v2[data-urn]',
  'div[data-urn^="urn:li:activity"]',
  'div[data-id^="urn:li:activity"]',
  'div.feed-shared-update-v2',
];

/** The scrolling feed list, used as the MutationObserver root when present. */
export const FEED_ROOTS = [
  '[data-testid="mainFeed"]',
  'div[componentkey^="container-update-list"]',
  'main div.scaffold-finite-scroll__content',
  'div.scaffold-finite-scroll__content',
  'main',
];

/**
 * The post body text.
 *
 * `expandable-text-box` is the wrapper LinkedIn puts around post commentary
 * together with its "…mehr" / "…see more" button; it is present on every post,
 * including ones with no `translatable-commentary` key.
 */
export const POST_TEXT = [
  '[data-testid="expandable-text-box"]',
  'div[componentkey^="translatable-commentary"]',
  '.update-components-text .break-words',
  '.feed-shared-update-v2__description .update-components-text',
  '.update-components-text',
];

/** Author profile / company links, used to identify the poster. */
export const AUTHOR_LINK = [
  'a[href*="/in/"], a[href*="/company/"]',
  'a.update-components-actor__meta-link',
];

/** Legacy author name node. The redesign has no equivalent; see `extract.ts`. */
export const AUTHOR_NAME = [
  '.update-components-actor__title span[aria-hidden="true"]',
  '.update-components-actor__title',
  '.update-components-actor__name',
];

/** Attached media (image, video, document, article card). */
export const MEDIA = [
  'img[src*="media.licdn.com"]',
  'video',
  '.update-components-image',
  '.update-components-linkedin-video',
  '.update-components-article',
  '.update-components-document',
];

/** First matching element for any candidate selector. */
export function queryFirst(root: ParentNode, candidates: readonly string[]): Element | null {
  for (const selector of candidates) {
    const found = root.querySelector(selector);
    if (found) return found;
  }
  return null;
}

/** All elements matching the first candidate selector that matches anything. */
export function queryAll(root: ParentNode, candidates: readonly string[]): Element[] {
  for (const selector of candidates) {
    const found = root.querySelectorAll(selector);
    if (found.length > 0) return [...found];
  }
  return [];
}

/** The element the observer should watch, falling back to the document body. */
export function findFeedRoot(doc: Document = document): Element {
  return queryFirst(doc, FEED_ROOTS) ?? doc.body;
}

/**
 * All post containers currently in the DOM, in document order.
 *
 * Unlike {@link queryAll}, this takes the union of every candidate rather than
 * the first that matches, then drops any container nested inside another. Both
 * matter: LinkedIn renders some posts with a `data-urn` and some without, and
 * the redesign nests two identically-keyed divs per post, of which only the
 * outer one is the post.
 */
export function findPosts(root: ParentNode): Element[] {
  const matches = root.querySelectorAll(POST_CONTAINERS.join(','));
  const outermost: Element[] = [];

  // Single pass rather than a pairwise containment check. querySelectorAll
  // returns document order, so anything nested inside an accepted container
  // appears before that container's next sibling — comparing against the last
  // accepted element is enough, and keeps this O(n) instead of O(n²). On a feed
  // scrolled to 400 posts that is the difference between ~2ms and ~200ms per
  // scan, which is the difference between invisible and visible jank.
  for (const element of matches) {
    const last = outermost[outermost.length - 1];
    if (last !== undefined && last.contains(element)) continue;
    outermost.push(element);
  }
  return outermost;
}

/**
 * The stable per-post identifier embedded in a container's `componentkey`.
 *
 * `expanded<id>FeedType_MAIN_FEED_RELEVANCE` → `<id>`. Returns null on legacy
 * markup, where `extract.ts` falls back to the activity URN.
 */
export function postKeyId(element: Element): string | null {
  const key = element.getAttribute('componentkey');
  if (key === null || !key.includes(FEED_TYPE_MARKER)) return null;
  const id = key.slice(0, key.indexOf(FEED_TYPE_MARKER)).replace(/^expanded/, '');
  return id.length > 0 ? id : null;
}

export interface FeedHealth {
  onFeedPage: boolean;
  postsFound: number;
  /** True when we are on a feed page but recognise nothing — likely a DOM change. */
  selectorsBroken: boolean;
}

/** True for the URLs the content script is allowed to run on. */
export function isFeedPage(url: string = location.href): boolean {
  return /^https:\/\/www\.linkedin\.com\/feed(\/|$|\?)/.test(url);
}

/**
 * Report whether we can still recognise the page.
 *
 * Surfaced in the popup so a LinkedIn redesign shows up as "0 posts found"
 * rather than the extension appearing to work while quietly doing nothing.
 */
export function feedHealth(root: ParentNode = document): FeedHealth {
  const onFeedPage = isFeedPage();
  const postsFound = findPosts(root).length;
  return { onFeedPage, postsFound, selectorsBroken: onFeedPage && postsFound === 0 };
}
