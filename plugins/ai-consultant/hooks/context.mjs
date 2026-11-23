// Runs at the start of a session and before every message. Whatever it prints,
// Claude Code adds to Claude's context: where the journey is, and what's next.
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { STATIONS, parse, readBrief, projectDir, current, line, missing, bullets, railsOff, active, claimIfEmpty } from './journey.mjs';

const root = process.env.CLAUDE_PLUGIN_ROOT || '.';
// The guide for a station, inlined so Claude doesn't need permission to read the plugin folder.
const guide = (s) => { try { return `\n--- Guide for ${s.name} ---\n` + readFileSync(join(root, 'skills/consult/stations', s.guide), 'utf8'); } catch { return ''; } };
// Shared reading for some stations: what the platform would do (Consult, Prototype) and how we make apps (Prototype, Build).
const extra = (s) => [[[1, 2], 'platform.md'], [[2, 3], 'app-principles.md']].filter(([ids]) => ids.includes(s.id)).map(([, f]) => { try { return '\n--- ' + f + ' ---\n' + readFileSync(join(root, 'skills/consult', f), 'utf8'); } catch { return ''; } }).join('');
const template = () => { try { return '\n--- BRIEF.md template ---\n' + readFileSync(join(root, 'skills/consult/brief-template.md'), 'utf8'); } catch { return ''; } };
let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
const dir = projectDir(input);
const starting = input.hook_event_name === 'SessionStart';
if (!(starting ? claimIfEmpty(dir) : active(dir))) {
  if (starting) console.log('The EAI consultant plugin is installed but quiet here, because this folder already has a project in it. If the user wants to build a new app, tool or workflow, use the consult skill; it switches on once you create BRIEF.md.');
  process.exit(0);
}
const text = readBrief(dir);

if (!text) {
  console.log('Consultant mode is on. If the user wants to build, make or automate an app, a tool or a process, follow the consult skill: start at 01 Consult, and create BRIEF.md from the template below once you know the goal. No other files until Consult is agreed or skipped. Your first reply is the welcome in "Open with the two steps we do here" in the consult skill, word for word, which ends with its one question. Every later reply starts with the journey line, so they always know where they are: **Consult** · Prototype · Build · Go live. Keep every reply short.' + guide(STATIONS[0]) + extra(STATIONS[0]) + template());
  process.exit(0);
}

const j = parse(text);

