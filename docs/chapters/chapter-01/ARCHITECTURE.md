# Chapter 1: Architecture

Diagrams: [system overview and database](architecture/system-overview.md),
[request flows](architecture/request-flow.md),
[mobile and setup flows](architecture/integration-flow.md).

## The shape of the system

```text
apps/web  (Next.js :3000) ─┐
                           ├─► apps/api (Hono :4000) ─► Better Auth ─► Postgres
apps/mobile (Expo)  ───────┘
                 ▲
packages/shared ─┘ (schemas + constants, imported by all three)
```

- **Clients never talk to the database.** Web and mobile only call the API.
  This stays true for every later chapter.
- **The API owns authentication.** Better Auth is mounted on `/api/auth/*`.
  Both clients use the same endpoints; only how they store the cookie differs.

## How a session travels

| Client               | Where the session lives                        | How it reaches the API                           |
| -------------------- | ---------------------------------------------- | ------------------------------------------------ |
| Web browser          | `better-auth.session_token` cookie (HTTP-only) | Sent automatically with `credentials: 'include'` |
| Web server (Next.js) | Same cookie, readable via `cookies()`          | `getSession()` forwards it in a `cookie` header  |
| Mobile               | `expo-secure-store` (Keychain/Keystore)        | The `expoClient` plugin adds a `Cookie` header   |

## Security choices

- **CORS** allows only `WEB_URL`, with credentials.
- **Trusted origins:** Better Auth rejects requests whose `Origin` is not
  `WEB_URL`, `binary://`, or (outside production) `exp://`.
- **Secrets:** the API validates `BETTER_AUTH_SECRET` (32+ chars) at startup.
  The example file ships a value that fails validation, so nobody runs with a
  public secret by accident.
- **Passwords** are hashed by Better Auth and stored in `account.password`.
- **Rate limiting:** Better Auth's built-in limiter is on in production.

## Why these tools

| Tool                     | Reason                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Hono                     | Small, explicit, Web-standard `Request`/`Response`, so Better Auth mounts with one line. |
| Better Auth              | Works with Hono, Next.js and Expo out of the box; owns its tables.                       |
| Turborepo + pnpm         | One install, one lint/test command, shared packages without publishing.                  |
| Zod in `packages/shared` | The same rules and messages on every device.                                             |
| shadcn/ui                | Readable components copied into the repo; no hidden styling library.                     |

## Known limits (by design, for now)

- Email verification and password reset are not enabled yet.
- Cookies are shared only because web and API both run on `localhost`.
  Deploying them on different domains needs cross-site cookie settings. That
  belongs to the deployment chapter (15).
