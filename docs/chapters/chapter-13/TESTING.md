# Chapter 13: Testing

```bash
pnpm test
```

The room API tests use one fake model that plays every agent. It reads
"You are <Name>," from the system prompt and answers "<Name> here." Ava
hands over to Ben when asked to, and Cy (with a fake sandbox) runs code.
As the router, it returns whatever the test sets.

## Suites

| Suite          | File                                   | Tests                                                                                                                                                                                  |
| -------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rooms (shared) | `packages/shared/src/rooms.test.ts`    | mentions in order, once, longest name first, not emails or partial words; the schema needs 2+ members, each once, and a lead among them (3)                                            |
| Rooms (db)     | `packages/db/.../repositories.test.ts` | create with members; refuse another user's agents; update replaces the members; room chats, and their approvals in the inbox with `roomId` and the asking agent; delete with chats (5) |
| Rooms (API)    | `apps/api/src/routes/rooms.test.ts`    | 15, listed below                                                                                                                                                                       |

The API tests cover:

- **Creating:** validation; another user's agents refused; listed with its
  members, and 404 for others.
- **@Mention:**
  - Ben then Ava answer, in the order mentioned
  - Ava's prompt contains "[Ben]: Ben here." and the room section
  - the message is saved once, and each answer with its author
  - the lead answers when no one is mentioned
  - a hand-off (Ava → Ben)
  - another user gets 404
- **Automatic:** the router's order is followed (its prompt lists the
  members and the message); an @mention wins; it falls back to the lead.
- **Limits:** 4 answers out of 5 mentioned; a failing agent (no key)
  doesn't stop the next one.
- **Approvals:** run code in a room → in the inbox with `roomId` → approve
  → Cy's follow-up has its author and still knows the room.
- **Deleting:** a room takes its chats.

## Results

| Check                  | Result                                                               |
| ---------------------- | -------------------------------------------------------------------- |
| All tests              | 344 pass (shared 36, db 60, api 238, runner 10). Chapter 12 had 321. |
| ESLint, Prettier       | Clean                                                                |
| Type-check (`--force`) | Passed                                                               |
| `drizzle-kit generate` | No changes (no migration)                                            |
| Web production build   | Passed (`/rooms`, `/rooms/new`, `/rooms/[id]`, `/rooms/[id]/edit`)   |

## Browser walkthrough (18 checks)

| Step                                                                                                 | Result |
| ---------------------------------------------------------------------------------------------------- | ------ |
| Rooms empty; New room: name, three characters picked ("3 of up to 6"), Automatic explained, the lead | ✓      |
| The room: members with "lead"; the hint "Nova will pick who answers"                                 | ✓      |
| "Plan the launch page" → Mimi then Bolt answer, under their names                                    | ✓      |
| The @Bolt chip inserts "@Bolt "; only Bolt answers                                                   | ✓      |
| "@Nova … hand off" → Nova @mentions Bolt, and Bolt answers next                                      | ✓      |
| The chat is listed in the room's panel                                                               | ✓      |
| Edit to @Mention with Mimi as lead → no mention, Mimi answers                                        | ✓      |
| The Rooms card shows the mode and the members                                                        | ✓      |
| Phone (390px): Rooms, the room, edit; a message on the phone                                         | ✓      |
| Delete the room → back to an empty list; no unexpected errors                                        | ✓      |

## Real run (your account)

The room "Launch crew": Mira (Claude Sonnet 5.5, lead, automatic), Bolt
(GPT‑5.5) and Mimi (GPT‑5.6).

- **"Who should do what for our CLI launch?"**
  - The lead picked Mira, Bolt and Mimi.
  - Mira split the work, used her memory ("since you prefer TypeScript"),
    and handed over with "@Bolt, can you tell us what's still open…".
  - Bolt and Mimi each took their part.
- **"@Mimi … README first screen?"** Only Mimi answered.
- **Found:** Bolt and Mimi started with "**Bolt:**" / "**Mimi:**", copying
  the "[Name]:" labels. A prompt line fixed it. The rerun ("@Bolt and
  @Mimi: one line each…") gave one clean line each.