// From Prototype on, the look comes from DESIGN.md in their folder: a copy of the
// plugin's design system that they can read and change.
const reachedPrototype = railsOff(text) || !current(j) || current(j).id >= 2;
let design = '';
let ports = { draft: 8899, hidden: 8898 };
if (reachedPrototype) {
  const dest = join(dir, 'DESIGN.md');
  try { if (!existsSync(join(dir, '.eai', 'clients'))) cpSync(join(root, 'skills/consult/clients'), join(dir, '.eai', 'clients'), { recursive: true }); } catch {}
  // The app shell, refreshed every session so fixes reach them. The Prototype station copies it to prototype/.
  try { cpSync(join(root, 'skills/consult/starter'), join(dir, '.eai', 'starter'), { recursive: true }); } catch {}
  try { cpSync(join(root, 'skills/consult/templates'), join(dir, '.eai', 'templates'), { recursive: true }); } catch {}
  // The walkthrough recorder that setup installed once, linked in so recording starts straight away.
  try {
    const tools = join(homedir(), '.eai-tools', 'node_modules');
    const rec = join(dir, '.eai', 'rec');
    if (existsSync(join(tools, 'html-recording')) && !existsSync(join(rec, 'node_modules'))) { mkdirSync(rec, { recursive: true }); symlinkSync(tools, join(rec, 'node_modules'), 'dir'); }
    mkdirSync(rec, { recursive: true });
    copyFileSync(join(root, 'skills/consult/recorder/walkthrough.mjs'), join(rec, 'walkthrough.mjs'));
  } catch {}
  // This folder's own pair of ports, picked once: the draft (the Browser pane) and the hidden
  // one (checks, polish, recording). Other folders' drafts keep theirs, so nobody hunts for a port.
  const portsFile = join(dir, '.eai', 'ports.json');
  try {
    if (!existsSync(portsFile)) {
      const free = (p) => new Promise((ok) => { const s = createServer().once('error', () => ok(false)).once('listening', () => s.close(() => ok(true))).listen(p, '127.0.0.1'); });
      let p = 18800 + 2 * ([...dir].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 500);
      for (let n = 0; n < 50 && !((await free(p)) && (await free(p + 1))); n++) p = 18800 + ((p - 18800 + 2) % 1000);
      writeFileSync(portsFile, JSON.stringify({ draft: p, hidden: p + 1 }) + '\n');
    }
    ports = JSON.parse(readFileSync(portsFile, 'utf8'));
  } catch {}
  // A preview server for the Claude app's Browser pane, so the draft opens beside the chat.
  const launch = join(dir, '.claude', 'launch.json');
  try {
    if (!existsSync(launch) || !readFileSync(launch, 'utf8').includes(`"${ports.draft}"`)) {
      mkdirSync(join(dir, '.claude'), { recursive: true });
      writeFileSync(launch, JSON.stringify({ version: '0.0.1', configurations: [{ name: 'Clickable draft', runtimeExecutable: 'npx', runtimeArgs: ['-y', 'http-server@14.1.1', 'prototype', '-p', String(ports.draft), '-s', '-c-1'], port: ports.draft, autoPort: false }] }, null, 2) + '\n');
    }
  } catch {}
  try { if (!existsSync(dest)) copyFileSync(join(root, 'skills/consult/design-system.md'), dest); design = ' The prototype is the app shell in .eai/starter, described in prototype/app.json (see the Prototype guide). DESIGN.md has the look for anything custom. Client brands: node .eai/clients/brand.mjs list | add <name or website>.'; } catch {}
  design += ` This folder's ports: the draft is on ${ports.draft} (the Browser pane, "Clickable draft"), the hidden checks on ${ports.hidden}. They're kept free for this folder: use them, don't look for others.`;
}
if (railsOff(text)) {
  console.log(`Rails are off: the user is driving. Journey so far: ${line(j)}. Keep BRIEF.md up to date if it helps; offer to turn the rails back on only if they seem lost.${design}`);
  process.exit(0);
}
const here = current(j);
const out = [`Journey (from BRIEF.md): ${line(j)}`];
if (here) {
  const need = missing(here.id, j, dir);
  out.push(`You're at ${String(here.id).padStart(2, '0')} ${here.name}.${need ? ` Still needed before it can be agreed: ${need}.` : ' It looks ready: check with the user, then mark it agreed.'}`);
} else {
  out.push('Every station is done. Help with changes; if something earlier changes, set that station to re-check.');
}
const recheck = STATIONS.filter((s) => j.status[s.id] === 're-check').map((s) => s.name);
if (recheck.length) out.push(`Re-check with the user: ${recheck.join(', ')}.`);
const assumed = bullets(j.extra.assumed).length;
if (assumed) out.push(`${assumed} assumption${assumed > 1 ? 's' : ''} under Assumed: raise them once, before going live.`);
const parked = bullets(j.extra.parked).length;
if (parked) out.push(`${parked} parked note${parked > 1 ? 's' : ''}: bring each up at its station.`);
out.push('Start every reply with the journey line above (copy it), so they always know where they are. Then keep it short: two to four sentences, then one question. If you keep a task list, name what they\'ll see, not your housekeeping: "Drawing the quantities screen", not "Write the steps into the brief" or "Check it in the hidden browser". Updating BRIEF.md and checking your work happen quietly.' + design);
console.log(out.join('\n') + (here ? guide(here) + extra(here) : ''));
