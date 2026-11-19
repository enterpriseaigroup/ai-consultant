# AI Consultant

**Powered by [Enterprise AI](https://www.enterpriseaigroup.com/?utm_source=github&utm_medium=ai-consultant&utm_campaign=readme)**

Tell Claude the app you want. Before it builds anything, it works like a good consultant: it asks
why, how the work happens today, and how you'll know it worked. Then it shows you a clickable
prototype in your client's brand, with a short recorded walkthrough, in minutes.

```
Consult → Prototype → Build and Go live, with Enterprise AI
```

## Install

**Mac or Linux:** paste this into Terminal.

```
curl -fsSL https://raw.githubusercontent.com/enterpriseaigroup/ai-consultant/main/install.sh | bash
```

**Windows:** paste this into PowerShell.

```
irm https://raw.githubusercontent.com/enterpriseaigroup/ai-consultant/main/install.ps1 | iex
```

It adds AI Consultant to Claude Code, gets the walkthrough recorder ready, and makes an
**AI Consultant** folder. Then open the Claude app, go to **Code**, choose that folder, and say
what you'd like to build: *"I want an app for staff leave requests"*.

You'll need [Claude Code](https://claude.com/claude-code) and [Node.js](https://nodejs.org); the
installer tells you if either is missing. It only changes Claude Code's plugin list and that
folder ([read it first](install.sh) if you like).

**Already in Claude Code?** Paste this into any session instead:

```
/plugin install ai-consultant --marketplace enterpriseaigroup/ai-consultant
```

AI Consultant only switches on in an empty folder (or one it has started before), so it stays out
of your other projects.

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
