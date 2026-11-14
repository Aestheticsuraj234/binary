# Binary design system

One visual direction for every screen: **a calm, near-black workspace with a
single acid-lime accent.** Neutrals carry the interface; lime only marks what
matters most on a screen.

## Inspiration

- **Layout and composition:** [Vibrant Design](https://vibrant.design/),
  a curated gallery of modern product UI. Patterns taken: generous whitespace,
  rounded cards, pill badges, quiet borders instead of heavy shadows.
- **Accent:** [Higgsfield](https://higgsfield.ai/)-style acid lime `#D1FE17`.
- **Components:** [shadcn/ui](https://ui.shadcn.com) as the base;
  [21st.dev](https://21st.dev/) for future patterns that shadcn lacks.

## Color tokens

Defined once as CSS variables in `apps/web/src/app/globals.css` and mirrored
for React Native in `apps/mobile/src/lib/theme.ts`.

| Token                | Value     | Use                                         |
| -------------------- | --------- | ------------------------------------------- |
| `background`         | `#09090b` | Page background                             |
| `card`               | `#111113` | Cards, side panels, inputs on mobile        |
| `foreground`         | `#fafafa` | Main text                                   |
| `muted-foreground`   | `#a1a1aa` | Secondary text, hints                       |
| `secondary`/`accent` | `#1c1c1f` | Hover backgrounds, icon tiles               |
| `border` / `input`   | `#27272a` | Borders and input outlines                  |
| `primary`            | `#d1fe17` | Primary buttons, focus rings, active states |
| `primary-foreground` | `#0a0a0a` | Text on lime                                |
| `destructive`        | `#f87171` | Error text and destructive actions          |

### Rules for lime

1. At most **one** lime button per screen: the main action.
2. Lime is also used for **focus rings** (`ring`) and small **icon accents**.
3. Never use lime for large backgrounds or body text.

## Typography

- **Font:** [Geist Sans](https://vercel.com/font) for UI, Geist Mono for code
  and the logo tile. Loaded from the `geist` package, with no network fetch at build.
- **Scale:**

| Use              | Class                                   |
| ---------------- | --------------------------------------- |
| Page title       | `text-4xl font-semibold tracking-tight` |
| Section/form h2  | `text-2xl font-semibold tracking-tight` |
| Card title       | `font-semibold` (shadcn `CardTitle`)    |
| Body             | `text-sm` / `text-base`                 |
| Secondary text   | `text-sm text-muted-foreground`         |
| Badges, captions | `text-xs`                               |

## Shape and spacing

- **Radius:** `--radius: 0.75rem` (12px). Cards use `rounded-xl`, inputs and
  buttons `rounded-md`.
- **Control height:** `h-10` (40px) on web, 48px on mobile for thumbs.
- **Spacing:** Tailwind's 4px scale. Use `space-y-2` inside a field,
  `space-y-4` between fields, `space-y-8` between sections.
- **Content width:** forms `max-w-sm`; app content `max-w-3xl`.

## Components in use

| Component    | Source                           |
| ------------ | -------------------------------- |
| Button       | shadcn/ui `button`               |
| Input, Label | shadcn/ui `input`, `label`       |
| Card         | shadcn/ui `card`                 |
| Avatar       | shadcn/ui `avatar`               |
| Logo         | `components/brand/logo.tsx`      |
| FormField    | `components/auth/form-field.tsx` |
| Icons        | `lucide-react`                   |

Add new shadcn components with:

```bash
cd apps/web
pnpm dlx shadcn@latest add <component>
```

## Patterns

- **Auth screens:** split layout on desktop (brand panel left, form right);
  form only on phones. Errors appear above the main button in `destructive`.
- **Empty states:** dashed-border card, icon tile, one-line title, one-line
  explanation.
- **Status badges:** pill with border, `text-xs`, small lime icon.

## Mobile

React Native can't read CSS variables, so `apps/mobile/src/lib/theme.ts`
holds the same values as plain constants. Mobile uses `StyleSheet` with these
constants, not a styling library, to keep setup simple. When a token
changes, update **both** files.

## Don'ts

- No gradients, glows or neon shadows.
- No more than one accent color.
- No animations beyond shadcn's defaults.
- No custom CSS when a Tailwind class or shadcn component exists.
