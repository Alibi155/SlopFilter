/**
 * Generates the Chrome Web Store screenshot pages.
 *
 * The feed chrome here is a mock, but everything the extension contributes is
 * real: the shipped `dist/content.css`, the real class names and state
 * attributes from `decorate.ts`, and badge text and reasons produced by
 * actually running the scoring engine over the fabricated posts. So the
 * screenshots cannot show a score or an explanation the extension would not
 * itself produce.
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POSTS } from './posts.mjs';
import { scorePost, badgeText } from '../../src/engine/score.ts';
import { emptyModel } from '../../src/engine/classifier.ts';
import { extractHashtags, splitLines } from '../../src/engine/tokenize.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, 'pages');
mkdirSync(out, { recursive: true });

const contentCss = readFileSync(resolve(here, '../../dist/content.css'), 'utf8');

// Headless Chrome reports prefers-color-scheme: dark, which would render the
// popup and options page in their dark theme inside a light mock browser frame.
// Neutering the query is contained to these screenshots and leaves the shipped
// stylesheet — dark theme included — untouched.
const uiCss = readFileSync(resolve(here, '../../src/popup/ui.css'), 'utf8').replace(
  /@media \(prefers-color-scheme: dark\)/g,
  '@media (prefers-color-scheme: dark) and (min-width: 99999px)',
);
const iconSvg = readFileSync(resolve(here, '../../public/icon.svg'), 'utf8');

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Score a fabricated post with the real engine. */
function judge(post) {
  const features = {
    urn: post.author,
    authorName: post.author,
    authorId: post.author,
    text: post.text,
    lines: splitLines(post.text),
    hashtags: extractHashtags(post.text),
    hasMedia: false,
    isRepost: false,
    isPromoted: false,
  };
  return scorePost(features, emptyModel(), { threshold: 0.6 });
}

const JUDGED = POSTS.map((post) => ({ ...post, verdict: judge(post) }));

/** Mock LinkedIn feed chrome. Deliberately generic — this is not their UI. */
const FEED_CSS = `
  *{box-sizing:border-box}
  body{margin:0;background:#f4f2ee;font-family:-apple-system,system-ui,'Segoe UI',Roboto,sans-serif;color:#1b1f23;-webkit-font-smoothing:antialiased}
  .page{width:1280px;height:800px;overflow:hidden;display:flex;flex-direction:column}
  .hdr{display:flex;align-items:center;gap:10px;padding:14px 28px;background:#fff;border-bottom:1px solid #e3e2df;flex:0 0 auto}
  .hdr .mark{width:26px;height:26px;border-radius:6px;overflow:hidden;display:grid;place-items:center}
  .hdr .mark svg{width:26px;height:26px}
  .hdr h1{margin:0;font-size:15px;font-weight:700;letter-spacing:-.01em}
  .hdr .sub{margin-left:auto;font-size:12px;color:#6b7785;font-weight:500}
  .body{flex:1;min-height:0;padding:18px 0 0}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:0;height:100%}
  .col{padding:0 24px;min-width:0;height:100%;overflow:hidden}
  .col + .col{border-left:1px solid #e0ded9}
  .caption{display:flex;align-items:center;gap:8px;margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:#6b7785}
  .caption .dot{width:8px;height:8px;border-radius:50%;background:#b8bfc7}
  .caption.on{color:#0a66c2}
  .caption.on .dot{background:#0a66c2}
  .feed{display:flex;flex-direction:column;gap:10px}
  .feed.narrow{max-width:560px;margin:0 auto}
  .card{background:#fff;border:1px solid #e3e2df;border-radius:10px;padding:12px 16px 14px}
  .actor{display:flex;align-items:center;gap:9px;margin-bottom:9px}
  .av{width:40px;height:40px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;color:#fff;font-weight:700;font-size:14px}
  .who{min-width:0}
  .nm{font-size:14px;font-weight:600;line-height:1.2}
  .ti{font-size:11.5px;color:#6b7785;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tm{font-size:11.5px;color:#6b7785}
  .txt{font-size:13.5px;line-height:1.45;white-space:pre-wrap;word-break:break-word}
  .acts{display:flex;gap:22px;margin-top:11px;padding-top:9px;border-top:1px solid #eeedea;font-size:12px;color:#6b7785;font-weight:600}
`;

