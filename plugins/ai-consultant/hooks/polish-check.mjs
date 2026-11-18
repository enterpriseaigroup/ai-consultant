// Stop hook: before Claude hands a new prototype version to the user, it has to run
// the polish pass once. It blocks the first stop after the prototype changes, then
// lets the next one through (whatever the polish pass changed counts as polished).
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { readBrief, projectDir, railsOff } from './journey.mjs';

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
const dir = projectDir(input);
const proto = join(dir, 'prototype');
const brief = readBrief(dir);
if (!brief || railsOff(brief) || !existsSync(proto)) process.exit(0);

const hash = createHash('sha1');
const walk = (d) => { for (const f of readdirSync(d).sort()) { if (f.startsWith('.') || f.startsWith('happy-path')) continue; const p = join(d, f); statSync(p).isDirectory() ? walk(p) : hash.update(f).update(readFileSync(p)); } };
walk(proto);
const now = hash.digest('hex');

const stateFile = join(dir, '.eai', 'polish.json');
let s = { hash: null, versions: 0, pending: false };
try { s = { ...s, ...JSON.parse(readFileSync(stateFile, 'utf8')) }; } catch {}
const save = () => { mkdirSync(join(dir, '.eai'), { recursive: true }); writeFileSync(stateFile, JSON.stringify(s)); };

// PostToolUse on Skill or Agent: Claude ran the polish pass, or handed it to a background agent,
// so the next stop goes through.
if (process.argv[2] === 'mark') {
  const t = input.tool_input || {};
  if ((/polish/i.test(t.skill || '') || /polish/i.test(`${t.prompt || ''} ${t.description || ''}`)) && s.hash !== now) { s.versions += 1; s.pending = true; save(); }
  process.exit(0);
}

if (s.pending || input.stop_hook_active) { s.pending = false; s.hash = now; save(); process.exit(0); }
if (s.hash === now) process.exit(0);

s.versions += 1; s.pending = true; save();
const full = s.versions === 1;
try { appendFileSync(join(dir, 'JOURNEY-LOG.md'), `- ${new Date().toTimeString().slice(0, 5)} polish pass started (v${s.versions}, ${full ? 'full' : 'quick'})\n`); } catch {}
console.log(JSON.stringify({
  decision: 'block',
  reason: `This draft (version ${s.versions}) hasn't been polished. Don't make them wait: start a background agent (Agent tool, run_in_background: true) to run the polish skill (ai-consultant:polish, ${full ? 'full pass' : 'quick pass on what changed'}, N=${s.versions}) and re-record the walkthrough if anything visible changes, as the Prototype guide says. Then end your turn.`,
}));
