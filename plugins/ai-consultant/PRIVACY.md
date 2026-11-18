# AI Consultant: privacy

_Last updated 18 November 2026. AI Consultant is made by Enterprise AI._

**In short:** everything you make stays in your folder. AI Consultant sends nothing anywhere
unless you choose to: by clicking a link, filling in the feedback form, or saying yes to anonymous
usage counts.

## What stays on your computer

The brief (`BRIEF.md`), the prototype, the walkthrough, any files you add and the session log
(`JOURNEY-LOG.md`) are written to the folder you're working in, and nowhere else. Your
conversation is between you and Claude, under [Anthropic's terms](https://www.anthropic.com/legal);
AI Consultant doesn't read or send it.

## What can leave, and only if you choose

| You… | What's sent | To |
|---|---|---|
| Click the link to Enterprise AI at the end | A normal website visit, tagged with where you came from and whether you found it useful (Yes, Somewhat or Not really) | enterpriseaigroup.com |
| Fill in the feedback form | Your answers, and your email if you give it | PostHog, which Enterprise AI uses for analytics |
| Say yes to anonymous usage | Which steps you reach (for example "draft opened"), the plugin version, your operating system, the time, a random ID made on your computer, and whether this is your first project or a later one | PostHog |

Anonymous usage never includes anything you type, file or folder names, client names, the brief
or the prototype. It's off unless you say yes, and you can turn it off at any time by asking Claude
to "turn off anonymous usage", or by running
`node <plugin folder>/hooks/usage.mjs consent no`.
Deleting `~/.ai-consultant/` removes the random ID.

## The design kit

The optional design kit adds skills to Claude. It sends nothing.

## Contact

Questions, or to ask us to delete feedback you sent:
[enterpriseaigroup.com/support](https://www.enterpriseaigroup.com/support).
