# Our templates

Apps we've already shaped. When a request is one of these underneath, start from the template:
the consultant gets a draft that's already sound, and the build team gets something they've built
before. Judge by the job, not the words: "an app for supplier tenders" is RFP evaluation; "a
PowerPoint app" is none of these.

| Template | File | Fits when | Not when |
|---|---|---|---|
| Candidate screening | `candidate-screening.json` | Many applicants for a role need reading, scoring against criteria and shortlisting | Rostering, onboarding a hire, or performance reviews |
| Contract review | `contract-review.json` | A document arrives and has to be checked against rules or policy before someone signs it off (contracts, leases, supplier terms) | They're writing the document, not checking one |
| Insurance claim | `insurance-claim.json` | Someone reports an event, adds evidence, it's assessed and a decision is made (claims, incidents, warranty, refunds) | There's no evidence or decision, just logging |
| Client onboarding | `client-onboarding.json` | A new client or customer gives details and ID, they're checked, and someone approves them (KYC, new accounts, new suppliers) | Onboarding staff to systems or training |
| Campaign email | `campaign-email.json` | A brief turns into written content in the brand, signed off before it goes out (emails, newsletters, announcements) | Designing slides or layouts, or sending at volume |
| RFP evaluation | `rfp-evaluation.json` | Several submissions are scored against the same criteria and one is chosen (tenders, grants, vendor selection) | Only one submission, or no scoring |
| Development application | `da-application.json` | An applicant lodges an application with documents that are checked for completeness before an officer accepts it (DAs, permits, licences) | Assessing the merits of an application once it's lodged |

## How to use one

- **One fits:** say so in a line and offer it: "This is close to our Insurance claim app: someone
  reports it, adds evidence, it's assessed and decided. Shall I start from that and make it
  yours?" If they agree, copy it to `prototype/app.json` and make it theirs: their words, their
  fields, their documents, their people, their assistant answers. Change, add or drop steps where
  their process differs. Keep what the template gets right.
- **Close, but not quite:** offer it anyway, and say what you'd change ("…but your assessors
  score in a grid, so I'd draw that step myself").
- **None fits:** say nothing about templates. Build it from the shell's kinds of step if it's a
  process, or draw it as a tool.
- Never squeeze a request into a template to make it fit. A wrong template costs more than
  starting fresh.
