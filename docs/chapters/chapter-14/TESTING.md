# Chapter 14: Testing

```bash
pnpm test
```

The voice tests give `createDependencies` a fake transcriber that records
the key, the audio's size and the names it was given, and answers a set
sentence (or fails, or hears nothing). No audio leaves the machine.

## Suites

| Suite             | File                                    | Tests                                                                                                                                                   |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Markdown (shared) | `packages/shared/src/markdown.test.ts`  | headings, paragraphs, bullets and numbers, quotes; code kept as written, also while streaming (2 new)                                                   |
| Tools (shared)    | `packages/shared/src/tools.test.ts`     | charts then the screenshot, with type and page; JPEG, unfinished calls and plain output (2 new)                                                         |
| Approvals (db)    | `packages/db/.../repositories.test.ts`  | the first decision wins and records `mobile` (changed)                                                                                                  |
| Voice (API)       | `apps/api/src/routes/voice.test.ts`     | 401; no OpenAI key; the user's key, the audio and the characters' names; missing, empty and too long (413); nothing heard; the provider's error (6 new) |
| Approvals (API)   | `apps/api/src/routes/approvals.test.ts` | the web's approve is `web`; a reject with `X-Binary-Client: mobile` is `mobile` (changed)                                                               |

## Results

| Check                                    | Result                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| All tests                                | 354 pass (shared 40, db 60, api 244, runner 10). Chapter 13 had 344.   |
| ESLint, Prettier                         | Clean                                                                  |
| Type-check (`--force`), the faces script | Passed                                                                 |
| Web production build                     | Passed                                                                 |
| `expo export` (iOS and Android)          | Both bundles built                                                     |
| `expo-doctor`                            | 20/20, after adding the peer dependencies `expo-font` and `expo-asset` |
| `drizzle-kit generate`                   | No changes (no migration)                                              |

## Walkthrough: the app's web build at phone size (29 checks)

Expo web (react-native-web) at 390×844, driven by Playwright with a fake
microphone, against the real API with a fake model, a fake sandbox and a
fake transcriber.

| Step                                                                                                        | Result |
| ----------------------------------------------------------------------------------------------------------- | ------ |
| Sign up → Crew with its empty state; three characters after hiring; no sideways scroll                      | ✓      |
| Nova's chat: greeting and starters; a starter streams in; heading, list, bold and code render               | ✓      |
| Voice without an OpenAI key: "Voice needs an OpenAI key. Add one in Settings on the web."                   | ✓      |
| Voice with a key: "Listening…", stop, the sentence lands in the box, then it's sent                         | ✓      |
| "run some code": the tool row asks; Approve → decided `mobile` (header and saved), chart, note              | ✓      |
| Again → Today badge "1" → the card → Reject → "Rejected. Nova knows not to.", saved as `mobile`, badge gone | ✓      |
| Crew lists the chat; it reopens with its messages                                                           | ✓      |
| Rooms: the card with "@Mention"; the room with members and "lead"                                           | ✓      |
| The @Bolt chip → "@Bolt "; only Bolt answers; "@Nova … hand it over" → Nova, then Bolt                      | ✓      |
| No sideways scroll in the room; You → Sign out → sign-in; no unexpected errors                              | ✓      |

## On the iOS simulator

Expo Go on an iPhone 17 Pro simulator (iOS 26.5), with deep links
(`exp://127.0.0.1:8082/--/rooms/<id>?chat=<id>`) and `xcrun simctl io
booted screenshot`. Native rendering of the faces (SVG), tabs and badge,
Markdown, a room with authors and chips, and Today were checked on real
data from an earlier chapter, read only.

The web build cuts the "y" of the tab labels: react-navigation's web
label box is 10px high. It's fine on iOS, which is what the app is for.

## Real voice (your account)

A sentence spoken by macOS `say`, sent to the dev API with your OpenAI
key:

- **"Bolt, please check the open issues and tell me which three to fix
  first."** came back as "**Bold**, please check…" (in about 2 s).
- **Fix:** the characters' names now go to the model as its prompt. The
  same recording, twice: "**Bolt**, please check…".
- **"At Mimi, can you sketch the landing page, and at Nova, find two
  competitors?"** came back as "**@Mimi**, can you sketch the landing
  page, and **@Nova**, find two competitors." Mentions work by voice.

Nothing was saved: transcribing doesn't touch your chats.
