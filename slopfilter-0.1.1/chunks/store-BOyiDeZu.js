(function () {
  const s = document.createElement('link').relList;
  if (s && s.supports && s.supports('modulepreload')) return;
  for (const n of document.querySelectorAll('link[rel="modulepreload"]')) o(n);
  new MutationObserver((n) => {
    for (const e of n)
      if (e.type === 'childList')
        for (const c of e.addedNodes) c.tagName === 'LINK' && c.rel === 'modulepreload' && o(c);
  }).observe(document, { childList: !0, subtree: !0 });
  function r(n) {
    const e = {};
    return (
      n.integrity && (e.integrity = n.integrity),
      n.referrerPolicy && (e.referrerPolicy = n.referrerPolicy),
      n.crossOrigin === 'use-credentials'
        ? (e.credentials = 'include')
        : n.crossOrigin === 'anonymous'
          ? (e.credentials = 'omit')
          : (e.credentials = 'same-origin'),
      e
    );
  }
  function o(n) {
    if (n.ep) return;
    n.ep = !0;
    const e = r(n);
    fetch(n.href, e);
  }
})();
function y(t) {
  return t
    .normalize('NFKC')
    .replace(
      /\r\n?/g,
      `
`,
    )
    .replace(/[ \t]+/g, ' ');
}
function M(t) {
  return y(t).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}
function L(t) {
  return M(t).match(/[\p{L}\p{N}']+/gu) ?? [];
}
function A(t) {
  const s = L(t),
    r = {};
  for (let o = 0; o < s.length; o += 1) {
    const n = s[o];
    if (n === void 0 || n.length < 2) continue;
    r[`w:${n}`] = 1;
    const e = s[o + 1];
    e !== void 0 && (r[`b:${n} ${e}`] = 1);
  }
  return r;
}
const T = 1,
  p = 0.12,
  O = 1e-4,
  v = 6e3,
  N = 3,
  S = 12,
  b = 2e4;
function f() {
  return { weights: {}, bias: 0, labelCount: 0, version: T };
}
function _(t) {
  if (t >= 0) return 1 / (1 + Math.exp(-t));
  const s = Math.exp(t);
  return s / (1 + s);
}
function F(t, s) {
  const r = A(t);
  for (const o of s) r[`r:${typeof o == 'string' ? o : o.id}`] = 1;
  return r;
}
function R(t, s) {
  let r = t.bias;
  for (const [o, n] of Object.entries(s)) {
    const e = t.weights[o];
    e !== void 0 && (r += e * n);
  }
  return _(r);
}
function C(t, s, r, o = !0) {
  const n = R(t, s) - r;
  let e = 0;
  for (const [c, u] of Object.entries(s)) {
    const a = t.weights[c],
      d = a ?? 0,
      E = n * u + O * d,
      h = d - p * E;
    Math.abs(h) < 1e-4 ? delete t.weights[c] : (a === void 0 && (e += 1), (t.weights[c] = h));
  }
  return (
    (t.bias -= p * n),
    o && (t.labelCount += 1),
    (l += e),
    l >= x && ((l = 0), Object.keys(t.weights).length > b && I(t)),
    t
  );
}
let l = 0;
const x = 2e3;
function I(t) {
  const s = Math.floor(b * 0.9),
    r = Object.entries(t.weights),
    o = r.filter(([e]) => e.startsWith('r:')),
    n = r
      .filter(([e]) => !e.startsWith('r:'))
      .sort((e, c) => Math.abs(c[1]) - Math.abs(e[1]))
      .slice(0, Math.max(0, s - o.length));
  t.weights = Object.fromEntries([...o, ...n]);
}
function U(t) {
  const s = f(),
    r = [...t].sort((n, e) => n.at - e.at),
    o = r.length === 0 ? 0 : Math.min(S, Math.max(N, Math.round(v / r.length)));
  for (let n = 0; n < o; n += 1) {
    for (let e = r.length - 1; e > 0; e -= 1) {
      const c = (e * 1103515245 + n * 12345) % (e + 1),
        u = r[e],
        a = r[c];
      u !== void 0 && a !== void 0 && ((r[e] = a), (r[c] = u));
    }
    for (const e of r) C(s, F(e.text, e.signals), e.label, !1);
  }
  return ((s.labelCount = t.length), s);
}
const w = {
    enabled: !0,
    mode: 'dim',
    threshold: 0.6,
    keywords: [],
    showBadge: !0,
    showFlagAffordance: !0,
  },
  g = { scanned: 0, flagged: 0, corrections: 0 },
  m = { at: 0, postsFound: 0 },
  P = { settings: w, model: f(), feedback: [], stats: g, overrides: {}, health: m };
async function i(t) {
  return (await chrome.storage.local.get(t))[t] ?? structuredClone(P[t]);
}
async function D() {
  return { ...w, ...(await i('settings')) };
}
async function j(t) {
  const s = { ...(await D()), ...t };
  return (await chrome.storage.local.set({ settings: s }), s);
}
async function H() {
  return i('model');
}
async function K(t) {
  await chrome.storage.local.set({ model: t });
}
async function $() {
  return i('feedback');
}
async function k(t) {
  await chrome.storage.local.set({ feedback: t });
}
async function G() {
  return { ...g, ...(await i('stats')) };
}
async function W() {
  return { ...m, ...(await i('health')) };
}
async function z() {
  await chrome.storage.local.set({ model: f(), feedback: [], overrides: {}, stats: g });
}
export { $ as a, K as b, D as c, j as d, z as e, G as f, H as g, W as h, U as r, k as s };
