import {
  g as h,
  a as w,
  s as y,
  r as k,
  b as v,
  c as b,
  d,
  e as E,
} from './chunks/store-BOyiDeZu.js';
async function L() {
  const e = k(await w());
  return (await v(e), e);
}
async function C() {
  return {
    kind: 'slopfilter-model',
    version: 1,
    exportedAt: new Date().toISOString(),
    feedback: await w(),
    model: await h(),
  };
}
async function x(e) {
  if (
    typeof e != 'object' ||
    e === null ||
    e.kind !== 'slopfilter-model' ||
    !Array.isArray(e.feedback)
  )
    throw new Error('Not a SlopFilter export file.');
  const t = e.feedback.filter(
    (n) =>
      typeof n?.urn == 'string' &&
      (n.label === 0 || n.label === 1) &&
      typeof n.text == 'string' &&
      Array.isArray(n.signals),
  );
  return (await y(t.slice(-2e3)), L());
}
function a(e) {
  const t = document.getElementById(e);
  if (!t) throw new Error(`Missing element #${e}`);
  return t;
}
const u = a('keyword-list'),
  S = a('keyword-empty'),
  A = a('status');
let c = [];
function l(e) {
  A.textContent = e;
}
function m() {
  (u.replaceChildren(),
    (S.hidden = c.length > 0),
    c.forEach((e, t) => {
      const n = document.createElement('li'),
        i = document.createElement('span');
      ((i.className = 'sf-term'), (i.textContent = e.term));
      const o = document.createElement('span');
      ((o.className = 'sf-tag'), (o.textContent = e.category === 'brag' ? 'Bragging' : 'AI'));
      const r = document.createElement('span');
      ((r.className = 'sf-tag'), (r.textContent = `×${e.weight}`));
      const s = document.createElement('button');
      ((s.type = 'button'),
        (s.className = 'sf-danger'),
        (s.textContent = 'Remove'),
        s.setAttribute('aria-label', `Remove keyword ${e.term}`),
        s.addEventListener('click', () => {
          ((c = c.filter((f, p) => p !== t)),
            d({ keywords: c }).then(() => {
              (m(), l('Keyword removed.'));
            }));
        }),
        n.append(i, o, r, s),
        u.appendChild(n));
    }));
}
async function g() {
  const e = await h(),
    t = Object.keys(e.weights).length;
  a('learning-summary').textContent =
    e.labelCount === 0
      ? 'Nothing learned yet — SlopFilter is running on its built-in rules.'
      : `${e.labelCount} correction${e.labelCount === 1 ? '' : 's'} recorded, ${t} learned signal${t === 1 ? '' : 's'}.`;
}
function F(e, t) {
  const n = new Blob([JSON.stringify(t, null, 2)], { type: 'application/json' }),
    i = URL.createObjectURL(n),
    o = document.createElement('a');
  ((o.href = i), (o.download = e), o.click(), URL.revokeObjectURL(i));
}
async function $() {
  const e = await b();
  ((c = e.keywords), m());
  const t = a('show-badge'),
    n = a('show-flag');
  ((t.checked = e.showBadge),
    (n.checked = e.showFlagAffordance),
    t.addEventListener('change', () => {
      d({ showBadge: t.checked });
    }),
    n.addEventListener('change', () => {
      d({ showFlagAffordance: n.checked });
    }),
    a('keyword-form').addEventListener('submit', (o) => {
      o.preventDefault();
      const r = a('keyword-term'),
        s = r.value.trim().toLowerCase();
      if (s.length !== 0) {
        if (c.some((f) => f.term === s)) {
          l('That keyword is already in the list.');
          return;
        }
        ((c = [
          ...c,
          {
            term: s,
            category: a('keyword-category').value,
            weight: Number(a('keyword-weight').value),
          },
        ]),
          d({ keywords: c }).then(() => {
            ((r.value = ''), m(), l(`Added “${s}”.`));
          }));
      }
    }),
    a('export').addEventListener('click', () => {
      C().then((o) => {
        (F(`slopfilter-${new Date().toISOString().slice(0, 10)}.json`, o), l('Exported.'));
      });
    }));
  const i = a('import-file');
  (a('import').addEventListener('click', () => i.click()),
    i.addEventListener('change', () => {
      const o = i.files?.[0];
      o &&
        o
          .text()
          .then((r) => x(JSON.parse(r)))
          .then(async (r) => {
            (await g(), l(`Imported and retrained on ${r.labelCount} corrections.`));
          })
          .catch((r) => {
            l(r instanceof Error ? r.message : 'Could not read that file.');
          })
          .finally(() => {
            i.value = '';
          });
    }),
    a('reset').addEventListener('click', () => {
      confirm('Delete everything SlopFilter has learned? Your keywords are kept.') &&
        E().then(async () => {
          (await g(), l('Learning reset.'));
        });
    }),
    await g());
}
$();
