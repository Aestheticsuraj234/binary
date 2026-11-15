# Rebuild prompt: Chapter 14, Mobile app and voice

> Paste everything below into a coding agent working in the Binary repo at the
> end of Chapter 13. `approval_requests.decided_from` (enum `client`) has
> existed since Chapter 2. The Expo app (SDK 58, Expo Router, Better Auth's
> Expo plugin) has sign-in and sign-up since Chapter 1.

---

You are a senior full-stack engineer and teacher. Bring the whole Binary
experience to the Expo app, and add **voice input**. No migration. Work on
`feat/chapter-14-mobile`. Read the Expo SDK 58 docs before using an API;
add packages with `npx expo install`.

## Shared

- `CLIENTS = ['web','mobile']`, `Client`, `CLIENT_HEADER =
'X-Binary-Client'`; `Approval.decidedFrom: Client | null`.
- `parseMarkdownBlocks(md)`: `code | heading | quote | item {marker} |
paragraph`; a fence still streaming counts as code. Tests.
- `toolCallImages(call)`: charts (`results[].png`) and `screenshot` (PNG if
  it starts "iVBOR", else JPEG) as data URLs, only when succeeded. Tests.
  The web's `ToolImages` uses it.

## DB

- The `client` enum from `CLIENTS`.
- `ApprovalRepository.decide(id, status, from = 'web')`; `decidedFrom` in
  the view. Test: a `mobile` decision.

## API

1. **`voice/transcriber.ts`:**
   - `Transcriber {transcribe(audio: Uint8Array, names: string[])}`
   - `createTranscriber(apiKey)`: `experimental_transcribe` with
     `createOpenAI({apiKey}).transcription('gpt-4o-mini-transcribe')`,
     `providerOptions.openai.prompt = "Names: A, B."`
   - `Voice.forUser(userId)`: decrypts the OpenAI key, or undefined
2. **`POST /api/transcribe`** (multipart `audio`): 400 "Voice needs an
   OpenAI key. Add one in Settings on the web."; 400 without a recording;
   413 over 10 MB; 502 the provider's error; 400 "Couldn't hear anything.
   Try again."; else `{text}`. Pass the user's agent names.
3. `createDependencies(…, {createTranscriber})`; `voice` in the container.
4. **Approvals:** `clientOf(header)` → `decideApproval({…, from})`.
5. Tests: 6 for voice with a fake transcriber; `decidedFrom` web and
   mobile.

## Faces

`apps/web/scripts/export-character-faces.tsx` (`pnpm --filter @binary/web
faces:export`, tsx with `scripts/tsconfig.json`): `renderToStaticMarkup`
of `<Character>` (full, and the face in idle, thinking, talking, happy,
oops), drop classes and the outer svg's size, write
`apps/mobile/src/lib/character-faces.ts`, then Prettier.

## Mobile

- **Packages:** react-native-svg, expo-audio (plugin with
  `microphonePermission`), expo-file-system, @expo/vector-icons, expo-font,
  expo-asset, and react-native-web, react-dom and @expo/metro-runtime for
  the web build.
- **`_layout.tsx`:** a spinner while the session loads; `Stack.Protected`
  for `(tabs)`, `agents/[id]` and `rooms/[id]`, and for sign-in and
  sign-up; `TodayCountProvider`. Sign-in screens don't navigate.
- **`lib/api.ts`:** `apiFetch` with `expo/fetch`, `X-Binary-Client:
mobile`, `Cookie: await authClient.getCookie()` on native, `credentials:
'include'` on web. `apiJson<T>` never throws.
- **`useApi(path)`** reloads on focus. **`useChat({start, agentId?})`:**
  messages, `send` (creates the chat on the first message; reads NDJSON;
  `turn` starts a bubble in rooms), `decide` (then reloads), `open(id)`,
  `mood`, `speakerId`.
- **`useVoiceInput(onText)`:** permission, `setAudioModeAsync({allowsRecording:
true})`, `prepareToRecordAsync`, `record`; on stop, upload `new
File(uri)` (a `Blob` on web) and append the text.
- **Tabs (JS tabs):** Crew (character cards, recent chats), Rooms, Today
  (approvals with Approve / Reject / Open chat, routine runs, the badge),
  You (account, sign out).
- **Chats:** a header with back, the face (it talks), New and Delete;
  starters; bubbles with Markdown, tool rows (open/close, images, Approve
  / Reject); room names and @chips; the composer with mic and send above
  the keyboard.

## Tests

- shared 4, db 1 changed, API 6 new plus 2 changed
- a Playwright walkthrough of Expo web at 390px with a fake microphone
  and a fake model
- the iOS simulator through Expo Go
- a real recording through your OpenAI key

## Acceptance criteria

- The tabs, chats, rooms and Today work on the phone, streaming.
- Decisions from the phone are saved as `mobile`.
- Voice fills the box, with names spelled right.
- 354 tests; lint, format, type-check, the web build, `expo export` and
  `expo-doctor` pass.
