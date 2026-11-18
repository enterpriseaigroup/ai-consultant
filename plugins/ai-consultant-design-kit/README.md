# EAI design kit

Reference skills Enterprise AI uses to make designs look better, bundled so anyone gets them.
Install it next to the consultant plugin (`setup.sh --design`), or on its own. Claude picks
each skill up when the task matches; nobody has to call them.

| Skill | What it's for | Source |
|---|---|---|
| `emil-design-eng` | UI polish, component design, animation decisions | Emil Kowalski, MIT |
| `animate`, `review-animations` | Building and reviewing motion | Emil Kowalski, MIT |
| `mobile-native` | Making web apps feel native on phones | Emil Kowalski, MIT |
| `prototype` | Several genuinely different versions behind a picker (good for Shape) | Emil Kowalski, MIT |
| `pick-ui-library` | Choosing the right library for a frontend task | Emil Kowalski, MIT |
| `break-ui` | Worst-case data QA. Hidden: Claude runs it late in Build | Emil Kowalski, MIT (changed to run automatically) |
| `web-interface-guidelines` | Accessibility, forms, focus, loading states, performance | Vercel Labs, MIT |
| `design-principles-review` | The 13 graphic design principles and a style audit | Enterprise AI |
| `clean-copy` | Cutting interface copy that shouldn't exist | Enterprise AI |

Three of Emil's skills (`prototype`, `pick-ui-library`, `review-animations`) were set so only a person could start them. Here Claude can use them on its own, which is the point of the kit. Licences are in `LICENSES/`.
