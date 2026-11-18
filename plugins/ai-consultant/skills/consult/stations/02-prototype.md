# 02 Prototype

**Goal:** a clickable draft of the app, in minutes. **Done when:** they've agreed what it does, opened it, and said "that's it" (or what to change).
**In BRIEF.md**, under `## 02 Prototype`: `**Shape:**` (a process or a tool, and why, in a line), then `### What it does` (a numbered list: the steps of a process, or the main things people do in a tool), then what the draft shows and what they said.

## When they say yes to a draft, build it

They agreed to see something, so the next thing they see is the draft. Don't propose the steps
and ask again: decide quietly, build, and put your thinking in the message that opens the draft,
where they can react to the real thing. Your first message is one line saying what you're
drawing ("Drawing it now: the drawings, the quantities read from them, pricing, and sign-off.").

Decide in this order:

**1. Is it one of our templates?** Read `.eai/templates/TEMPLATES.md`. If their app is one of
these underneath, start from it and change it to fit them. It's faster, and it gives the build
team something they know. Say so when the draft opens ("I started from our Insurance claim app
and made it yours"); they can say no. If none fits, don't mention templates.

**2. Otherwise, what shape is it?**
- **A process:** something moves through stages and usually between people. An application is lodged, checked and approved; a candidate is screened and shortlisted; a claim is assessed and paid. Draw it as steps.
- **A tool:** people work *in* it rather than pass something along. A spreadsheet, a slide editor, a planner, a dashboard, a calculator. Draw the tool itself, as one screen.
- **Both:** a process with a tool inside one step (an assessor scores applications in a grid). Draw it as steps, and draw that step yourself.

**A process: as few steps as the job needs.** Draw the steps from how it works today and the
slow step. Four is a good shape to aim for: it keeps the first version small, and fewer handoffs
is often the real improvement, so when today's process has seven steps, combine or leave some for
later and say why. But the job decides: if it really needs three or six, use three or six.

**A tool: the screen they'll live in.** Make the one or two things that matter most really work
(typing in a cell recalculates; adding a slide shows it). Everything else can look right without
working yet. Don't invent a "review" or "approval" step to fill a shape.

**3. When it opens,** say what you made in a few lines and ask if it's right. For example:

> Your clickable draft is open on the right. I've made it four steps:
> 1. **Add the drawings**: client and site come from the title block
> 2. **Quantities**: every line read from the drawings, with the sheet it came from
> 3. **Price it**: rates from a sample price list, then your other costs
> 4. **Sign off and send**: in your Excel layout
>
> Is this the right idea?

Then write `**Shape:**` and `### What it does` in BRIEF.md, quietly. Don't ask about each field.

### Fast: open it first, screens arrive

They're waiting, so the draft opens as soon as its steps exist, and the screens you draw yourself
arrive while they look around.

1. Write `app.json` with every step. Steps the shell can't draw get `"kind": "custom"`.
2. Open the draft straight away. The shell's own steps work; each custom step says "Drawing this
   screen…" and fills in by itself when its file lands. Tell them: "Your draft is open. Quantities
   and Price it are being drawn and will appear by themselves in a minute or two."
3. Draw each custom step as its own file, `prototype/screens/<label as a slug>.js` (for
   "Price it", `price-it.js`). **Two or more:** hand each to a background subagent at the same
   time (Agent tool, `run_in_background: true`), with everything it needs in its prompt: the
   app, the step, the sample data, the contract below and `DESIGN.md`. **One:** draw it yourself.
4. When every screen is in, say so in a line ("All four steps are in"), then start the
   walkthrough and the polish pass (below).

Everything you need is in this guide and the example `app.json`; the shell's own code is closed
to you, so don't try to read it. Use this folder's ports (the hook tells you which); don't look
for others or stop servers. When the work really is one thing after another, do it in order and
say what's next in their words.

### Custom screen contract

```js
// prototype/screens/quantities.js
export default (el, step, i, kit) => {
  el.innerHTML = `${kit.head(step)} …your screen… ${kit.nav(i)}`;
  return async () => {     // runs on Next; return false to keep them here
    await kit.EAI.save('quantities', { Lines: 20, 'To check': 4 }, { store: 'records', name: 'Quantities', from: i + 1 });
    return true;
  };
};
export function sample(el, step, i, kit) { /* fill the screen with realistic sample data */ }
```

| `kit.` | What it is |
|---|---|
| `head(step)` | The step's title and goal, as HTML |
| `nav(i)` | The Back and Next buttons, as HTML; put it last |
| `field(f, n, value)` / `read(f, el)` / `fill(f, el, value)` | Draw, read and fill a field, where `f` is a field like those in `app.json` |
| `toast(title, text)` | A short "it worked" message |
| `ctx.data[i]` | What this step has collected; earlier steps' data is in `ctx.data` |
| `EAI.save(item, row, meta)` | Save what the screen collects when they press Next (`meta`: `store` is `records`, `tables` or `files`, `name` is what it's called, `from: i + 1`). Every screen saves something: in Enterprise AI, that's what shows up in Curate |
| `MAIN`, `OUTLINE`, `BADGE`, `esc` | Button and badge classes, and HTML escaping |

**Every screen starts empty, like the real app.** The shell adds "Fill with sample data" to
every step, and on your screens it calls your `sample` export, so a screen file without one is
turned away. Keep the real behaviour: if something is required, Next stops them until it's there,
sample or not. That's how they find out what the app needs.
- When the work is one thing after another, do it in order and say what's next in their words.

## Keep consulting while they click

The draft is where the real consulting starts. Prototyping is cheap and building is expensive,
so every gap you find now saves days later. Your goal is the app that best reaches their
outcomes, so after each version ask the one question that would most change it. Look for:

- **Different people.** Who else touches it, and what do they need to do? A golf app has an
  organiser who sets up the round and players who only enter their own scores; if the draft only
  has the organiser, the app doesn't work. Each kind of person may need their own view or step.
- **Other scenarios.** The common case, then the ones that break it: a second job at once, a
  change halfway through, something missing, a rush job, a correction after sign-off.
- **Bottlenecks.** Where would work pile up? One approver for everything, a step only one person
  can do, waiting on someone outside the business.
- **Gaps against the outcomes.** Walk the draft against each outcome: does this actually get a
  quote out the same morning? If not, what's in the way?

One question at a time, with your best guess attached ("I've assumed only Sam signs off. If Sam's
away, who does?"). Fold the answer into the next version, and note what you learned in BRIEF.md
under the step it changes. Move on to Build only when the questions left wouldn't change the app.

## From Mike's guides (`0_gofer_start`, `gofer_plan`)
- Offer a concrete first version once there's enough context. Make ordinary design choices and explain material assumptions.
- If they say "just show me", show something, with the assumptions clearly identified.

## Added for this line
- **Build on the app shell, don't write a page.** It gives every prototype the same professional frame: the client's brand, a sidebar, our stepper, an assistant, and fields and dialogs that already work. Aim for a few minutes, not a finished app.
  1. First time: `cp -R .eai/starter prototype`. Before each later version: `cp .eai/starter/index.html .eai/starter/kit.js prototype/`. Don't edit `index.html`, `kit.js` or `eai.js`, and don't read them: the example `app.json` and the table below are all you need.
  2. From a template: `cp .eai/templates/<file>.json prototype/app.json`, then make it theirs. Otherwise, describe the app in `prototype/app.json`: `name`, `refPrefix` (like `DA`), `newLabel` (the sidebar button, like "New application"), `assistant` (`greeting`, a few `answers` as `{ "when", "reply" }`, a `fallback`), and its `steps`, each with `label`, `goal` (one sentence in the client's words), `short` (one word for the stepper, if the label's first word doesn't say it), `walk` (the walkthrough's card for this step: what you do here, under seven words, like "Add the certified drawings"), `kind` and `config`:

     | `kind` | For | `config` |
     |---|---|---|
     | `form` | Someone fills something in | `saveAs` (like "Applications"), `fields` (`label`, `type`, `required`, `hint`, `wide`), `sample` (label → realistic example; dates `YYYY-MM-DD`, toggles `Yes`/`No`) |
     | `upload` | Someone adds documents | `saveAs`, `checklist` (`name`, `check`: what makes it right, `sample`: a typical problem the AI check finds the first time), `aiCheck` |
     | `compose` | The AI writes or checks something | `saveAs` |
     | `approval` | Someone signs it off | `approvers` (`name`, `role`); button words `accept` / `sendBack`, recorded as `accepted` / `sentBack`; sending back always confirms first: `confirmTitle`, `confirmText`, `confirmButton`, optional `note` |

     Field types: `text`, `long`, `number`, `email`, `choice` (a few `options`), `search` (a long list of `options`, like staff or suburbs), `date`, `toggle`. Use realistic data from what they told you.
  3. Only if a step really doesn't fit a kind, make it `"kind": "custom"` and draw it as a screen file (see "Fast: open it first" above), using `DESIGN.md` for the look.
  4. **For a tool,** set `"layout": "tool"` in `app.json` and give it one step with `kind` `"custom"`, labelled with what the screen is (like "This month's jobs"). Draw that step as its screen file. The shell keeps the brand, sidebar and assistant, drops the stepper and gives you the full width. Use plain HTML and the shell's look (`DESIGN.md`); no libraries.
  5. Open it in the app's **Browser** pane, on the right of the chat: start the "Clickable draft" preview server (it's set up in `.claude/launch.json`; it serves `prototype/` on this folder's draft port). Don't just paste a link: they won't know to click it. In a terminal with no Browser pane, serve it with `npx -y http-server@14.1.1 prototype -p <draft port> -s` and give them its address. It doesn't work opened as a file.
- The shell's look is fixed and the client's brand tints it. `DESIGN.md` covers anything you draw in a screen file.
- Show the slow step from Consult (how it works today) being fixed, and the measure visibly moving. For a tool, show the slow part of today's work done in seconds (for example, "Shortlist ready: day 2").
- **Show it first, fast. Record and polish behind the scenes.** In one turn, in this order:
  1. Open version 1 in the Browser pane on its first screen as soon as its steps exist; custom screens can still be arriving (see "Fast: open it first"). Tell them it's open on the right and what you made (see "When it opens" above), then on a new line: "Don't see it? Click **Browser** at the top of this window." Then: "A short walkthrough is on its way. Is this the right idea?"
  2. Once every screen is in, start the walkthrough of version 1 as a background command (Bash with `run_in_background: true`): `cd .eai/rec && node walkthrough.mjs`. It walks a process by itself (fills the sample data, adds and fixes the documents, signs off) and writes `prototype/happy-path.html` in about 20 seconds. Start the hidden server first if it isn't running (see below).
  3. Then start the polish pass as a background agent (Agent tool, `run_in_background: true`). Give it everything in its prompt (it can't see this conversation): run the polish skill (`ai-consultant:polish`, a full pass on version 1, a quick pass later) on `prototype/app.json` and `prototype/screens/`, checking with the hidden browser on this folder's hidden port; then, if anything a person would see changed, re-record with `cd .eai/rec && node walkthrough.mjs`.
  4. Tell them in one line as each lands. Walkthrough: "The walkthrough is ready: reload the draft and click **Watch how it works** at the top." Polish, only if something visible changed: "I've tidied a few details and re-recorded the walkthrough: reload to see both."
  - Don't check for the walkthrough file yourself; wait to be told the command or agent has finished. If they ask, check with `test -f prototype/happy-path.html && echo ready || echo "still recording"`.
- **Never drive the Browser pane they're looking at.** Your checks, the polish pass and the recording all use a hidden browser on a second server, started in the background: `npx -y http-server@14.1.1 prototype -p <hidden port> -s -c-1`. The Browser pane is theirs.
- **Your steps must match the screen.** If you tell them how to try it, every button or label you name must exist, with exactly that wording, on the screen where that step happens, in the order they'll meet them. If a step is on another tab or view, say so ("On the Council tab…"). Check this in the hidden browser (the hidden port) before you send it.
- If the design kit is installed, use it: `emil-design-eng` and `web-interface-guidelines` while building, `clean-copy` on every label and message.
- **Show it in their clients' brands.** Add the clients from BRIEF.md (or two from the brand pack if there are none) with `node .eai/clients/brand.mjs add …`. The shell's switcher at the top of the sidebar picks them up. After the walkthrough, ask once: "Want to see it for another client?" Add any client they name; if it isn't in the brand pack, say so and offer one that is.
- Changes here are cheap. Make two or three rounds if they want, then move on.

## Recording the happy path

The walkthrough is the real page replayed (not a video file), as one HTML file they open from the draft's **Watch how it works** button. It plays like a short reel: a card says what happens next (each step's `walk`), then that step plays at a calm pace. It also checks your work: if it can't click through, the steps you'd give them are wrong. Where a step holds people back (lines to confirm, a check to accept), it does what the step asks; if it still can't move on, the reel stops there, so make the happy path clickable.

1. **The recorder is ready:** `.eai/rec/walkthrough.mjs`, with the recorder linked in by setup. If `.eai/rec/node_modules` is missing, install it once: `cd .eai/rec && npm init -y >/dev/null && npm i -D html-recording@0.2.0 && npx html-recording setup`.
2. **The hidden server** (never the Browser pane's draft port): `npx -y http-server@14.1.1 prototype -p <hidden port> -s -c-1`, in the background.
3. **Record:** `cd .eai/rec && node walkthrough.mjs`. It writes `prototype/happy-path.html`. If a custom step needs clicks it can't guess, copy `walkthrough.mjs` and add them where that step is reached.
   **For a tool,** the recorder can't guess what to do: copy it to `.eai/rec/tool-walkthrough.mjs` and replace the loop with the two or three things they'll do most (type a few cells, add a slide), using `r.click`, `r.type` and `r.wait`. Record with `node tool-walkthrough.mjs`, and tell the polish agent to use that command too.
4. **Re-record after every change** to the happy path, the same way.
