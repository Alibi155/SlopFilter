# Privacy Policy — SlopFilter for LinkedIn

_Last updated: 2026-07-31_

## The short version

SlopFilter collects nothing, transmits nothing, and has no way to do either. It has no network
permission, no server, no analytics, and no account.

## What the extension stores

All of the following is written to `chrome.storage.local`, which lives in your own browser profile
and is never synced or uploaded:

- **Your settings** — on/off, sensitivity threshold, display mode, and any keywords you add.
- **Your corrections** — for each post you rule on, the words it contained, which rules fired, and
  whether you called it slop. Capped at the 2000 most recent.
- **The learned model** — a list of numeric weights derived from those corrections.
- **Counters** — how many posts have been scanned, flagged, and corrected.

Post text is processed in memory to score it. Only posts you explicitly give feedback on leave a
stored trace, and that trace stays on your machine.

## What the extension does _not_ do

- No data is sent to any server, including ours. There is none.
- No analytics, telemetry, crash reporting, or advertising identifiers.
- No reading or modifying anything outside `linkedin.com/feed/*` — not even the rest of LinkedIn.
- No access to your LinkedIn account, messages, connections, or credentials.
- Nothing is shared with or sold to third parties.

## Permissions, and why each is needed

| Permission                        | Why                                                       |
| --------------------------------- | --------------------------------------------------------- |
| `storage`                         | Save your settings and the model on your device.          |
| Content script on `/feed/*` pages | Read post text on your feed in order to score and dim it. |

The extension requests **no host permissions at all**. Its entire reach is the content script's
match pattern, `https://www.linkedin.com/feed/*` — so it cannot touch your LinkedIn messages,
profile, or job pages, let alone any other site. It also has no permission to make network
requests, which is why the claims above are structural rather than a promise.

## Deleting your data

**Options page → Reset learning** erases the model, corrections, overrides, and counters. Removing
the extension from Chrome deletes everything, including settings.

## Contact

Open an issue on the project's GitHub repository.
