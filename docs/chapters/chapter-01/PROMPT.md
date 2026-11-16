# Chapter 1: Project setup and sign-in

I want to build **Binary**, an open-source personal AI assistant you run on
your own machine: AI coworkers that chat with you, use your apps and do real
work, always asking before anything risky. It will have a web app and a
mobile app. We're starting from an empty folder, and this first step has
nothing to do with AI yet.

Set up the foundation: a **pnpm + Turborepo** monorepo with a **Hono** API, a
**Next.js** web app (Tailwind and shadcn/ui), an **Expo** mobile app, and a
shared package for code they all use. Run **Postgres** in Docker, using the
pgvector image so it's ready for later. Add email and password sign-up and
sign-in with **Better Auth**, served by the API, on both web and mobile.

Things I care about:

- One source of truth: form validation lives in the shared package, so web,
  mobile and the API show the same errors.
- The look is dark only, with one acid-lime accent (`#d1fe17`) for the main
  action. Write the design tokens down in a design-system doc so every later
  screen follows them.
- Code follows the Google TypeScript Style Guide, enforced by ESLint and
  Prettier, and stays simple enough for a beginner to read.
- On the phone, the session is kept in secure storage.
- The API refuses to start with a missing or placeholder auth secret.

Before writing code, show me your plan and folder structure, and ask me
anything that's unclear.

Done when:

- [ ] `pnpm setup` then `pnpm dev` starts Postgres, the API and the web app
- [ ] I can sign up, sign out and sign back in on the web and on my phone, and a wrong password shows an error
- [ ] Signed out, the home page sends me to sign-in; signed in, sign-in sends me home
- [ ] Tests cover the validation and the auth flow against a real database
- [ ] Lint, typecheck, tests and the web build pass, locally and in a CI workflow
