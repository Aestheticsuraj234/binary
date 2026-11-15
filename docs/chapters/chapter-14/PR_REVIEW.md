# Chapter 14: Review

**Branch:** `feat/chapter-14-mobile` → `main`
**Reviewer:** Claude, a self-review.

## Google TypeScript Style Guide

- Named exports, except the screens, which Expo Router needs as defaults.
- No `any` or non-null assertions. One cast, `body as T` in `apiJson`,
  where the API's JSON meets its promised shape (the web's `readJson` does
  the same).
- Shared logic with tests lives in `@binary/shared`
  (`parseMarkdownBlocks`, `toolCallImages`); the app has no test runner.
- Lint and Prettier pass; the generated faces file is formatted by its
  script, so regenerating it changes nothing.

## Findings and fixes

| #   | Severity                     | Finding                                                                                                                      | Fix                                                                                                                               |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | High (found with real voice) | "Bolt" was transcribed as "bold", so spoken @mentions would miss.                                                            | The user's character names go to the model as its prompt. Tested (the fake gets the names) and confirmed with the real recording. |
| 2   | High (correctness)           | The faces script removed `width` and `height` from every element, so Bolt's body (rectangles) disappeared.                   | Only the outer `<svg>` loses its size. Found in the walkthrough's first screenshot.                                               |
| 3   | High (build)                 | `expo-doctor`: `expo-font` (for the icons) and `expo-asset` (for `expo-audio`) were missing; a standalone build could crash. | Installed with `npx expo install`; 20/20.                                                                                         |
| 4   | Medium (platform)            | `expo/fetch` can't send React Native's `{uri}` form parts, so a recording couldn't be uploaded on a phone.                   | The recording goes as an `expo-file-system` `File`, which `expo/fetch` sends; a browser uses a `Blob`.                            |
| 5   | Medium (accessibility)       | The sign-in fields had a visible label that screen readers didn't connect to the input.                                      | `TextField` sets `accessibilityLabel`. The icon buttons (Talk, Send, Back, New chat, Delete chat, Mention X) have labels too.     |
| 6   | Medium (privacy)             | Keys must never reach the phone.                                                                                             | Transcription runs on the API with the stored key; the phone sends only audio.                                                    |
| 7   | Low                          | The decision's source was always "web".                                                                                      | The header sets `mobile`; anything else stays `web`. The shared `CLIENTS` builds the enum.                                        |
| 8   | Low                          | After signing in, `router.replace('/')` raced the session update.                                                            | `Stack.Protected` moves the user once the session changes; the screens don't navigate themselves.                                 |

## Accepted trade-offs

- **The phone is for talking and deciding.** Hiring, editing characters,
  connecting apps, keys, routines and knowledge stay on the web.
- **Voice needs an OpenAI key.** Anthropic has no speech-to-text; without
  a key, the mic says so.
- **No push notifications yet,** so a new approval shows when you open
  the app (the badge refreshes on focus).
- **The Markdown renderer is small:** no tables or math layout.
- **In the web build, the tab labels lose their descenders** (a
  react-navigation web default); the native app is fine.

## Open items

- Push notifications for approvals.
- Spoken answers (text to speech).
- Room and character editing on the phone.
