import { c as u, d as r, f as g, g as f, h as m } from './chunks/store-BOyiDeZu.js';
const l = 0.7,
  h = 100;
function p(e) {
  return e <= 0 ? 0 : Math.min(l, (e / h) * l);
}
function n(e) {
  const t = document.getElementById(e);
  if (!t) throw new Error(`Missing element #${e}`);
  return t;
}
const i = n('enabled'),
  a = n('threshold'),
  v = n('threshold-value'),
  c = n('learning'),
  s = n('health');
function d(e) {
  v.textContent = `${e}%`;
}
async function L() {
  const e = await f(),
    t = p(e.labelCount);
  if (e.labelCount === 0) {
    c.textContent =
      'Using built-in rules only. Correct a few posts and SlopFilter starts learning your taste.';
    return;
  }
  const o = Math.max(0, h - e.labelCount);
  c.textContent =
    `Learned from ${e.labelCount} correction${e.labelCount === 1 ? '' : 's'} · your model carries ${Math.round(t * 100)}% of each score` +
    (o > 0 ? ` · ${o} more to reach full weight.` : '.');
}
async function b() {
  const e = await g();
  ((n('stat-scanned').textContent = String(e.scanned)),
    (n('stat-flagged').textContent = String(e.flagged)),
    (n('stat-corrections').textContent = String(e.corrections)));
}
async function C() {
  const { at: e, postsFound: t } = await m();
  if (e === 0) {
    ((s.textContent = 'Open your LinkedIn feed to see SlopFilter at work.'), (s.hidden = !1));
    return;
  }
  t === 0 &&
    ((s.textContent =
      'No posts recognised on the last scan. If this persists, LinkedIn may have changed its layout — please open an issue.'),
    (s.hidden = !1));
}
async function y() {
  const e = await u();
  i.checked = e.enabled;
  const t = Math.round(e.threshold * 100);
  ((a.value = String(t)), d(t));
  for (const o of document.querySelectorAll('input[name="mode"]'))
    ((o.checked = o.value === e.mode),
      o.addEventListener('change', () => {
        o.checked && r({ mode: o.value });
      }));
  (i.addEventListener('change', () => {
    r({ enabled: i.checked });
  }),
    a.addEventListener('input', () => {
      d(Number(a.value));
    }),
    a.addEventListener('change', () => {
      r({ threshold: Number(a.value) / 100 });
    }),
    n('open-options').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    }),
    await Promise.all([b(), L(), C()]));
}
y();
