// The gates. Runs before Claude writes or edits a file; exit code 2 blocks it and
// hands Claude the message.
//   BRIEF.md       a station can only be marked agreed (or skipped) in order, and
//                  only when its evidence is there
//   prototype/     needs 01 Consult passed
//   anything else  in the project needs 01–02 passed (Consult, Prototype)
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { STATIONS, PASSED, parse, readBrief, projectDir, missing, passed, bullets, railsOff, active } from './journey.mjs';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const t = input.tool_input || {};
const dir = projectDir(input);
const file = t.file_path || t.notebook_path || '';
const rel = relative(dir, isAbsolute(file) ? file : resolve(dir, file));
const block = (msg) => {
  try { if (existsSync(join(dir, 'JOURNEY-LOG.md'))) appendFileSync(join(dir, 'JOURNEY-LOG.md'), `- ${new Date().toTimeString().slice(0, 5)} ⛔ held back: ${msg}\n`); } catch {}
  process.stderr.write(msg + ' Don’t work around this with Bash.'); process.exit(2);
};

// The app shell's own code is never worth reading: the Prototype guide's custom screen contract
// has everything, and reading it costs a minute while they wait.
const SHELL = /(^|\/)(kit|eai)\.js$|(^|\/)(prototype|\.eai\/starter)\/index\.html$/;
const shellMsg = 'No need to read the app shell: the custom screen contract in the Prototype guide has everything a screen needs (kit.head, kit.nav, kit.field/read/fill, kit.SAMPLE, kit.toast, ctx.data, EAI.save). Write the screen.';
if (active(dir) && !railsOff(readBrief(dir))) {
  if ((input.tool_name === 'Read' || input.tool_name === 'Grep') && SHELL.test(t.file_path || t.path || '')) block(shellMsg);
  if (input.tool_name === 'Bash' && /\b(cat|sed|grep|rg|head|tail|less|more|awk|nl)\b[^|;&]*\b(kit|eai)\.js\b/.test(t.command || '')) block(shellMsg);
}
if (input.tool_name === 'Read' || input.tool_name === 'Grep') process.exit(0);

// Bash: station statuses only change through Edit or Write, so the checks run.
if (input.tool_name === 'Bash') {
  const cmd = t.command || '';
  if (/BRIEF\.md/.test(cmd) && /·\s*(agreed|skipped|re-check|open)/.test(cmd) && !railsOff(readBrief(dir))) block('Change a station’s status in BRIEF.md with the Edit tool, not Bash, so its checks run.');
  process.exit(0);
}

if (!rel || rel.startsWith('..') || /^\.(claude|eai|git)\b/.test(rel) || rel === 'DESIGN.md' || rel === 'JOURNEY-LOG.md') process.exit(0); // outside the project, tooling, the design system or the log

const before = readBrief(dir);
if (rel !== 'BRIEF.md' && !active(dir)) process.exit(0); // not a consult folder: stay out of the way
if (railsOff(before)) process.exit(0);

if (rel === 'BRIEF.md') {
  let after = before || '';
  if (input.tool_name === 'Write') after = t.content || '';
  else for (const e of t.edits || [t]) {
    if (e.old_string == null) continue;
    after = e.replace_all ? after.split(e.old_string).join(e.new_string) : after.replace(e.old_string, e.new_string);
  }
  const was = before ? parse(before) : { status: {} };
  const now = parse(after);
  for (const s of STATIONS) {
    const st = now.status[s.id];
    if (!PASSED.has(st) || was.status[s.id] === st) continue;
    const earlier = STATIONS.find((e) => e.id < s.id && !PASSED.has(now.status[e.id]));
    if (earlier) block(`Can’t mark ${s.name} ${st} while ${earlier.name} is still open. Go in order, or mark the stations in between as skipped (with the gaps under Assumed).`);
    if (st === 'skipped' && !bullets(now.extra.assumed).length) block(`To skip ${s.name}, write what you’re assuming instead under "## Assumed" (one bullet each).`);
    if (st === 'agreed') {
      const need = missing(s.id, now, dir);
      if (need) block(`${s.name} isn’t ready to be agreed. It still needs ${need}.`);
    }
  }
  process.exit(0);
}

// Every drawn screen starts empty and offers "Fill with sample data", like the shell's own steps.
if (input.tool_name === 'Write' && /^prototype\/screens\/[^/]+\.js$/.test(rel) && !/export\s+(async\s+)?(function|const|let)\s+sample\b/.test(t.content || '')) block('This screen needs sample data: it starts empty like the real app, and the shell adds "Fill with sample data", which calls an exported sample(el, step, i, kit) that fills it. Add that export, and keep required things required.');

if (!before) block('Not yet: there’s no BRIEF.md. Start at Consult with the user, then create BRIEF.md from the template in the consult skill. If they want to skip ahead, create it with the early stations marked skipped and the gaps under Assumed. If they want to drive themselves, create it with **Rails:** off under the title.');
const j = parse(before);
const draft = rel.startsWith('prototype/') || rel === 'prototype';
const need = draft ? 1 : 2;
const open = STATIONS.find((s) => s.id <= need && !passed(j, s.id));
if (open) block(draft
  ? `Not yet: the clickable draft comes after Consult (the goal, how it works today and the measures). ${open.name} is still open in BRIEF.md.`
  : `Not yet: the app is built after they've seen the clickable draft and agreed what it does. ${open.name} is still open in BRIEF.md. Draft files go in prototype/.`);
