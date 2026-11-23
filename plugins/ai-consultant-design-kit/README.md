# EAI design kit

Reference skills Enterprise AI uses to make designs look better, bundled so anyone gets them.
Install it next to the consultant plugin (`setup.sh --design`), or on its own. Claude picks
each skill up when the task matches; nobody has to call them.

| Skill | What it's for | Source |
|---|---|---|
| `emil-design-eng` | UI polish, component design, animation decisions | Emil Kowalski, MIT |
| `animate`, `review-animations` | Building and reviewing motion | Emil Kowalski, MIT |
| `mobile-native` | Making web apps feel native on phones | Emil Kowalski, MIT |
| `break-ui` | Worst-case data QA. Hidden: Claude runs it late in Build | Emil Kowalski, MIT (changed to run automatically) |
| `web-interface-guidelines` | Accessibility, forms, focus, loading states, performance | Vercel Labs, MIT |
| `design-principles-review` | The 13 graphic design principles and a style audit | Enterprise AI |
| `clean-copy` | Cutting interface copy that shouldn't exist | Enterprise AI |

Claude uses these on its own while it drafts; none of them show in your / menu. Licences are in `LICENSES/`.

Install it on its own (the AI Consultant installer already does):

    /plugin install ai-consultant-design-kit --marketplace enterpriseaigroup/ai-consultant
