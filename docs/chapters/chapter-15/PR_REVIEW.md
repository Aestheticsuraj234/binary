# Chapter 15: Review

**Branch:** `feat/chapter-15-share` → `main`
**Reviewer:** Claude, a self-review.

## Docs checklist

- The README's first screen says what Binary is and links to the guide.
- Every feature claim has a screenshot of the real thing.
- Every UI label the guide names ("Connect an app", "Add a computer",
  "Accept edits", "Cloud sandbox (not set up)"…) was checked against the
  code; every error message it quotes exists.
- Every command was run on a fresh clone.
- Every relative link resolves.

## Findings and fixes

| #   | Severity               | Finding                                                                                                                                          | Fix                                                                                                        |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| 1   | High (broken feature)  | `pnpm trigger:dev` failed to build since Chapter 10: esbuild can't bundle Playwright's `chromium-bidi`. Scheduled routines couldn't run locally. | `build.external` for Playwright in `trigger.config.ts`, as the Trigger.dev skill advises. A run succeeded. |
| 2   | Medium (setup)         | Tests used a hard-coded database while `pnpm db:migrate` used `.env`; anyone who changed the port got failing tests.                             | Tests read `DATABASE_URL` from the environment, else from `.env` (only that value), else the default.      |
| 3   | Medium (privacy)       | The first screenshots, from the developer's account, showed a real name and email.                                                               | A showcase account (Ada Lovelace, `ada@example.com`).                                                      |
| 4   | Low (first impression) | `pnpm install` warned about a blocked install script.                                                                                            | `@depot/cli` (deploy-only) is ignored on purpose.                                                          |
| 5   | Low                    | Chapter 1 linked to a README section that no longer exists.                                                                                      | It links to the setup guide.                                                                               |
| 6   | Low (docs)             | Screenshots at retina size would add 20+ MB.                                                                                                     | Resized to 1440 wide: about 5 MB for 27.                                                                   |

## Accepted trade-offs

- **The Trigger.dev project ref is still edited in a file,** because the
  CLI reads its config before `.env`. The guide says where.
- **Some screenshots show older UI:** the cloud desktop and Runner pairing
  come from Chapter 11, since they need E2B Desktop and a paired computer.
- **No deployment guide:** out of scope by choice.
- **No license file yet:** choosing one is the owner's call.

## Open items

- A **license** (for example MIT) before sharing widely.
- **Approvals with MCP tools:** after an approval, Claude sometimes asks
  for the same call again (the result reaches it as a user message). Worth
  passing the result as a real tool result.
- Usage and cost tracking (`usage_records` exists), and browser end-to-end
  tests in CI.
- `docs/REBUILD_PROJECT_PROMPT.md`: one prompt for the whole project.
