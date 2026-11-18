# AI Consultant

**Powered by [Enterprise AI](https://www.enterpriseaigroup.com/?utm_source=github&utm_medium=ai-consultant&utm_campaign=readme)**

Tell Claude the app you want. Before it builds anything, it works like a good consultant: it asks
why, how the work happens today, and how you'll know it worked. Then it shows you a clickable
prototype in your client's brand, with a short recorded walkthrough, in minutes.

```
Consult → Prototype → Build and Go live, with Enterprise AI
```

## Install

In Claude Code (the terminal or the Claude app's Code tab):

```
/plugin marketplace add enterpriseaigroup/ai-consultant
/plugin install ai-consultant@enterprise-ai
```

Optional, for better-looking prototypes:

```
/plugin install ai-consultant-design-kit@enterprise-ai
```

Then open an **empty folder** and say what you'd like to build: *"I want an app for staff leave
requests"*. It only switches on in an empty folder (or one it has started before), so it stays out
of your other projects.

You'll need [Node.js](https://nodejs.org) for the prototype preview and walkthrough.

## What you get

- **A brief** (`BRIEF.md`): the goal, who it's for, how it works today, the outcomes to aim for,
  what's assumed and what's still open. Yours to keep and share.
- **A clickable prototype** of the app: steps for a process, or a single screen for a tool. It
  starts empty like the real thing, with **Fill with sample data** on every step.
- **A walkthrough**: a short recording of the prototype, step by step.

## Privacy

Everything you make stays in your folder. The plugin sends nothing unless you choose to: at the
end it offers a link to Enterprise AI and a short feedback form, and it may ask once whether you're
happy for it to count, anonymously, which steps people reach (never anything you type). Details in
[PRIVACY.md](PRIVACY.md).

## Licence

Apache 2.0. The optional design kit includes skills by Emil Kowalski and Vercel under MIT
(see `plugins/ai-consultant-design-kit/LICENSES`).
