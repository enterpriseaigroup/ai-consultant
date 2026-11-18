# Design system

The one place the look comes from: **shadcn/ui with Tailwind's colours**.

The prototype and the app use the same tokens and the same component shapes, so the app
looks like the prototype the user agreed to.

| Station | How |
|---|---|
| 02 Prototype | The app shell (`.eai/starter`), described in `prototype/app.json`. It already uses these tokens. Anything drawn in `custom.js` uses the tokens and recipes below. |
| 03 Build | A real project: Vite, React, Tailwind and shadcn/ui (`npx shadcn@4.23.0 init`, then `npx shadcn@4.23.0 add button card …`). Use the shadcn components, not hand-made ones, with the same tokens. |

## Tokens

shadcn's neutral theme. Status colours come from Tailwind's palette.

| Use | Token or class |
|---|---|
| Page | `bg-background text-foreground` |
| Cards, panels | `bg-card text-card-foreground border`, no shadow |
| Main action | `bg-primary text-primary-foreground` |
| Secondary surfaces | `bg-secondary`, `bg-muted`, `text-muted-foreground` |
| Borders, inputs | `border-border`, `border-input`, focus `ring-ring` |
| Danger | `bg-destructive`, `text-destructive` |
| Success, warning, info | Tailwind `emerald-600`, `amber-500`, `sky-600` (text), and their `-50` shades for backgrounds |
| Corners | `rounded-md` for controls, `rounded-xl` for cards |

No other colours. No hex values in the markup.

## Type and spacing

- **Font:** the system sans stack (`font-sans`). Numbers in tables use `tabular-nums`.
- **Sizes:** `text-2xl` page titles, `text-base` section headings, `text-sm` body and buttons,
  `text-xs` labels and badges. Four sizes, no more.
- **Weights:** `font-normal`, `font-medium`, `font-semibold` only.
- **Spacing:** 8, 12 and 16px, then multiples of 8 (`gap-2`, `gap-3`, `p-4`, `p-6`, `gap-8`).
  4px (`gap-1`) only inside a component, such as a badge or an icon and its label.

## Client themes

An app built for a consultant is sold to their clients, so every prototype can be shown in a
client's brand. The client's colour and logo tint the app; layout, type, neutrals and status
colours stay ours.

| Token | Set to |
|---|---|
| `--primary`, `--ring` | the client's `primaryColor` |
| `--primary-foreground` | the client's `primaryForeground` (black or white, worked out for contrast) |
| `--accent` | `color-mix(in oklch, <primaryColor> 12%, white)` |
| Logo and name | in the header, from `clients.json` |

Status colours (emerald, amber, red, sky) never change with the client.

The shell applies the client's colour and logo; add clients with
`node .eai/clients/brand.mjs add <name or website>…`.

## Component recipes (prototype)

The same classes shadcn's components use, so the build can swap in the real ones.

| Component | Classes |
|---|---|
| Button | `inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md text-sm font-medium transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50` |
| ↳ main | `bg-primary text-primary-foreground shadow-xs hover:bg-primary/90` |
| ↳ secondary | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| ↳ outline | `border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground` |
| ↳ ghost | `hover:bg-accent hover:text-accent-foreground` |
| ↳ danger | `bg-destructive text-white hover:bg-destructive/90` |
| Input | `h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50` |
| Card | `rounded-xl border bg-card text-card-foreground` (no shadow); header `p-6 pb-0`, content `p-6` |
| Badge | `inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium`; default `bg-primary text-primary-foreground`; status `bg-emerald-50 text-emerald-700` (and the amber, sky, red equivalents); outline, for neutral labels only, `border text-foreground` |
| Table | table `w-full text-sm`; th `h-10 px-2 text-left font-medium`; td `p-2 align-middle`; tr `border-b hover:bg-muted/50` |
| Tabs | list `inline-flex h-9 rounded-lg bg-muted p-[3px]`; tab `rounded-md px-3 text-sm font-medium text-muted-foreground`, selected `bg-background text-foreground shadow-xs` |

## Rules

Navigation:
- **The left nav holds places, never steps.** Places are where you go: the app, the things it has
  saved, settings. A workflow's steps go in our stepper, across the top of the content: numbered
  rings, a tick when done, later steps locked, short labels.
- **Chat inputs hold their send button.** The send button is an icon button inside the input's
  border, on the right, disabled until there's text. Never a separate button beside the field.

Surfaces:
- **Shadows only on things that float above the page:** menus, popovers, dialogs, toasts. Cards, panels and tables get a border and no shadow.
- **A coloured badge has no border.** The tint is enough; a grey edge on a coloured fill looks dirty. Only neutral outline badges have a border.

From Emil Kowalski's design engineering (`emil-design-eng`):
- **Buttons respond to a press:** `active:scale-[0.97]`.
- **Animate only `transform` and `opacity`,** naming the properties, never `transition: all`.
- **`ease-out` for things that appear,** 150–250ms. Never `ease-in` for UI.
- **Nothing appears from nothing:** start at `scale(0.95)` and `opacity: 0`, not `scale(0)`.
- **Don't animate things people do many times a day** (list navigation, keyboard actions).
- **Respect reduced motion:** wrap movement in `motion-safe:`.
- **Hover styles only where there's a mouse:** in custom CSS, use `@media (hover: hover)`.

From the design principles review (`design-principles-review`):
- **One clear hierarchy:** one main action per screen, as the only `bg-primary` button.
- **Align to one grid,** and group related things closer than unrelated ones.
- **Repeat, don't invent:** use the recipes above rather than one-off styles.

Content:
- **Realistic sample data:** real-sounding names, plausible numbers, some long values.
- **Every list has an empty state,** and every action has a visible result.
