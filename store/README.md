# Chrome Web Store submission

Everything needed for the listing. Run `npm run zip` to produce the upload bundle.

## Before you can submit

1. Register a developer account at https://chrome.google.com/webstore/devconsole — one-time **$5**
   fee, paid by you.
2. Upload `slopfilter-<version>.zip`.
3. Paste the listing copy from [`listing.md`](listing.md).
4. Attach screenshots (see below).
5. Fill in the privacy declarations (see below).

Review typically takes a few days. Extensions that request no host permissions beyond a single
domain and no remote code — which is this one — normally clear it without escalation.

## Required assets

| Asset             | Size         | Status                             |
| ----------------- | ------------ | ---------------------------------- |
| Store icon        | 128×128 PNG  | Built to `dist/icons/icon-128.png` |
| Screenshots (1–5) | 1280×800 PNG | **You need to capture these**      |
| Small promo tile  | 440×280 PNG  | Optional, but improves placement   |

### Screenshots to capture

Load the unpacked extension, open your feed, and capture at 1280×800:

1. **A dimmed post next to a normal one** — the core value, visible in one glance.
2. **The reasons panel open**, showing the quoted evidence and the two feedback buttons.
3. **The popup**, showing the sensitivity slider and the "learned from N corrections" line.
4. **The options page**, showing the keyword editor.

Blur or use your own posts — do not publish screenshots containing other people's names and faces.

## Privacy declarations

The console asks you to justify each permission and to declare data use. The answers:

- **`storage`** — "Stores the user's settings and the locally-trained model in their own browser."
- **`host_permissions: https://www.linkedin.com/*`** — "Reads post text on the user's LinkedIn feed
  in order to score it and visually de-emphasize low-quality posts. Processing is local."
- **Remote code** — "No. All code is included in the package."
- **Data collection** — Check **nothing**. The extension transmits no data.
- **Privacy policy URL** — link to `PRIVACY.md` in the public GitHub repo.

You must also certify the data-use disclosures: this extension does not sell data, does not use it
for creditworthiness or lending, and does not use it for purposes unrelated to its single function.
All three are accurate.

## Single purpose statement

> SlopFilter visually de-emphasizes low-quality posts in the user's LinkedIn feed and lets the user
> correct its judgements.
