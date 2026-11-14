# Binary design system

One visual direction for every screen: **a calm, near-black workspace with a
single acid-lime accent, where cartoon characters are the stars.** Neutrals
carry the interface; lime marks what matters most; the characters bring the
color and the personality.

## Inspiration

- **Layout and composition:** [Vibrant Design](https://vibrant.design/),
  a curated gallery of modern product UI. Patterns taken: generous whitespace,
  rounded cards, pill badges, quiet borders instead of heavy shadows.
- **Accent:** [Higgsfield](https://higgsfield.ai/)-style acid lime `#D1FE17`.
- **Character-first layout (Ch. 4, part 2):** Grok's companions (a
  character pane that reacts while it talks, picked from a side menu) and
  companion apps' curated rosters. The characters themselves are original.
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

| Component                  | Source                                      |
| -------------------------- | ------------------------------------------- |
| Button                     | shadcn/ui `button`                          |
| Input, Label               | shadcn/ui `input`, `label`                  |
| Card                       | shadcn/ui `card`                            |
| Avatar                     | shadcn/ui `avatar`                          |
| Logo                       | `components/brand/logo.tsx`                 |
| FormField                  | `components/auth/form-field.tsx`            |
| Icons                      | `lucide-react`                              |
| Badge                      | shadcn/ui `badge` (Ch. 3)                   |
| Textarea                   | shadcn/ui `textarea` (Ch. 3)                |
| NativeSelect               | shadcn/ui `native-select` (Ch. 3)           |
| AppSidebar                 | `components/app/app-sidebar.tsx` (Ch. 4)    |
| Character, CharacterAvatar | `components/characters/character.tsx`       |
| CrewCard, CastCard         | `components/characters/character-cards.tsx` |
| SpeechBubble               | `components/characters/speech-bubble.tsx`   |
| ModelBadge                 | `components/agents/model-badge.tsx`         |

Add new shadcn components with:

```bash
cd apps/web
pnpm dlx shadcn@latest add <component>
```

> **Known CLI issue:** in this repo the shadcn CLI sometimes writes
> `import {cn} from "cn"` and installs an unrelated `cn` package. After every
> `add`, check `src/components/ui` imports `@/lib/utils` and run
> `pnpm remove cn` if it appeared in `package.json`.

## Patterns

- **Auth screens:** split layout on desktop (brand panel left, form right);
  form only on phones. Errors appear above the main button in `destructive`.
- **Empty states:** dashed-border card, icon tile, one-line title, one-line
  explanation.
- **Status badges:** pill with border, `text-xs`, small lime icon.
- **App shell (Ch. 4):** a 288px sidebar (`lg` and up): logo, a dashed
  "Hire a character" pill, Discover / Playground / API keys as rounded
  pills (active = `bg-secondary`), **Your crew** with each character's face,
  and a profile card with an icon-only sign-out. Below `lg`, a 56px top bar
  with a menu button opens the same content in a drawer that slides in.
- **Secret values:** never show a full secret; show `•••• last4` in a
  `secondary` badge, and "Not added" in an `outline` badge.
- **Side-by-side comparisons:** equal cards in a `md:grid-cols-3` grid, each
  with its own loading, error and result state.
- **One lime action per screen:** repeated actions (e.g. three Save buttons)
  use the `secondary` variant; lime is kept for the single main action.
- **Characters (Ch. 4):** every agent is shown by its character, never by
  initials. Full body on stages and cards; `CharacterAvatar` (face in a
  round tile tinted with the character's color) in lists and chat. A
  character's color only tints its own panels (`<color>` at about 8–15%
  opacity) and is never used for buttons or text.
- **Moods:** idle, thinking, talking, happy, oops. Show the mood that
  matches what is happening: thinking while waiting, oops on errors.
- **Character cards:** `rounded-3xl`, a tinted stage on top, text below;
  hover lifts the card 4px, tints the border lime and makes the character hop.
- **Speech bubbles:** characters "say" greetings and hints in a
  `SpeechBubble` with a tail pointing at them.
- **Chat:** your messages right in `bg-secondary`, the character's left in a
  bordered card with its face; corners `rounded-3xl` with the corner nearest
  the speaker tightened. Composer is a rounded card with a round lime send
  button; Enter sends.
- **Model badge:** outline, mono: "Anthropic · claude-sonnet-5-5".
- **Selects in a form row:** shadcn's `NativeSelect` wrapper is `w-fit`, so
  give the field wrapper `*:w-full` when the select should fill its column.
- **Destructive actions:** a ghost button that turns `destructive` on hover,
  plus a confirmation, e.g. "Fire Ada".
- **Rounding:** pills (`rounded-full`) for buttons and nav, `rounded-3xl`
  for cards, stages and bubbles. Friendlier than square, still precise.

## Mobile

React Native can't read CSS variables, so `apps/mobile/src/lib/theme.ts`
holds the same values as plain constants. Mobile uses `StyleSheet` with these
constants, not a styling library, to keep setup simple. When a token
changes, update **both** files.

## Motion

Defined in `globals.css`, applied by class:

| Class / element     | Motion                               |
| ------------------- | ------------------------------------ |
| `.character-float`  | 6px bob, 4s loop                     |
| `.character-eyes`   | blink every 5s                       |
| `.character-talk`   | mouth opens and closes while talking |
| `.group:hover` card | character hops once                  |
| `.character-spin`   | Sunny's rays turn, 24s per turn      |
| `.animate-rise`     | chat bubbles rise 8px and fade in    |
| `.animate-slide-in` | phone drawer slides in from the left |

Keep it slow and small, and switch it all off under
`prefers-reduced-motion`.

## Don'ts

- No gradients, glows or neon shadows.
- No more than one accent color for the interface. Character colors are for
  characters and their own tinted panels only.
- No motion outside the table above, and none that loops fast or moves
  layout.
- No realistic or AI-generated avatars: characters are drawn in SVG.
- No custom CSS when a Tailwind class or shadcn component exists.
