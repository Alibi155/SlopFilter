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
- No reading or modifying any site other than `linkedin.com`.
- No access to your LinkedIn account, messages, connections, or credentials.
- Nothing is shared with or sold to third parties.

## Permissions, and why each is needed

| Permission                   | Why                                                       |
| ---------------------------- | --------------------------------------------------------- |
| `storage`                    | Save your settings and the model on your device.          |
| `https://www.linkedin.com/*` | Read post text on your feed in order to score and dim it. |

There is deliberately no host permission for any other origin, which means the extension cannot make
network requests even if its code were changed to try.

## Deleting your data

**Options page → Reset learning** erases the model, corrections, overrides, and counters. Removing
the extension from Chrome deletes everything, including settings.

## Contact

Open an issue on the project's GitHub repository.
