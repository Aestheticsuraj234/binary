# Request flow: web sign-up, sign-in and protected page

## Sign up / sign in from the browser

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant F as SignUpForm / SignInForm<br/>(client component)
  participant Z as signUpSchema / signInSchema<br/>(packages/shared)
  participant AC as authClient<br/>(better-auth/react)
  participant API as Hono API :4000
  participant BA as Better Auth
  participant DB as Postgres

  U->>F: Fill form, press submit
  F->>Z: safeParse(form data)
  alt invalid
    Z-->>F: first issue message
    F-->>U: Show error above button
  else valid
    F->>AC: signUp.email / signIn.email
    AC->>API: POST /api/auth/sign-up/email<br/>(credentials: include)
    Note over API: CORS allows WEB_URL<br/>with credentials
    API->>BA: auth.handler(request)
    BA->>BA: check Origin is trusted
    BA->>DB: insert user + account (hashed password)<br/>or verify password
    BA->>DB: insert session
    BA-->>API: 200 + Set-Cookie: session_token
    API-->>AC: JSON user + cookie
    AC-->>F: { data, error: null }
    F->>F: router.replace('/') + refresh()
  end
```

## Opening the home page (server-side session check)

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser
  participant N as Next.js server<br/>app/page.tsx
  participant GS as getSession()<br/>lib/session.ts
  participant API as Hono API
  participant DB as Postgres

  B->>N: GET / (cookie: session_token)
  N->>GS: getSession()
  GS->>API: GET /api/auth/get-session<br/>forwarding the cookie header
  API->>DB: look up session by token
  DB-->>API: session + user (or nothing)
  API-->>GS: JSON session or null
  alt no session
    N-->>B: 307 redirect /sign-in
  else signed in
    N-->>B: HTML "Welcome, Suraj."
  end
```

The browser shares cookies across ports on the same host, so the cookie set
by `localhost:4000` is also sent to `localhost:3000`. The Next.js server
forwards it to the API.

## Calling a protected API route

```mermaid
sequenceDiagram
  participant C as Client
  participant MW as session middleware<br/>app.use('/api/*')
  participant R as GET /api/me

  C->>MW: request + cookie
  MW->>MW: auth.api.getSession(headers)
  MW->>R: c.set('session', session)
  alt session is null
    R-->>C: 401 { error: 'Not signed in.' }
  else
    R-->>C: 200 { user }
  end
```
