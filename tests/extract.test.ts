import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { extractPost, isScorable } from '../src/content/extract';
import { feedHealth, findFeedRoot, findPosts } from '../src/content/selectors';
import { scorePost } from '../src/engine/score';
import { emptyModel } from '../src/engine/classifier';

// Resolved from the project root: under jsdom, import.meta.url is an http URL.
const html = readFileSync(resolve(process.cwd(), 'tests/fixtures/feed-post.html'), 'utf8');

let posts: Element[];

beforeEach(() => {
  document.body.innerHTML = html;
  posts = findPosts(document);
});

describe('findPosts', () => {
  it('finds every post container in the fixture', () => {
    expect(posts).toHaveLength(4);
  });

  it('finds the scrolling feed root', () => {
    expect(findFeedRoot(document).className).toContain('scaffold-finite-scroll__content');
  });

  it('falls back to the body when the feed root is absent', () => {
    document.body.innerHTML = '<div>nothing familiar</div>';
    expect(findFeedRoot(document)).toBe(document.body);
  });
});

describe('extractPost', () => {
  it('reads text, author and hashtags from a slop post', () => {
    const post = extractPost(posts[0]!);
    expect(post.urn).toBe('urn:li:activity:7100000000000000001');
    expect(post.authorName).toBe('Jane Example');
    expect(post.authorId).toBe('jane-example-1234');
    expect(post.hashtags).toEqual(['leadership', 'growth', 'startups']);
    expect(post.hasMedia).toBe(true);
    expect(post.isPromoted).toBe(false);
  });

  it('strips the trailing "see more" affordance', () => {
    const post = extractPost(posts[0]!);
    expect(post.text).not.toMatch(/see more/i);
    expect(post.text.trimEnd()).toMatch(/#startups$/);
  });

  it('detects reposts and promoted posts', () => {
    const post = extractPost(posts[1]!);
    expect(post.isRepost).toBe(true);
    expect(post.isPromoted).toBe(true);
    expect(post.authorId).toBe('acme-corp');
  });

  it('falls back to a content hash when there is no URN', () => {
    const post = extractPost(posts[2]!);
    expect(post.urn).toMatch(/^sf:hash:[a-z0-9]+$/);
  });

  it('gives the same hash for the same content and a different one otherwise', () => {
    const again = extractPost(posts[2]!);
    expect(again.urn).toBe(extractPost(posts[2]!).urn);
    expect(again.urn).not.toBe(extractPost(posts[0]!).urn);
  });

  it('never throws on markup it does not recognise', () => {
    document.body.innerHTML = '<div class="feed-shared-update-v2"></div>';
    const post = extractPost(findPosts(document)[0]!);
    expect(post.text).toBe('');
    expect(isScorable(post)).toBe(false);
  });
});

describe('isScorable', () => {
  it('skips posts with too little text to judge', () => {
    expect(isScorable(extractPost(posts[3]!))).toBe(false);
    expect(isScorable(extractPost(posts[0]!))).toBe(true);
  });
});

describe('end to end: DOM to verdict', () => {
  it('flags the slop post and leaves the job posting alone', () => {
    const slop = scorePost(extractPost(posts[0]!), emptyModel(), { threshold: 0.6 });
    const job = scorePost(extractPost(posts[1]!), emptyModel(), { threshold: 0.6 });
    expect(slop.label).toBe('ai');
    expect(slop.reasons.map((r) => r.id)).toEqual(
      expect.arrayContaining(['emoji-bullets', 'antithesis-template', 'engagement-bait']),
    );
    expect(job.label).toBe('clean');
  });
});

describe('feedHealth', () => {
  it('reports a broken selector set on a feed page with no recognisable posts', () => {
    // jsdom's default URL is not a feed page, so health reports "not on feed".
    expect(feedHealth(document).onFeedPage).toBe(false);
    document.body.innerHTML = '<div>redesigned beyond recognition</div>';
    expect(feedHealth(document).postsFound).toBe(0);
  });
});
