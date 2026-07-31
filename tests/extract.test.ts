import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { extractPost, isScorable, readText } from '../src/content/extract';
import { feedHealth, findFeedRoot, findPosts, postKeyId } from '../src/content/selectors';
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
  it('finds redesign and legacy posts alike, without double-counting', () => {
    // Posts 0-2 nest two identically-keyed divs; only the outer one is a post.
    expect(posts).toHaveLength(4);
  });

  it('finds the redesign feed root', () => {
    expect(findFeedRoot(document).getAttribute('data-testid')).toBe('mainFeed');
  });

  it('falls back to the body when nothing is recognisable', () => {
    document.body.innerHTML = '<div>nothing familiar</div>';
    expect(findFeedRoot(document)).toBe(document.body);
  });
});

describe('postKeyId', () => {
  it('extracts the stable id from a componentkey', () => {
    expect(postKeyId(posts[0]!)).toBe('cF7f8Soh-cB2SgNUpFjb');
  });

  it('returns null for legacy markup', () => {
    expect(postKeyId(posts[3]!)).toBeNull();
  });
});

describe('readText', () => {
  it('turns <br> into real line breaks', () => {
    document.body.innerHTML = '<div id="t">one<br>two<br><br>three</div>';
    expect(readText(document.getElementById('t'))).toBe('one\ntwo\n\nthree');
  });

  it('skips the "see more" button', () => {
    document.body.innerHTML = '<div id="t">body text<button>… mehr</button></div>';
    expect(readText(document.getElementById('t'))).toBe('body text');
  });

  it('treats block elements as paragraph breaks', () => {
    document.body.innerHTML = '<div id="t"><p>one</p><p>two</p></div>';
    expect(readText(document.getElementById('t'))).toBe('one\n\ntwo');
  });

  it('returns empty string for a missing element', () => {
    expect(readText(null)).toBe('');
  });
});

describe('extractPost', () => {
  it('reads text, author and hashtags from a redesign post', () => {
    const post = extractPost(posts[0]!);
    expect(post.urn).toBe('sf:key:cF7f8Soh-cB2SgNUpFjb');
    expect(post.authorId).toBe('example-growth');
    expect(post.hashtags).toEqual(['leadership', 'growth', 'startups']);
    expect(post.hasMedia).toBe(true);
  });

  it('preserves the line structure the rules depend on', () => {
    // The whole point of readText: textContent would yield a single line here,
    // silently disabling every line-based rule.
    const post = extractPost(posts[0]!);
    expect(post.lines.length).toBeGreaterThan(4);
    expect(post.lines.some((line) => line.startsWith('💡'))).toBe(true);
  });

  it('strips the trailing "… mehr" affordance', () => {
    const post = extractPost(posts[0]!);
    expect(post.text).not.toMatch(/mehr|see more/i);
    expect(post.text.trimEnd()).toMatch(/#startups$/);
  });

  it('picks the author over profiles merely mentioned in the header', () => {
    // "Johannes Example and 74 others follow this page" appears above the
    // actual author, so first-link-wins would get this wrong.
    const post = extractPost(posts[1]!);
    expect(post.authorId).toBe('example-corp');
    expect(post.isPromoted).toBe(true);
  });

  it('handles legacy markup, URN and all', () => {
    const post = extractPost(posts[3]!);
    expect(post.urn).toBe('urn:li:activity:7100000000000000004');
    expect(post.authorName).toBe('Jane Example');
    expect(post.authorId).toBe('jane-example-1234');
    expect(post.text).not.toMatch(/see more/i);
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
    expect(isScorable(extractPost(posts[2]!))).toBe(false);
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

  it('flags the legacy humblebrag', () => {
    const verdict = scorePost(extractPost(posts[3]!), emptyModel(), { threshold: 0.6 });
    expect(verdict.label).toBe('brag');
  });
});

describe('feedHealth', () => {
  it('counts what it can see', () => {
    expect(feedHealth(document).postsFound).toBe(4);
    document.body.innerHTML = '<div>redesigned beyond recognition</div>';
    expect(feedHealth(document).postsFound).toBe(0);
  });
});

describe('manifest permissions', () => {
  it('requests storage only, with host access scoped to the feed', () => {
    // The extension must never regain broad linkedin.com access: the content
    // script's match pattern is the whole of its reach, and the popup reads
    // health from storage rather than inspecting the active tab.
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/manifest.json'), 'utf8'),
    ) as {
      permissions: string[];
      host_permissions?: string[];
      content_scripts: { matches: string[] }[];
    };

    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.content_scripts[0]!.matches).toEqual(['https://www.linkedin.com/feed/*']);
  });
});
