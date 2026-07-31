/**
 * Every LinkedIn DOM assumption in the extension lives in this file.
 *
 * LinkedIn ships markup changes constantly and without notice, so nothing here
 * is treated as guaranteed. Each lookup is a list of candidates tried in order,
 * from the most specific and stable to a structural last resort. When the first
 * candidate stops matching the extension keeps working on the next one, and
 * {@link feedHealth} makes a total breakage visible instead of silent.
 */

/** Post containers, most-specific first. */
export const POST_CONTAINERS = [
  'div.feed-shared-update-v2[data-urn]',
  'div[data-urn^="urn:li:activity"]',
  'div[data-id^="urn:li:activity"]',
  'div.feed-shared-update-v2',
  'div.fie-impression-container',
];

/** The scrolling feed list, used as the MutationObserver root when present. */
export const FEED_ROOTS = [
  'main div.scaffold-finite-scroll__content',
  'div.scaffold-finite-scroll__content',
  'main[aria-label]',
  'main',
];

/** The post body text. */
export const POST_TEXT = [
  '.update-components-text .break-words',
  '.feed-shared-update-v2__description .update-components-text',
  '.update-components-text',
  '.feed-shared-inline-show-more-text',
  '.feed-shared-update-v2__description',
];

/** The author's display name. */
export const AUTHOR_NAME = [
  '.update-components-actor__title span[aria-hidden="true"]',
  '.update-components-actor__title',
  '.update-components-actor__name',
];

/** A link to the author's profile, used for a stable-ish author id. */
export const AUTHOR_LINK = [
  'a.update-components-actor__meta-link',
  '.update-components-actor__container a[href*="/in/"]',
  'a[href*="/in/"]',
  'a[href*="/company/"]',
];

/** Secondary actor line — carries "Promoted" and follower counts. */
export const AUTHOR_SUBTITLE = [
  '.update-components-actor__description',
  '.update-components-actor__sub-description',
];

/** Attached media (image, video, document, article card). */
export const MEDIA = [
  '.update-components-image',
  '.update-components-linkedin-video',
  '.update-components-article',
  '.update-components-document',
  '.feed-shared-image',
];

/** Header shown above reposts and "X commented on this" surfaces. */
export const REPOST_HEADER = [
  '.update-components-header',
  '.feed-shared-update-v2__update-content-wrapper .update-components-actor--with-control-menu',
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
 * the first that matches: LinkedIn renders some posts with a `data-urn` and
 * some without, and both are real posts. Nested matches are dropped so a
 * container inside another container is never scored twice.
 */
export function findPosts(root: ParentNode): Element[] {
  const matches = [...root.querySelectorAll(POST_CONTAINERS.join(','))];
  return matches.filter(
    (element) => !matches.some((other) => other !== element && other.contains(element)),
  );
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
