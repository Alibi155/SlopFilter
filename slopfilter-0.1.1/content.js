(function () {
  'use strict';
  const le = /[\u{1D400}-\u{1D7FF}\u{FF21}-\u{FF3A}\u{FF41}-\u{FF5A}]/u;
  function ce(e) {
    return le.test(e);
  }
  function w(e) {
    return e
      .normalize('NFKC')
      .replace(
        /\r\n?/g,
        `
`,
      )
      .replace(/[ \t]+/g, ' ');
  }
  function N(e) {
    return w(e).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  }
  function ue(e) {
    return w(e)
      .split(
        `
`,
      )
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }
  function de(e) {
    return w(e)
      .split(/(?<=[.!?…])\s+|\n+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }
  function F(e) {
    const t = w(e).match(/[\p{L}\p{N}'-]+/gu);
    return t ? t.length : 0;
  }
  function he(e) {
    return N(e).match(/[\p{L}\p{N}']+/gu) ?? [];
  }
  function ge(e) {
    const t = he(e),
      n = {};
    for (let r = 0; r < t.length; r += 1) {
      const o = t[r];
      if (o === void 0 || o.length < 2) continue;
      n[`w:${o}`] = 1;
      const s = t[r + 1];
      s !== void 0 && (n[`b:${o} ${s}`] = 1);
    }
    return n;
  }
  function fe(e) {
    const t = w(e).match(/#[\p{L}\p{N}_]{2,}/gu) ?? [];
    return [...new Set(t.map((n) => n.slice(1).toLowerCase()))];
  }
  function be(e) {
    if (e.length < 2) return 0;
    const t = e.reduce((r, o) => r + o, 0) / e.length,
      n = e.reduce((r, o) => r + (o - t) ** 2, 0) / e.length;
    return Math.sqrt(n);
  }
  const E = 40,
    $ = 70;
  function u(e) {
    const t = e.replace(/\s+/g, ' ').trim();
    return t.length <= $ ? t : `${t.slice(0, $ - 1)}…`;
  }
  function T(e, t) {
    for (const n of t) {
      const r = n.exec(e);
      if (r) return r[0];
    }
    return null;
  }
  function b(e, t) {
    return t.filter((n) => e.includes(n));
  }
  const D = [
      "here's the thing",
      'unpopular opinion',
      'let that sink in',
      'read that again',
      'let me be blunt',
      'let me be clear',
      "i'll say it louder",
      'say it louder for the people',
      'plot twist',
      'hot take',
      "let's be honest",
      "here's what nobody tells you",
      'nobody talks about this',
      'this changes everything',
      'yesterday i learned',
      'i was wrong',
      "here's why that matters",
      'stop scrolling',
      "here's what the research says",
      "here's what the data says",
      "here's what i found",
      "here's what happened",
      'the numbers say',
      'the numbers speak',
      'let me explain',
      'buckle up',
      'unpopuläre meinung',
      'lass das mal sacken',
      'lies das nochmal',
      'mal ehrlich',
      'ganz ehrlich:',
      'die wahrheit ist',
      'niemand redet darüber',
      'niemand spricht darüber',
      'hör auf zu scrollen',
      'kleiner reminder',
      'merk dir das',
      'das ändert alles',
      'unbeliebte meinung',
    ],
    P = [
      'agree?',
      'thoughts?',
      'what would you add',
      'what do you think?',
      'am i wrong',
      'repost if',
      'follow me for more',
      'follow for more',
      'tag someone who',
      'who else',
      'save this post',
      'save this for later',
      'drop a 🙌',
      "and i'll send you",
      "and i'll dm you",
      'comment below',
      'let me know in the comments',
      '♻️',
      'was denkst du?',
      'wie siehst du das',
      'siehst du das auch so',
      'stimmst du zu',
      'was fehlt in der liste',
      'schreib es in die kommentare',
      'schreibt es in die kommentare',
      'kommentiere mit',
      'teile diesen beitrag',
      'folge mir für mehr',
      'folgt mir für mehr',
      'markiere jemanden',
      'speichere diesen beitrag',
      'link in den kommentaren',
      'link in die kommentare',
    ],
    j = [
      'delve',
      'tapestry',
      'testament to',
      'navigate the landscape',
      'navigate the complex',
      'game-changer',
      'game changer',
      "in today's fast-paced",
      'ever-evolving',
      'ever evolving',
      'at the end of the day',
      "it's worth noting",
      'unlock the power',
      'harness the power',
      'deep dive',
      'key takeaways',
      'in conclusion',
      'paradigm shift',
      'cutting-edge',
      'revolutionize',
      'transformative',
      'holistic approach',
      'seamless integration',
      'robust solution',
      'elevate your',
      'the future of work',
      'moving forward',
      'leveraging',
      'furthermore',
      'moreover',
      'in der heutigen schnelllebigen',
      'im digitalen zeitalter',
      'ganzheitlicher ansatz',
      'nahtlose integration',
      'bahnbrechend',
      'wegweisend',
      'revolutionieren',
      'es ist wichtig zu beachten',
      'zusammenfassend lässt sich',
      'darüber hinaus',
      'des weiteren',
      'die zukunft der arbeit',
      'spannende reise',
      'auf ein neues level',
      'ein echter gamechanger',
    ],
    H = [
      'humbled and honored',
      'humbled and honoured',
      'beyond grateful',
      'dream come true',
      "i don't usually post",
      'i rarely post',
      'i normally keep this private',
      'not bragging',
      "words can't describe",
      'grateful is an understatement',
      'still processing this',
      'little did i know',
      'blessed and grateful',
      'none of this would have been possible',
      'onwards and upwards',
      'the best is yet to come',
      'over the moon',
      'this one is for my',
      'demütig und dankbar',
      'unglaublich dankbar',
      'überwältigt von',
      'ein traum wird wahr',
      'ein traum geht in erfüllung',
      'ich poste sonst nie',
      'ich schreibe sonst nie',
      'worte können nicht beschreiben',
      'das hätte ich nie gedacht',
      'wer hätte das gedacht',
      'das beste kommt noch',
      'stolz wie oskar',
    ],
    me = [
      'the lesson',
      "here's what i learned",
      'what i learned',
      'the takeaway',
      'moral of the story',
      'what this taught me',
      'never forget',
      'remember this',
      'die lektion',
      'was ich gelernt habe',
      'was ich daraus gelernt habe',
      'das fazit',
      'moral von der geschicht',
      'was mir das gezeigt hat',
      'vergiss das nie',
    ],
    pe = [
      'that is why we built',
      "that's why we built",
      'this is why we built',
      'that is why we created',
      "that's why we created",
      'which is why we built',
      'so we built',
      'we are raising',
      "we're raising",
      'deshalb haben wir',
      'darum haben wir',
      'genau deshalb haben wir',
      'aus diesem grund haben wir',
      'deswegen haben wir',
    ],
    we = [
      'learn more and',
      'book a call',
      'book a demo',
      'dm me',
      'send me a dm',
      'sign up here',
      'get early access',
      'join the waitlist',
      'check out our',
      'come see what we',
      "see what we're building",
      'see what we are building',
      'get in early',
      'early backers',
      'bonus shares',
      'mehr erfahren',
      'jetzt anmelden',
      'buche ein gespräch',
      'buch dir einen termin',
      'schreib mir eine nachricht',
      'melde dich bei mir',
      'sichere dir',
      'jetzt kostenlos',
    ],
    q = new Set([
      'leadership',
      'innovation',
      'motivation',
      'mindset',
      'success',
      'growth',
      'ai',
      'productivity',
      'hiring',
      'networking',
      'inspiration',
      'entrepreneurship',
      'futureofwork',
      'personalbranding',
      'career',
      'business',
    ]),
    ye = [
      {
        id: 'unicode-bold',
        category: 'ai',
        label: 'Fake bold text (unicode lookalike characters)',
        weight: 1.5,
        test: (e) => {
          if (!ce(e.raw)) return null;
          const t =
            /[\u{1D400}-\u{1D7FF}\u{FF21}-\u{FF5A}]+(?:\s[\u{1D400}-\u{1D7FF}\u{FF21}-\u{FF5A}]+)*/u.exec(
              e.raw,
            );
          return u(t ? t[0] : 'styled unicode characters');
        },
      },
      {
        id: 'emoji-bullets',
        category: 'ai',
        label: 'Emoji-bulleted list',
        weight: 0.9,
        test: (e) => {
          const t = e.lines.filter((n) => new RegExp('^\\p{Extended_Pictographic}', 'u').test(n));
          return t.length < 3 ? null : u(t.slice(0, 2).join(' / '));
        },
      },
      {
        id: 'staccato-cadence',
        category: 'ai',
        label: 'One-line-per-thought cadence',
        weight: 0.8,
        test: (e) => {
          if (e.wordCount < E || e.lines.length < 5) return null;
          const t = e.lines.filter((n) => F(n) <= 12);
          return t.length / e.lines.length < 0.65 ? null : u(t.slice(0, 3).join(' ⏎ '));
        },
      },
      {
        id: 'antithesis-template',
        category: 'ai',
        label: `"It's not X. It's Y." construction`,
        weight: 1,
        test: (e) =>
          T(e.lower, [
            /\bit'?s not (?:about )?[^.!?\n]{2,45}[.!?\n]\s*it'?s\b[^.!?\n]{0,45}/,
            /\b(?:isn'?t|aren'?t|wasn'?t|weren'?t|is not|are not|was not|were not) (?:just )?(?:about )?[^.!?\n]{2,45}[.!?\n—-]\s*(?:it'?s|they'?re|it is|they are)\b[^.!?\n]{0,45}/,
            /\bnot (?:just )?[a-z][^.!?\n]{2,35}\.\s*[a-z]{0,10}\s*but\b[^.!?\n]{0,45}/,
            /\bes geht nicht um\b[^.!?\n]{2,45}[.!?\n]\s*es geht um\b[^.!?\n]{0,45}/,
            /\bdas ist kein[a-z]{0,2}\b[^.!?\n]{2,45}[.!?\n]\s*das ist\b[^.!?\n]{0,45}/,
            /\bnicht (?:das|der|die)\b[^.!?\n]{2,40}[.!?\n—-]\s*sondern\b[^.!?\n]{0,45}/,
          ])?.trim() ?? null,
      },
      {
        id: 'formulaic-opener',
        category: 'ai',
        label: 'Formulaic hook phrase',
        weight: 0.7,
        test: (e) => {
          const t = b(e.lower, D);
          return t.length > 0 ? u(t.join(', ')) : null;
        },
        scale: (e) => Math.min(2, b(e.lower, D).length),
      },
      {
        id: 'engagement-bait',
        category: 'ai',
        label: 'Engagement bait',
        weight: 0.8,
        test: (e) => {
          const t = b(e.lower, P);
          return t.length > 0 ? u(t.join(', ')) : null;
        },
        scale: (e) => Math.min(2, b(e.lower, P).length),
      },
      {
        id: 'llm-vocabulary',
        category: 'ai',
        label: 'LLM-flavoured vocabulary',
        weight: 0.35,
        test: (e) => {
          const t = b(e.lower, j);
          return t.length > 0 ? u(t.join(', ')) : null;
        },
        scale: (e) => Math.min(6, b(e.lower, j).length),
      },
      {
        id: 'em-dash-density',
        category: 'ai',
        label: 'Heavy em-dash use',
        weight: 0.7,
        test: (e) => {
          if (e.wordCount < E) return null;
          const t = (e.text.match(/—/g) ?? []).length;
          return t < 2 || (t / e.wordCount) * 100 < 1.5
            ? null
            : `${t} em-dashes in ${e.wordCount} words`;
        },
      },
      {
        id: 'uniform-sentence-length',
        category: 'ai',
        label: 'Unnaturally even sentence lengths',
        weight: 0.5,
        test: (e) => {
          if (e.sentences.length < 6) return null;
          const t = e.sentences.map(F),
            n = t.reduce((o, s) => o + s, 0) / t.length;
          if (n < 5 || n > 18) return null;
          const r = be(t);
          return r > 3
            ? null
            : `${e.sentences.length} sentences averaging ${n.toFixed(1)} words (σ ${r.toFixed(1)})`;
        },
      },
      {
        id: 'hashtag-stuffing',
        category: 'ai',
        label: 'Hashtag stuffing',
        weight: 0.6,
        test: (e) => {
          const t = e.hashtags.filter((n) => q.has(n));
          return e.hashtags.length <= 5 && t.length < 3
            ? null
            : u(e.hashtags.map((n) => `#${n}`).join(' '));
        },
        scale: (e) => {
          const t = e.hashtags.filter((n) => q.has(n)).length;
          return Math.min(3, e.hashtags.length / 4 + (t >= 3 ? 1 : 0));
        },
      },
      {
        id: 'announcement-opener',
        category: 'brag',
        label: 'Announcement humblebrag',
        weight: 0.9,
        test: (e) =>
          T(e.lower, [
            /\b(?:so |beyond |incredibly |truly )?(?:thrilled|humbled|honou?red|excited|delighted|proud|pumped|stoked)\b[^.!?\n]{0,50}\bto (?:announce|share|reveal|be named)\b[^.!?\n]{0,50}/,
            /\b(?:excited|proud) to (?:announce|share)\b[^.!?\n]{0,50}/,
            /\b(?:ich freue mich|wir freuen uns|freue mich)\b[^.!?\n]{0,60}\b(?:bekannt ?(?:zu )?geben|anzuk(?:ü|ue)ndigen|zu (?:teilen|verk(?:ü|ue)nden)|mitzuteilen)\b/,
            /\b(?:stolz|mit stolz)\b[^.!?\n]{0,40}\b(?:zu verk(?:ü|ue)nden|bekannt ?zu ?geben|anzuk(?:ü|ue)ndigen)\b/,
            /\bes ist offiziell\b[^.!?\n]{0,50}/,
          ])?.trim() ?? null,
      },
      {
        id: 'humility-flex',
        category: 'brag',
        label: 'Performative humility',
        weight: 1,
        test: (e) => {
          const t = b(e.lower, H);
          return t.length > 0 ? u(t.join(', ')) : null;
        },
        scale: (e) => Math.min(2, b(e.lower, H).length),
      },
      {
        id: 'metric-flex',
        category: 'brag',
        label: 'Numbers flex',
        weight: 0.8,
        test: (e) =>
          T(e.lower, [
            /\b(?:i|we|my|our)\b[^.!?\n]{0,60}\$\s?\d[\d,.]*\s?(?:k|m|mm|b|million|billion)?\b/,
            /\b\d[\d,.]*\s?(?:k|m)?\+?\s*(?:followers|subscribers|users|customers|downloads|signups|arr|mrr)\b/,
            /\b\d[\d,.]*\s?(?:k|m|mm|b)\+?\s*(?:people|students|members|readers|attendees|creators|founders)\b/,
            /\bfrom (?:0|zero)\b[^.!?\n]{0,30}\bto\b[^.!?\n]{0,30}\bin \d+\s*(?:days|weeks|months)\b/,
            /\b\d[\d,.]*\s?(?:k|m)?\+?\s*(?:follower|abonnenten|kunden|nutzer|downloads|anmeldungen)\b/,
            /\bvon (?:0|null)\b[^.!?\n]{0,30}\bauf\b[^.!?\n]{0,30}\bin \d+\s*(?:tagen|wochen|monaten)\b/,
          ])?.trim() ?? null,
      },
      {
        id: 'closing-question',
        category: 'ai',
        label: 'Ends by polling the reader',
        weight: 0.5,
        test: (e) => {
          if (e.wordCount < E) return null;
          const t = e.sentences.at(-1);
          return t === void 0 ||
            !t.trim().endsWith('?') ||
            !/\b(?:you|your|yourself|du|dir|dich|dein\w*|ihr|euch|eure\w*)\b/i.test(t)
            ? null
            : u(t);
        },
      },
      {
        id: 'hype-punctuation',
        category: 'ai',
        label: 'Doubled punctuation for emphasis',
        weight: 0.4,
        test: (e) => {
          const t = e.text.match(/[?!]{2,}/g) ?? [];
          return t.length < 2 ? null : u(t.join(' '));
        },
      },
      {
        id: 'product-pivot',
        category: 'brag',
        label: 'Pivots from story to sales pitch',
        weight: 0.9,
        test: (e) => {
          const t = b(e.lower, pe);
          return t.length > 0 ? u(t.join(', ')) : null;
        },
      },
      {
        id: 'cta-link',
        category: 'brag',
        label: 'Call to action with a tracked link',
        weight: 0.7,
        test: (e) => {
          const t = b(e.lower, we),
            n = /\blnkd\.in\//.test(e.lower);
          return t.length === 0 ? null : u(n ? `${t.join(', ')} + lnkd.in link` : t.join(', '));
        },
        scale: (e) => (/\blnkd\.in\//.test(e.lower) ? 1.4 : 1),
      },
      {
        id: 'parable',
        category: 'brag',
        label: 'Story-with-a-moral template',
        weight: 1,
        test: (e) => {
          if (e.wordCount < E) return null;
          const t = Math.floor(e.text.length / 2);
          if (!/["“][^"”\n]{5,}["”]/.test(e.text.slice(0, t))) return null;
          const r = e.lower.slice(Math.floor(e.lower.length * 0.6)),
            o = b(r, me);
          return o.length === 0 ? null : u(`quoted dialogue, then "${o[0] ?? ''}"`);
        },
      },
    ];
  function ke(e) {
    const t = w(e.text);
    return {
      raw: e.text,
      text: t,
      lower: N(e.text),
      lines: e.lines,
      sentences: de(t),
      wordCount: F(t),
      hashtags: e.hashtags,
    };
  }
  function ve(e, t = []) {
    const n = ke(e),
      r = [];
    for (const o of ye) {
      const s = o.test(n);
      if (s === null) continue;
      const a = o.weight * (o.scale ? o.scale(n) : 1);
      a <= 0 || r.push({ id: o.id, category: o.category, label: o.label, weight: a, evidence: s });
    }
    for (const o of t) {
      const s = o.term.trim().toLowerCase();
      s.length === 0 ||
        !n.lower.includes(s) ||
        r.push({
          id: `keyword:${s}`,
          category: o.category,
          label: 'Your keyword',
          weight: o.weight,
          evidence: s,
        });
    }
    return r.sort((o, s) => s.weight - o.weight);
  }
  function Ae(e) {
    const t = e.reduce((n, r) => n + r.weight, 0);
    return 1 - Math.exp(-t / 1.6);
  }
  function Ee(e) {
    let t = 0,
      n = 0;
    for (const r of e) r.category === 'ai' ? (t += r.weight) : (n += r.weight);
    return n > t ? 'brag' : 'ai';
  }
  const _e = 1,
    U = 0.12,
    Se = 1e-4,
    Fe = 6e3,
    Te = 3,
    Ce = 12,
    B = 2e4;
  function K() {
    return { weights: {}, bias: 0, labelCount: 0, version: _e };
  }
  function Me(e) {
    if (e >= 0) return 1 / (1 + Math.exp(-e));
    const t = Math.exp(e);
    return t / (1 + t);
  }
  function C(e, t) {
    const n = ge(e);
    for (const r of t) n[`r:${typeof r == 'string' ? r : r.id}`] = 1;
    return n;
  }
  function V(e, t) {
    let n = e.bias;
    for (const [r, o] of Object.entries(t)) {
      const s = e.weights[r];
      s !== void 0 && (n += s * o);
    }
    return Me(n);
  }
  function W(e, t, n, r = !0) {
    const o = V(e, t) - n;
    let s = 0;
    for (const [a, i] of Object.entries(t)) {
      const l = e.weights[a],
        g = l ?? 0,
        c = o * i + Se * g,
        f = g - U * c;
      Math.abs(f) < 1e-4 ? delete e.weights[a] : (l === void 0 && (s += 1), (e.weights[a] = f));
    }
    return (
      (e.bias -= U * o),
      r && (e.labelCount += 1),
      (M += s),
      M >= Le && ((M = 0), Object.keys(e.weights).length > B && xe(e)),
      e
    );
  }
  let M = 0;
  const Le = 2e3;
  function xe(e) {
    const t = Math.floor(B * 0.9),
      n = Object.entries(e.weights),
      r = n.filter(([s]) => s.startsWith('r:')),
      o = n
        .filter(([s]) => !s.startsWith('r:'))
        .sort((s, a) => Math.abs(a[1]) - Math.abs(s[1]))
        .slice(0, Math.max(0, t - r.length));
    e.weights = Object.fromEntries([...r, ...o]);
  }
  function Ie(e) {
    const t = K(),
      n = [...e].sort((o, s) => o.at - s.at),
      r = n.length === 0 ? 0 : Math.min(Ce, Math.max(Te, Math.round(Fe / n.length)));
    for (let o = 0; o < r; o += 1) {
      for (let s = n.length - 1; s > 0; s -= 1) {
        const a = (s * 1103515245 + o * 12345) % (s + 1),
          i = n[s],
          l = n[a];
        i !== void 0 && l !== void 0 && ((n[s] = l), (n[a] = i));
      }
      for (const s of n) W(t, C(s.text, s.signals), s.label, !1);
    }
    return ((t.labelCount = e.length), t);
  }
  const Y = 0.7,
    Re = 100;
  function Oe(e) {
    return e <= 0 ? 0 : Math.min(Y, (e / Re) * Y);
  }
  function G(e, t, n) {
    const r = ve(e, n.keywords ?? []),
      o = Ae(r),
      s = Oe(t.labelCount),
      a = s > 0 ? V(t, C(e.text, r)) : null,
      i = a === null ? o : (1 - s) * o + s * a;
    return {
      score: i,
      ruleScore: o,
      modelScore: a,
      alpha: s,
      label: i >= n.threshold ? Ee(r) : 'clean',
      reasons: r,
    };
  }
  function ze(e) {
    const t = Math.round(e.score * 100),
      n = e.label === 'brag' ? 'Brag' : 'AI-ish';
    return `Slop ${t}% · ${n}`;
  }
  const X = {
      enabled: !0,
      mode: 'dim',
      threshold: 0.6,
      keywords: [],
      showBadge: !0,
      showFlagAffordance: !0,
    },
    Z = { scanned: 0, flagged: 0, corrections: 0 },
    Ne = { at: 0, postsFound: 0 },
    J = 2e3,
    Q = { settings: X, model: K(), feedback: [], stats: Z, overrides: {}, health: Ne };
  async function y(e) {
    return (await chrome.storage.local.get(e))[e] ?? structuredClone(Q[e]);
  }
  async function $e() {
    return { ...X, ...(await y('settings')) };
  }
  async function ee() {
    return y('model');
  }
  async function De(e) {
    await chrome.storage.local.set({ model: e });
  }
  async function Pe() {
    return y('feedback');
  }
  async function je(e) {
    await chrome.storage.local.set({ feedback: e });
  }
  async function te() {
    return y('overrides');
  }
  async function He(e, t) {
    const n = await te();
    ((n[e] = t), await chrome.storage.local.set({ overrides: n }));
  }
  async function qe() {
    return { ...Z, ...(await y('stats')) };
  }
  async function ne(e) {
    const t = await qe();
    await chrome.storage.local.set({
      stats: {
        scanned: t.scanned + (e.scanned ?? 0),
        flagged: t.flagged + (e.flagged ?? 0),
        corrections: t.corrections + (e.corrections ?? 0),
      },
    });
  }
  async function Ue(e) {
    await chrome.storage.local.set({ health: e });
  }
  function L(e, t) {
    const n = (r, o) => {
      if (o !== 'local') return;
      const s = r[e];
      s !== void 0 && t(s.newValue ?? structuredClone(Q[e]));
    };
    return (
      chrome.storage.onChanged.addListener(n),
      () => chrome.storage.onChanged.removeListener(n)
    );
  }
  async function Be(e, t, n, r) {
    const o = await Pe(),
      s = o.findIndex((l) => l.urn === e),
      a = { urn: e, label: r, text: t, signals: n, at: Date.now() };
    let i;
    return (
      s >= 0
        ? ((o[s] = a), (i = Ie(o)))
        : (o.push(a),
          o.length > J && o.splice(0, o.length - J),
          (i = W(await ee(), C(t, n), r)),
          (i.labelCount = o.length)),
      await Promise.all([je(o), De(i), He(e, r), ne({ corrections: 1 })]),
      i
    );
  }
  const x = 'data-sf-state',
    re = 'data-sf-mode';
  function h(e, t, n) {
    const r = document.createElement(e);
    return (t !== void 0 && (r.className = t), n !== void 0 && (r.textContent = n), r);
  }
  function Ke(e, t) {
    return e.hasAttribute(x) ? (t ? e.querySelector(':scope > .sf-chip') !== null : !0) : !1;
  }
  function Ve(e) {
    const t = e.querySelector(':scope > .sf-panel');
    return t !== null && !t.hidden;
  }
  function We(e, t, n) {
    const r = h('div', 'sf-panel');
    if (
      ((r.hidden = !0),
      r.setAttribute('role', 'dialog'),
      r.setAttribute('aria-label', 'Why SlopFilter flagged this post'),
      r.addEventListener('click', (g) => g.stopPropagation()),
      r.appendChild(h('p', 'sf-panel__title', n)),
      e.reasons.length > 0)
    ) {
      const g = h('ul', 'sf-panel__reasons');
      for (const c of e.reasons) {
        const f = h('li', 'sf-panel__reason');
        (f.appendChild(h('span', 'sf-panel__reason-label', c.label)),
          f.appendChild(h('span', 'sf-panel__evidence', `“${c.evidence}”`)),
          g.appendChild(f));
      }
      r.appendChild(g);
    } else r.appendChild(h('p', 'sf-panel__empty', 'No slop signals matched this post.'));
    const o = h('div', 'sf-panel__actions'),
      s = h('button', 'sf-btn', 'This was no slop'),
      a = h('button', 'sf-btn', 'This is slop');
    ((s.type = 'button'), (a.type = 'button'), o.append(s, a), r.appendChild(o));
    const i = h(
      'p',
      'sf-panel__footer',
      e.modelScore === null
        ? `Rules only · score ${(e.ruleScore * 100).toFixed(0)}%. Your feedback starts training the model.`
        : `Rules ${(e.ruleScore * 100).toFixed(0)}% · your model ${(e.modelScore * 100).toFixed(0)}% (weight ${(e.alpha * 100).toFixed(0)}%)`,
    );
    r.appendChild(i);
    const l = (g) => {
      ((r.hidden = !0), Promise.resolve(t.onFeedback(g)));
    };
    return (
      s.addEventListener('click', () => l('not-slop')),
      a.addEventListener('click', () => l('slop')),
      r
    );
  }
  function Ye(e, t, n, r) {
    const o = e,
      s = Ve(o);
    oe(o);
    const a = r.override === 1 || (r.override !== 0 && n.label !== 'clean');
    if (
      (o.setAttribute(x, r.override === 0 ? 'cleared' : a ? 'flagged' : 'clean'),
      o.setAttribute(re, r.mode),
      !(a ? r.showBadge : r.showFlagAffordance))
    )
      return;
    const l = r.override === 1 && n.label === 'clean',
      g = a ? (l ? 'Marked slop' : ze(n)) : 'Slop?',
      c = h('button', a ? 'sf-chip' : 'sf-chip sf-chip--quiet', g);
    if (((c.type = 'button'), (c.dataset.sfKind = n.label === 'brag' ? 'brag' : 'ai'), !a)) {
      (c.setAttribute('aria-label', 'Mark this post as slop'),
        c.addEventListener('click', (A) => {
          (A.stopPropagation(), A.preventDefault(), Promise.resolve(r.onFeedback('slop')));
        }),
        o.append(c));
      return;
    }
    (c.setAttribute('aria-expanded', 'false'),
      c.setAttribute('aria-label', `${g} — from ${t.authorName || 'this author'}. Show why.`));
    const f = We(
      n,
      r,
      l
        ? 'You marked this as slop'
        : `Flagged as ${n.label === 'brag' ? 'bragging slop' : 'AI slop'}`,
    );
    (s && ((f.hidden = !1), c.setAttribute('aria-expanded', 'true')),
      c.addEventListener('click', (A) => {
        (A.stopPropagation(),
          A.preventDefault(),
          (f.hidden = !f.hidden),
          c.setAttribute('aria-expanded', String(!f.hidden)));
      }),
      o.append(c, f));
  }
  function oe(e) {
    const t = e;
    (t.querySelectorAll(':scope > .sf-chip, :scope > .sf-panel').forEach((n) => n.remove()),
      t.removeAttribute(x),
      t.removeAttribute(re));
  }
  const I = 'FeedType_MAIN_FEED',
    Ge = [
      `div[componentkey^="expanded"][componentkey*="${I}"]`,
      'div.feed-shared-update-v2[data-urn]',
      'div[data-urn^="urn:li:activity"]',
      'div[data-id^="urn:li:activity"]',
      'div.feed-shared-update-v2',
    ],
    Xe = [
      '[data-testid="expandable-text-box"]',
      'div[componentkey^="translatable-commentary"]',
      '.update-components-text .break-words',
      '.feed-shared-update-v2__description .update-components-text',
      '.update-components-text',
    ],
    Ze = [
      '.update-components-actor__title span[aria-hidden="true"]',
      '.update-components-actor__title',
      '.update-components-actor__name',
    ],
    Je = [
      'img[src*="media.licdn.com"]',
      'video',
      '.update-components-image',
      '.update-components-linkedin-video',
      '.update-components-article',
      '.update-components-document',
    ];
  function R(e, t) {
    for (const n of t) {
      const r = e.querySelector(n);
      if (r) return r;
    }
    return null;
  }
  function Qe(e) {
    const t = e.querySelectorAll(Ge.join(',')),
      n = [];
    for (const r of t) {
      const o = n[n.length - 1];
      (o !== void 0 && o.contains(r)) || n.push(r);
    }
    return n;
  }
  function et(e) {
    const t = e.getAttribute('componentkey');
    if (t === null || !t.includes(I)) return null;
    const n = t.slice(0, t.indexOf(I)).replace(/^expanded/, '');
    return n.length > 0 ? n : null;
  }
  function tt(e = location.href) {
    return /^https:\/\/www\.linkedin\.com\/feed(\/|$|\?)/.test(e);
  }
  const nt =
      /(?:…|\.\.\.)\s*(?:mehr anzeigen|mehr|see more|more|voir plus|ver más|さらに表示)\s*$/i,
    rt = new Set([
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
    ]),
    ot = new Set(['button', 'script', 'style', 'svg', 'noscript']);
  function st(e) {
    if (!e) return '';
    const t = [],
      n = (r) => {
        if (r.nodeType === 3) {
          t.push((r.nodeValue ?? '').replace(/\s+/g, ' '));
          return;
        }
        if (r.nodeType !== 1) return;
        const o = r,
          s = o.tagName.toLowerCase();
        if (ot.has(s)) return;
        if (s === 'br') {
          t.push(`
`);
          return;
        }
        const a = rt.has(s);
        a &&
          t.push(`
`);
        for (const i of o.childNodes) n(i);
        a &&
          t.push(`
`);
      };
    return (
      n(e),
      t
        .join('')
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(
          /[ \t]*\n[ \t]*/g,
          `
`,
        )
        .replace(
          /\n{3,}/g,
          `

`,
        )
        .trim()
    );
  }
  function se(e) {
    return e
      ? (e.textContent ?? '')
          .replace(/\u00a0/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      : '';
  }
  function at(e) {
    const t = new Map();
    for (const o of e.querySelectorAll('a[href]')) {
      const s = o.getAttribute('href') ?? '',
        a = /\/(?:in|company|school)\/([^/?#]+)/.exec(s)?.[1];
      a !== void 0 && t.set(a, (t.get(a) ?? 0) + 1);
    }
    let n = '',
      r = 0;
    for (const [o, s] of t) s > r && ((n = o), (r = s));
    return n;
  }
  function it(e, t) {
    const n = se(R(e, Ze));
    if (n.length > 0) return n;
    if (t.length > 0)
      for (const r of e.querySelectorAll('a[aria-label]')) {
        if (!(r.getAttribute('href') ?? '').includes(t)) continue;
        const o = (r.getAttribute('aria-label') ?? '').trim();
        if (o.length > 0) return o;
      }
    return t.replace(/-/g, ' ');
  }
  function lt(e, t, n) {
    const r = et(e);
    if (r !== null) return `sf:key:${r}`;
    const o =
      e.getAttribute('data-urn') ??
      e.getAttribute('data-id') ??
      e.querySelector('[data-urn]')?.getAttribute('data-urn');
    if (o != null && o.includes('urn:li:activity')) return o;
    let s = 2166136261;
    const a = `${t} ${n}`;
    for (let i = 0; i < a.length; i += 1)
      ((s ^= a.charCodeAt(i)), (s = Math.imul(s, 16777619) >>> 0));
    return `sf:hash:${s.toString(36)}`;
  }
  function ct(e) {
    const n = st(R(e, Xe)).replace(nt, '').trim(),
      r = at(e),
      o = se(e).slice(0, 160);
    return {
      urn: lt(e, r, n),
      authorName: it(e, r),
      authorId: r,
      text: n,
      lines: ue(n),
      hashtags: fe(n),
      hasMedia: R(e, Je) !== null,
      isRepost: /\breposted\b|\bgeteilt\b/i.test(o),
      isPromoted: /\bpromoted\b|\banzeige\b|\bsponsored\b|\bgesponsert\b/i.test(o),
    };
  }
  function ut(e) {
    return e.text.length >= 40;
  }
  const k = 'data-sf-seen',
    dt = 500;
  let d,
    v,
    m = {};
  const p = new Map();
  let O = !1;
  const ht =
    typeof requestIdleCallback == 'function'
      ? (e) => requestIdleCallback(() => e(), { timeout: dt })
      : (e) => setTimeout(e, 50);
  function gt(e, t) {
    return {
      mode: d.mode,
      showBadge: d.showBadge,
      showFlagAffordance: d.showFlagAffordance,
      override: m[e.urn],
      onFeedback: (n) => bt(e, t, n),
    };
  }
  function ft(e) {
    const t = m[e.post.urn];
    return t === 1 || (t !== 0 && e.verdict.label !== 'clean') ? d.showBadge : d.showFlagAffordance;
  }
  function z(e) {
    Ye(e.element, e.post, e.verdict, gt(e.post, e.verdict));
  }
  async function bt(e, t, n) {
    const r = n === 'slop' ? 1 : 0,
      o = t.reasons.map((s) => s.id);
    ((v = await Be(e.urn, e.text, o, r)), (m = { ...m, [e.urn]: r }), _());
  }
  function _() {
    for (const e of p.values()) {
      if (!e.element.isConnected) {
        p.delete(e.post.urn);
        continue;
      }
      ((e.verdict = G(e.post, v, { threshold: d.threshold, keywords: d.keywords })), z(e));
    }
  }
  let ae = 0,
    ie = -1;
  const mt = 3e4;
  function pt(e) {
    const t = Date.now();
    (!((e === 0) != (ie === 0)) && t - ae < mt) ||
      ((ae = t), (ie = e), Ue({ at: t, postsFound: e }));
  }
  function wt() {
    if (!d.enabled || !tt()) return;
    let e = 0,
      t = 0;
    const n = Qe(document);
    pt(n.length);
    for (const r of n) {
      const o = r.getAttribute(k);
      if (o === 'skip') continue;
      if (o !== null) {
        const l = p.get(o);
        l !== void 0 && !Ke(r, ft(l)) && ((l.element = r), z(l));
        continue;
      }
      const s = ct(r);
      if (!ut(s)) {
        r.setAttribute(k, 'skip');
        continue;
      }
      const a = G(s, v, { threshold: d.threshold, keywords: d.keywords });
      r.setAttribute(k, s.urn);
      const i = { element: r, post: s, verdict: a };
      (p.set(s.urn, i), z(i), (e += 1), a.label !== 'clean' && m[s.urn] !== 0 && (t += 1));
    }
    e > 0 && ne({ scanned: e, flagged: t });
  }
  function S() {
    O ||
      ((O = !0),
      ht(() => {
        ((O = !1), wt());
      }));
  }
  function yt() {
    for (const e of p.values()) oe(e.element);
    (document.querySelectorAll(`[${k}]`).forEach((e) => e.removeAttribute(k)), p.clear());
  }
  async function kt() {
    (([d, v, m] = await Promise.all([$e(), ee(), te()])),
      new MutationObserver(S).observe(document.body, { childList: !0, subtree: !0 }));
    let t = location.href;
    (setInterval(() => {
      location.href !== t && ((t = location.href), p.clear(), S());
    }, 1e3),
      L('settings', (n) => {
        const r = d.enabled;
        ((d = n), n.enabled ? (r ? _() : S()) : yt());
      }),
      L('model', (n) => {
        ((v = n), _());
      }),
      L('overrides', (n) => {
        ((m = n), _());
      }),
      S());
  }
  kt();
})();
