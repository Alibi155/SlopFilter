# Contributing

## The most useful contribution

If SlopFilter flagged something it shouldn't have, or missed something obvious, add it to
[`tests/fixtures/posts.ts`](tests/fixtures/posts.ts) with the label you think is right. A failing
fixture is a far better bug report than prose, and the corpus is what keeps rule tuning from
becoming guesswork.

Please write a synthetic post rather than pasting a real one — same shape, invented content and
names.

## Adding or changing a rule

Rules live in [`src/engine/rules.ts`](src/engine/rules.ts). A rule must:

- return the **matched text** as `evidence` — that string is shown to the user, so every flag stays
  explainable;
- carry a weight in roughly the 0.3–1.5 range (see the existing table for calibration);
- come with fixtures on both sides: a post it should fire on, and a plausible one it must not.

The bar for a new rule is **no new false positives on the existing corpus**. Run `npm test` — the
suite asserts every clearly-genuine fixture stays clean.

## Selector breakage

If the extension stops flagging anything, LinkedIn has probably changed its markup. Everything to
fix lives in [`src/content/selectors.ts`](src/content/selectors.ts); add the new selector at the
front of the relevant list rather than replacing the old one, so the extension keeps working for
people on the previous rollout. Update `tests/fixtures/feed-post.html` to match.

## Before opening a PR

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

CI runs all four plus a coverage gate on `src/engine/`.

## Scope

v1 is deliberately feed posts only. Comments, article pages, and author-level muting are plausible
next steps but are not in yet — say so in an issue before building one, so we can agree on the shape
first.
