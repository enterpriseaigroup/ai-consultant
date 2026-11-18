---
name: polish
description: The polish pass Claude runs on every new prototype version before the user sees it. A design principles review plus Emil Kowalski's interaction details, fixed straight away. Not for people to call; the consult plugin's hook asks for it.
user-invocable: false
---

# Polish pass

Run this before you show any new version of the prototype. Don't ask the user whether to
do it, and don't talk them through it: they should simply get a prototype that feels good.
Then show it as you normally would.

**Full pass** for the first version, or when a screen is new. **Quick pass** for small
changes: only the screens you changed, and only steps 1, 3 (the five starred principles)
and 4.

## 1. Look at it

Save the draft first: `mkdir -p .eai/drafts && cp prototype/index.html .eai/drafts/v<N>-before.html`.
Then open the prototype in a hidden, headless browser on its own server (this folder's hidden port, from `.eai/ports.json`; see the
Prototype guide), never the Browser pane they're looking at, at 1280px and 390px wide, on each screen. Know the page's job: the slow step from Consult (how it works today), and the measure
from Consult (what good looks like) that it should visibly move.

## 2. Count the styles (full pass)

From the code, not the screenshot, count for the main content: text styles, colours,
button styles, badge styles, radii and icon sizes. Anything not in `DESIGN.md`, or more
than one way of doing the same thing, is a fix.

## 3. Walk the principles

Judge each against the page's job. Note only what fails, with the element and a
measurement. Starred ones are the quick pass.

1. **Hierarchy** ★: is the most important answer the biggest thing? One main action per screen.
2. **Alignment** ★: shared edges between toolbar, content and table; numbers right-aligned.
3. **Repetition** ★: the same thing styled the same everywhere.
4. **Colour** ★: one meaning per colour; colour saved for exceptions; only `DESIGN.md` tokens.
5. **White space** ★: consistent padding; no cramped or empty bands.
6. Contrast: do exceptions stand out from normal rows?
7. Balance: weight spread sensibly, not piled on one side.
8. Proportion: the heaviest marks are on what matters.
9. Rhythm: regular row heights; a scannable status column.
10. Movement: the eye goes first, second, third where the job needs it.
11. Emphasis: a single focal point that answers the main question.
12. Proximity: related things together.
13. Unity: it feels like one system.

## 4. Fix, then check the details

Fix everything you found, without asking. Then the interaction details from `DESIGN.md`:
- every button has a press state (`active:scale-[0.97]`)
- transitions name their properties (transform, opacity), 150–250ms, ease-out
- things appear from `scale(0.95)` and `opacity: 0`, never from nothing
- no animation on actions people repeat all day
- movement wrapped in `motion-safe:`
- empty lists have an empty state, and every action shows a result
- no shadows on cards, panels or tables (only on menus, dialogs and toasts); no border on coloured badges

Look again at both widths, to make sure nothing broke. Then reload it on its first screen, so that's what they see.

## 5. Record it

Append to `JOURNEY-LOG.md`:

```
- Polish pass (v<N>, full|quick): <3–6 short bullets: what you fixed>
```

Mention it to the user only if they ask what changed.
