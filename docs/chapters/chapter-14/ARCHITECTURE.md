# Chapter 14: Architecture

Diagrams: [components](architecture/system-overview.md),
[a spoken message end to end](architecture/request-flow.md),
[signed in or out](architecture/integration-flow.md).

## Screens (Expo Router)

```text
src/app/
  _layout.tsx          Stack with two Stack.Protected groups (session / none)
  (tabs)/_layout.tsx   JS tabs: Crew, Rooms, Today (badge), You
  (tabs)/index.tsx     Crew: characters + recent chats
  (tabs)/rooms.tsx     Rooms
  (tabs)/today.tsx     Today: approvals + routine runs
  (tabs)/account.tsx   You: account, sign out
  agents/[id].tsx      A chat with one character   (?chat=<thread id>)
  rooms/[id].tsx       A room's chat               (?chat=<thread id>)
  sign-in.tsx, sign-up.tsx
```

- **The auth guard:** the root layout reads `authClient.useSession()`.
  Signed in, only the tabs and chats exist; signed out, only sign-in and
  sign-up. When the session changes, Expo Router moves to a screen that
  exists, so sign-in and sign-out need no `router.replace`.
- **Lists** (`useApi`) load again whenever their screen comes back into
  view (`useFocusEffect`), and can be pulled to refresh.
- **The Today badge** lives in a small context (`TodayCountProvider`).
  The tabs refresh it on focus, and any screen that decides or gets an
  answer refreshes it too.

## Talking to the API (`lib/api.ts`)

`apiFetch(path, init)` is the one way the app calls the API:

- **On a phone** the session cookie is in secure storage (Chapter 1's
  Better Auth Expo plugin), so it's added by hand:
  `Cookie: await authClient.getCookie()`, with `credentials: 'omit'`.
- **In a browser** (the web build used for testing), the browser sends the
  cookie: `credentials: 'include'`.
- Every request sends **`X-Binary-Client: mobile`**.
- It uses **`expo/fetch`**, whose response body is a stream on iOS and
  Android, so answers can arrive word by word.

`apiJson<T>` wraps it and never throws: `{data}` or `{error}`, with the
API's own message.

## Streaming a chat (`lib/use-chat.ts`)

One hook serves both kinds of chat. It reads the same NDJSON events as
the web (`readNdjson`, copied from the web app):

| Event   | One-to-one                                      | Room                                       |
| ------- | ----------------------------------------------- | ------------------------------------------ |
| (send)  | the answer bubble starts at once                | nothing yet                                |
| `turn`  | –                                               | a new bubble for that character; it speaks |
| `delta` | text appended, the face talks                   | same, to the current bubble                |
| `tool`  | a tool row is added or updated; the face thinks | same                                       |
| `done`  | the saved message replaces the bubble; happy    | same                                       |
| `error` | shown in the bubble; oops                       | in that character's bubble                 |
| `end`   | –                                               | the turn is over                           |

A chat is created on its first message (`POST /api/agents/:id/threads`
or `/api/rooms/:id/threads`). Approve and Reject call the approval
routes, then reload the chat, where the server has saved the decision note
and the character's follow-up.

## Voice

```text
mic → expo-audio (HIGH_QUALITY, .m4a) → FormData "audio"
    → POST /api/transcribe → the user's OpenAI key → gpt-4o-mini-transcribe
    → {text} → appended to the message box
```

- **Recording:** `useAudioRecorder(RecordingPresets.HIGH_QUALITY)`. Ask for
  the microphone, `setAudioModeAsync({allowsRecording: true})` (iOS
  records only in a recording session), `prepareToRecordAsync()`,
  `record()`; then `stop()` and `recorder.uri`.
- **Uploading:** `expo/fetch` can't send React Native's `{uri}` form parts,
  so the file goes as an `expo-file-system` `File`, which it can send. In a
  browser the recording is a `blob:` URL, fetched into a `Blob`.
- **On the API:** `Voice.forUser(userId)` decrypts the user's OpenAI key
  (like `EmbedderFactory` in Chapter 12) and builds a `Transcriber`; tests
  pass a fake one through `createDependencies(…, {createTranscriber})`.
  The user's character names go along as the model's `prompt`
  ("Names: Bolt, Mimi, Nova."), so names come out spelled right.
- **Why the text lands in the box** instead of being sent: a misheard word
  is easy to fix before it reaches a character, and the user stays in
  control of what's sent.

## Approvals from the phone

`POST /api/approvals/:id/approve|reject` reads `X-Binary-Client`:
`clientOf('mobile')` is `mobile`, and anything else is `web`.
`decideApproval({…, from})` passes it to `ApprovalRepository.decide(id,
status, from)`, which saves it in `approval_requests.decided_from`. The
`Approval` view now includes `decidedFrom`. The list of clients is shared
(`CLIENTS`), and the database enum is built from it.

## Characters on the phone

`pnpm --filter @binary/web faces:export` runs
`apps/web/scripts/export-character-faces.tsx`:

1. Render the web's `<Character>` with `renderToStaticMarkup`: the full
   drawing, and the face in each mood (idle, thinking, talking, happy,
   oops).
2. Remove the animation classes, and the size from the outer `<svg>`
   only.
3. Write `apps/mobile/src/lib/character-faces.ts` (about 60 KB), then
   format it with Prettier.

The app draws them with `SvgXml` from `react-native-svg`. `CharacterAvatar`
alternates between talking and idle every 180 ms while a character
speaks, so its mouth moves.

## Shared code

- `parseMarkdownBlocks(markdown)` (shared, tested): headings, paragraphs,
  list items, quotes and code (also code still streaming in). The app's
  `Markdown` draws the blocks and inline marks (`code`, **bold**,
  _italic_, links). Tables and math stay text.
- `toolCallImages(call)` (shared, tested): charts and screenshots as data
  URLs. The web's `ToolImages` uses it too now.

## API contracts

| Method + path                                                     | Success                               | Errors                                                                                                             |
| ----------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `POST /api/transcribe` (multipart, `audio`)                       | `{text}`                              | `400` "Voice needs an OpenAI key…", no recording, nothing heard; `413` over 10 MB; `502` the provider's error; 401 |
| `POST /api/approvals/:id/approve\|reject` + `X-Binary-Client`     | `{approval: {…, decidedFrom}, reply}` | as before                                                                                                          |
| Everything else the app uses: agents, threads, rooms, today, auth | unchanged                             |                                                                                                                    |

## Data

No migration: `approval_requests.decided_from` (enum `client`: web,
mobile) has existed since Chapter 2. Until now it was always `web`.
