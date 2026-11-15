# Chapter 14: Implementation

## Plan

1. **Shared:** `CLIENTS`, `CLIENT_HEADER`, `Approval.decidedFrom`;
   `parseMarkdownBlocks`; `toolCallImages`.
2. **DB:** the `client` enum from `CLIENTS`; `decide(id, status, from)`;
   `decidedFrom` in the approval view.
3. **API:**
   - `POST /api/transcribe` with a `Voice` service (the user's OpenAI key)
     and a swappable `Transcriber`
   - approvals record the client from `X-Binary-Client`
4. **Faces:** a web script that renders `<Character>` to SVG for the app.
5. **Mobile:**
   - an auth guard (`Stack.Protected`) and four tabs
   - the API client (`expo/fetch`, the stored cookie), `useApi`, `useChat`
   - agent and room chats with streaming, Markdown, tool rows, images,
     approvals and @mention chips
   - Today with approvals and runs, and its badge
   - voice input (`expo-audio`, `expo-file-system`)
6. **Tests:** shared, db and API tests; a walkthrough of the app's web
   build at phone size; the iOS simulator; real transcription.

## Acceptance criteria

- [x] Sign in on the phone and see your crew, rooms and Today; sign out.
- [x] Chat with a character or a room: answers stream, Markdown renders,
      tool rows open, charts and screenshots show.
- [x] Approve or reject in the chat or on Today; the decision is saved as
      `mobile`, and the Today badge follows.
- [x] Speak a message: the words land in the box, with your characters'
      names spelled right; without an OpenAI key, a clear message.
- [x] The characters look the same as on the web, from one drawing.
- [x] No migration; lint, format, type-check, tests, the web build, the
      native export and `expo-doctor` pass; no sideways scroll at 390px.

## File-by-file

| File                                                      | Purpose                                                   |
| --------------------------------------------------------- | --------------------------------------------------------- |
| `packages/shared/src/approvals.ts`                        | `CLIENTS`, `CLIENT_HEADER`, `Approval.decidedFrom`        |
| `packages/shared/src/markdown.ts`, `tools.ts`             | `parseMarkdownBlocks`, `toolCallImages` (+ tests)         |
| `packages/db/src/repositories/approval-repository.ts`     | `decide(…, from)`; `decidedFrom` in the view              |
| `packages/db/src/schema/enums.ts`                         | `client` enum from `CLIENTS`                              |
| `apps/api/src/voice/transcriber.ts`                       | `Transcriber`, `createTranscriber`, `Voice`               |
| `apps/api/src/routes/voice.ts`                            | `POST /api/transcribe`                                    |
| `apps/api/src/routes/approvals.ts`, `approvals/decide.ts` | `clientOf(header)`; `from`                                |
| `apps/api/src/container.ts`, `app.ts`                     | `voice`, `createTranscriber` option; the route            |
| `apps/web/scripts/export-character-faces.tsx`             | Renders the characters to SVG for the app                 |
| `apps/web/src/components/chat/tool-images.tsx`            | Uses the shared `toolCallImages`                          |
| `apps/mobile/src/app/_layout.tsx`, `(tabs)/*`             | The guard; Crew, Rooms, Today, You                        |
| `apps/mobile/src/app/agents/[id].tsx`, `rooms/[id].tsx`   | The two chats                                             |
| `apps/mobile/src/lib/api.ts`, `use-api.ts`                | API client; lists that reload on focus                    |
| `apps/mobile/src/lib/use-chat.ts`, `read-ndjson.ts`       | Streaming chat state                                      |
| `apps/mobile/src/lib/voice.ts`                            | Record, upload, transcribe                                |
| `apps/mobile/src/lib/today-count.tsx`                     | The badge's count, shared                                 |
| `apps/mobile/src/lib/character-faces.ts`                  | Generated SVGs                                            |
| `apps/mobile/src/components/*`                            | Faces, chat view, bubbles, tool rows, composer, Markdown… |
| `apps/mobile/app.json`, `package.json`                    | `expo-audio` (mic text), `expo-file-system`, svg, icons   |

## Decisions

| Decision                                        | Why                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Transcription on the API, with the user's key   | Keys never reach the phone; it works the same in Expo Go, on a device and in a browser.                |
| OpenAI only, `gpt-4o-mini-transcribe`           | Anthropic has no speech-to-text; this model is fast, cheap and good with accents.                      |
| The text lands in the box, not sent             | A misheard word is fixed before a character reads it.                                                  |
| Character names as the transcription prompt     | Found with a real recording: "Bolt" came back as "bold". With the hint, names and @mentions are right. |
| A header says which app decided                 | No new route; the web needs no change, and anything else is "web".                                     |
| Faces generated from the web component          | One drawing for both apps; no hand-copied SVG to drift.                                                |
| `Stack.Protected` instead of redirects          | The guard is declared once; signing in or out needs no navigation code.                                |
| `expo/fetch` everywhere                         | It streams response bodies on iOS and Android, which the chat needs.                                   |
| A small Markdown renderer instead of a library  | Models write headings, lists, code and bold; a few lines cover them, with no native dependency.        |
| Hiring, apps, keys and routines stay on the web | The phone is for talking and deciding; forms with many fields are better on a big screen.              |