function card(post, { decorated }) {
  const { verdict } = post;
  const flagged = decorated && verdict.label !== 'clean';
  const state = flagged ? 'flagged' : 'clean';
  const kind = verdict.label === 'brag' ? 'brag' : 'ai';
  const initials = post.author
    .split(' ')
    .map((w) => w[0])
    .join('');

  const chip = !decorated
    ? ''
    : flagged
      ? `<button class="sf-chip" data-sf-kind="${kind}">${esc(badgeText(verdict))}</button>`
      : `<button class="sf-chip sf-chip--quiet">Slop?</button>`;

  return `
  <div class="card"${decorated ? ` data-sf-state="${state}" data-sf-mode="dim"` : ''}>
      <div class="actor">
        <div class="av" style="background:${post.avatar}">${esc(initials)}</div>
        <div class="who">
          <div class="nm">${esc(post.author)}</div>
          <div class="ti">${esc(post.title)}</div>
          <div class="tm">${esc(post.time)} · 🌐</div>
        </div>
      </div>
      <div class="txt">${esc(post.text)}</div>
      <div class="acts"><span>👍 Like</span><span>💬 Comment</span><span>↻ Repost</span><span>➤ Send</span></div>
    ${chip}
  </div>`;
}

function page(title, css, bodyHtml) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>${contentCss}</style><style>${css}</style></head><body>${bodyHtml}</body></html>`;
}

function header(text, note) {
  return `<div class="hdr"><span class="mark">${iconSvg}</span><h1>SlopFilter for LinkedIn</h1><span class="sub">${esc(note)}</span></div>`;
}

/* ---------------------------------------------------------- 1: before/after */
const beforeAfter = page(
  'Before and after',
  FEED_CSS,
  `<div class="page">
    ${header('', 'Same feed, filter off and on')}
    <div class="body"><div class="cols">
      <div class="col">
        <p class="caption"><span class="dot"></span>Without SlopFilter</p>
        <div class="feed">${JUDGED.slice(0, 3)
          .map((p) => card(p, { decorated: false }))
          .join('')}</div>
      </div>
      <div class="col">
        <p class="caption on"><span class="dot"></span>With SlopFilter</p>
        <div class="feed">${JUDGED.slice(0, 3)
          .map((p) => card(p, { decorated: true }))
          .join('')}</div>
      </div>
    </div></div>
  </div>`,
);
writeFileSync(resolve(out, '1-before-after.html'), beforeAfter);

/* ------------------------------------------------------------- 2: in a feed */
const inFeed = page(
  'In your feed',
  FEED_CSS,
  `<div class="page">
    ${header('', 'Greyed out, never hidden — hover to read normally')}
    <div class="body"><div class="feed narrow">
      ${JUDGED.map((p) => card(p, { decorated: true })).join('')}
    </div></div>
  </div>`,
);
writeFileSync(resolve(out, '2-in-feed.html'), inFeed);

/* --------------------------------------------------------- 3: reasons panel */
const target = JUDGED[0];
const reasons = target.verdict.reasons
  .map(
    (r) =>
      `<li class="sf-panel__reason"><span class="sf-panel__reason-label">${esc(r.label)}</span><span class="sf-panel__evidence">“${esc(r.evidence)}”</span></li>`,
  )
  .join('');

const panel = page(
  'Why it was flagged',
  FEED_CSS +
    `.feed.narrow{max-width:600px}
     .sf-panel{position:absolute;top:38px;right:12px;width:330px}
     .card{position:relative}`,
  `<div class="page">
    ${header('', 'Every flag quotes the text that triggered it')}
    <div class="body"><div class="feed narrow">
      <div class="card" data-sf-state="flagged" data-sf-mode="dim">
          <div class="actor">
            <div class="av" style="background:${target.avatar}">MF</div>
            <div class="who"><div class="nm">${esc(target.author)}</div><div class="ti">${esc(target.title)}</div><div class="tm">${esc(target.time)} · 🌐</div></div>
          </div>
          <div class="txt">${esc(target.text)}</div>
          <div class="acts"><span>👍 Like</span><span>💬 Comment</span><span>↻ Repost</span><span>➤ Send</span></div>
        <button class="sf-chip" data-sf-kind="ai" aria-expanded="true">${esc(badgeText(target.verdict))}</button>
        <div class="sf-panel">
          <p class="sf-panel__title">Flagged as AI slop</p>
          <ul class="sf-panel__reasons">${reasons}</ul>
          <div class="sf-panel__actions">
            <button class="sf-btn">This was no slop</button>
            <button class="sf-btn">This is slop</button>
          </div>
          <p class="sf-panel__footer">Rules only · score ${Math.round(target.verdict.ruleScore * 100)}%. Your feedback starts training the model.</p>
        </div>
      </div>
      ${card(JUDGED[1], { decorated: true })}
    </div></div>
  </div>`,
);
writeFileSync(resolve(out, '3-reasons.html'), panel);

/* ------------------------------------------------------- 4 & 5: popup, options */
const readSrc = (p) => readFileSync(resolve(here, '../..', p), 'utf8');
const inner = (html) => html.slice(html.indexOf('<body'), html.lastIndexOf('</body>'));
const bodyOf = (html) => inner(html).replace(/^<body[^>]*>/, '');
const bodyClass = (html) => /<body class="([^"]*)"/.exec(html)?.[1] ?? '';

function chromePage(title, srcFile, caption, fill) {
  const src = readSrc(srcFile);
  let markup = bodyOf(src).replace(/<script[\s\S]*?<\/script>/g, '');
  for (const [find, replace] of fill) markup = markup.replace(find, replace);
  const isPopup = bodyClass(src).includes('popup');
  return page(
    title,
    FEED_CSS +
      uiCss +
      `body{background:#eceae5;color:#1b1f23}
       .stage{width:1280px;height:800px;display:flex;flex-direction:column;overflow:hidden}
       .hdr h1{color:#1b1f23}
       .frame{flex:1;display:grid;place-items:center;padding:10px 0 24px;min-height:0}
       .chrome{background:#fff;border-radius:12px;box-shadow:0 18px 50px rgb(0 0 0/16%);overflow:hidden;border:1px solid #d8d6d1}
       /* Zoomed so the UI is legible at the store's display size rather than a
          postage stamp adrift in 1280x800. */
       .chrome.popup{width:300px;zoom:1.75}
       .chrome.options{width:680px;zoom:.84}
       /* The options page is a full document; trim its page padding so the
          whole thing fits inside the frame instead of being cropped. */
       .chrome.options .sf-options{padding:20px 22px 22px}
       .chrome.options .sf-card{margin-bottom:14px}`,
    `<div class="stage">
      ${header('', caption)}
      <div class="frame">
        <div class="chrome ${isPopup ? 'popup' : 'options'}"><div class="${bodyClass(src)}">${markup}</div></div>
      </div>
    </div>`,
  );
}

writeFileSync(
  resolve(out, '4-popup.html'),
  chromePage('Popup', 'src/popup.html', 'One click: on/off, sensitivity, and what it has learned', [
    ['<input type="checkbox" id="enabled" />', '<input type="checkbox" id="enabled" checked />'],
    ['<output id="threshold-value">60%</output>', '<output id="threshold-value">60%</output>'],
    [
      '<input type="range" id="threshold" min="30" max="90" step="5" />',
      '<input type="range" id="threshold" min="30" max="90" step="5" value="60" />',
    ],
    ['value="dim" />', 'value="dim" checked />'],
    ['<strong id="stat-scanned">0</strong>', '<strong id="stat-scanned">1,284</strong>'],
    ['<strong id="stat-flagged">0</strong>', '<strong id="stat-flagged">237</strong>'],
    ['<strong id="stat-corrections">0</strong>', '<strong id="stat-corrections">41</strong>'],
    [
      '<p class="sf-learning" id="learning"></p>',
      '<p class="sf-learning" id="learning">Learned from 41 corrections · your model carries 29% of each score · 59 more to reach full weight.</p>',
    ],
    ['<p class="sf-health" id="health" hidden></p>', ''],
  ]),
);

const KEYWORDS = [
  ['thought leader', 'AI', '×2'],
  ['synergy', 'AI', '×1'],
  ['rockstar ninja', 'AI', '×1'],
  ['blessed to announce', 'Bragging', '×2'],
];
const keywordItems = KEYWORDS.map(
  ([term, cat, w]) =>
    `<li><span class="sf-term">${esc(term)}</span><span class="sf-tag">${cat}</span><span class="sf-tag">${w}</span><button type="button" class="sf-danger">Remove</button></li>`,
).join('');

writeFileSync(
  resolve(out, '5-options.html'),
  chromePage(
    'Options',
    'src/options.html',
    'Add your own keywords; export or reset what it learned',
    [
      [
        '<ul class="sf-keywords" id="keyword-list"></ul>',
        `<ul class="sf-keywords" id="keyword-list">${keywordItems}</ul>`,
      ],
      ['<p class="sf-empty" id="keyword-empty">No keywords yet.</p>', ''],
      [
        '<p id="learning-summary">Loading…</p>',
        '<p id="learning-summary">41 corrections recorded, 3,180 learned signals.</p>',
      ],
      [
        '<input type="checkbox" id="show-badge" />',
        '<input type="checkbox" id="show-badge" checked />',
      ],
      [
        '<input type="checkbox" id="show-flag" />',
        '<input type="checkbox" id="show-flag" checked />',
      ],
      ['<p class="sf-status" id="status"></p>', ''],
    ],
  ),
);

/* ------------------------------------------------------------- promo tile */
const promo = page(
  'Promo tile',
  `*{box-sizing:border-box}
   body{margin:0;font-family:-apple-system,system-ui,'Segoe UI',Roboto,sans-serif}
   .tile{width:440px;height:280px;background:linear-gradient(150deg,#0a66c2 0%,#0b4d92 100%);color:#fff;padding:26px 28px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;position:relative}
   .tile::after{content:'';position:absolute;right:-70px;bottom:-90px;width:240px;height:240px;border-radius:50%;background:rgba(255,255,255,.06)}
   .top{display:flex;align-items:center;gap:11px;position:relative;z-index:1}
   .top svg{width:38px;height:38px;border-radius:9px;display:block}
   .nm{font-size:19px;font-weight:800;letter-spacing:-.02em;line-height:1.15}
   .tag{font-size:12px;opacity:.82;font-weight:600}
   .mid{position:relative;z-index:1;display:flex;gap:9px;align-items:stretch}
   .mini{flex:1;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:9px 10px;font-size:9.5px;line-height:1.4}
   .mini.dim{opacity:.42}
   /* The badge is the thing being demonstrated, so it stays at full strength
      even though the post behind it is dimmed. */
   .mini.dim .pill{opacity:1}
   .mini.dim b,.mini.dim{color:#fff}
   .mini b{display:block;font-size:10px;margin-bottom:3px}
   .pill{display:inline-block;margin-top:6px;background:#fff;color:#0a66c2;border-radius:99px;padding:1px 7px;font-size:8.5px;font-weight:800}
   .btm{position:relative;z-index:1}
   .hl{font-size:17px;font-weight:800;letter-spacing:-.01em;margin:0 0 3px}
   .sm{font-size:11.5px;opacity:.85;margin:0;font-weight:500}`,
  `<div class="tile">
     <div class="top">${iconSvg}<div><div class="nm">SlopFilter</div><div class="tag">for LinkedIn</div></div></div>
     <div class="mid">
       <div class="mini dim"><b>🚀 3 lessons from scaling…</b>It's not about talent. It's about consistency. Agree?<span class="pill">Slop 95%</span></div>
       <div class="mini"><b>Priya Raman</b>We replaced our cron-based job runner with a durable execution engine.</div>
     </div>
     <div class="btm"><p class="hl">Grey out the slop. Keep the signal.</p><p class="sm">Runs 100% on your device · open source</p></div>
   </div>`,
);
writeFileSync(resolve(out, 'promo.html'), promo);

/* ---------------------------------------------------------- marquee promo */
/**
 * 1400x560 marquee tile, used for featured placement in the store.
 *
 * Same palette, wordmark and card treatment as the small tile, laid out
 * horizontally: the claim on the left, a miniature filtered feed on the right
 * so the promise is shown rather than only asserted. The background is fully
 * opaque, which is what makes Chrome emit a 24-bit PNG with no alpha channel —
 * a store requirement for this asset.
 */
const marqueeMini = (post, { dimmed }) => `
  <div class="mq-card${dimmed ? ' dim' : ''}">
    <div class="mq-actor">
      <span class="mq-av" style="background:${post.avatar}"></span>
      <span class="mq-nm">${esc(post.author)}</span>
      ${dimmed ? `<span class="mq-pill" data-kind="${post.verdict.label === 'brag' ? 'brag' : 'ai'}">${esc(badgeText(post.verdict))}</span>` : ''}
    </div>
    <div class="mq-txt">${esc(post.text.split('\n').filter(Boolean).slice(0, 2).join(' '))}</div>
  </div>`;

const marquee = page(
  'Marquee promo tile',
  `*{box-sizing:border-box}
   body{margin:0;font-family:-apple-system,system-ui,'Segoe UI',Roboto,sans-serif}
   .mq{width:1400px;height:560px;background:linear-gradient(135deg,#0a66c2 0%,#0b4d92 62%,#093f78 100%);color:#fff;display:flex;align-items:center;gap:56px;padding:0 68px;overflow:hidden;position:relative}
   .mq::after{content:'';position:absolute;right:-160px;bottom:-260px;width:620px;height:620px;border-radius:50%;background:rgba(255,255,255,.055)}
   .mq::before{content:'';position:absolute;left:-190px;top:-250px;width:460px;height:460px;border-radius:50%;background:rgba(255,255,255,.04)}
   .mq-left{position:relative;z-index:1;width:660px;flex:0 0 auto}
   .mq-brand{display:flex;align-items:center;gap:14px;margin-bottom:30px}
   .mq-brand svg{width:56px;height:56px;border-radius:13px;display:block}
   .mq-wm{font-size:26px;font-weight:800;letter-spacing:-.02em;line-height:1.1}
   .mq-wm span{display:block;font-size:14px;font-weight:600;opacity:.8;letter-spacing:0}
   .mq-hl{font-size:57px;font-weight:800;letter-spacing:-.026em;line-height:1.06;margin:0 0 20px}
   .mq-sub{font-size:19px;line-height:1.45;opacity:.9;margin:0 0 26px;font-weight:500;max-width:560px}
   .mq-meta{display:flex;gap:10px;flex-wrap:wrap}
   .mq-tag{border:1px solid rgba(255,255,255,.34);border-radius:99px;padding:6px 15px;font-size:13.5px;font-weight:700;letter-spacing:.01em}
   .mq-right{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;gap:12px}
   .mq-card{background:rgba(255,255,255,.135);border:1px solid rgba(255,255,255,.22);border-radius:12px;padding:14px 16px}
   .mq-card.dim{opacity:.44}
   .mq-actor{display:flex;align-items:center;gap:9px;margin-bottom:8px}
   .mq-av{width:24px;height:24px;border-radius:50%;flex:0 0 auto;display:block}
   .mq-nm{font-size:14px;font-weight:700}
   /* The badge demonstrates the product, so it keeps full strength even on a
      dimmed card — same reasoning as the small tile. */
   .mq-pill{margin-left:auto;background:#fff;color:#0a66c2;border-radius:99px;padding:3px 11px;font-size:11.5px;font-weight:800;opacity:1}
   .mq-pill[data-kind='brag']{color:#a8451a}
   .mq-txt{font-size:13px;line-height:1.5;opacity:.95}`,
  `<div class="mq">
     <div class="mq-left">
       <div class="mq-brand">${iconSvg}<div class="mq-wm">SlopFilter<span>for LinkedIn</span></div></div>
       <h1 class="mq-hl">Get rid of AI slop on LinkedIn</h1>
       <p class="mq-sub">Greyed out, never hidden — and it tells you exactly why. One click teaches it what you consider slop.</p>
       <div class="mq-meta">
         <span class="mq-tag">100% on your device</span>
         <span class="mq-tag">No account, no tracking</span>
         <span class="mq-tag">Open source</span>
       </div>
     </div>
     <div class="mq-right">
       ${marqueeMini(JUDGED[0], { dimmed: true })}
       ${marqueeMini(JUDGED[1], { dimmed: false })}
       ${marqueeMini(JUDGED[2], { dimmed: true })}
     </div>
   </div>`,
);
writeFileSync(resolve(out, 'marquee.html'), marquee);

console.log('scores used in the screenshots (real engine output):');
for (const p of JUDGED) {
  console.log(
    `  ${p.author.padEnd(16)} ${p.verdict.score.toFixed(2)} ${p.verdict.label.padEnd(5)} ${p.verdict.reasons.map((r) => r.id).join(',') || '—'}`,
  );
}
