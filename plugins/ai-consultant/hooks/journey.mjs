// The journey lives in BRIEF.md: one section per station, each heading ending in
// its status ("## 01 Consult · agreed"). Claude edits the file; these hooks read it
// to say where we are, draw the line, and refuse to move on before a station's
// evidence is there. Nothing else holds state.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const STATIONS = [
  { id: 1, name: 'Consult', guide: '01-consult.md' },
  { id: 2, name: 'Prototype', guide: '02-prototype.md' },
  { id: 3, name: 'Build', guide: '03-build.md' },
  { id: 4, name: 'Go live', guide: '04-go-live.md' },
];
export const PASSED = new Set(['agreed', 'skipped', 're-check']);
const HEADING = /^##\s+0?([1-4])\s+[^\n·]*?·\s*(open|agreed|skipped|re-check)\s*$/gim;

export const projectDir = (input = {}) => process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

// The plugin only acts in a consult folder: one with a journey (BRIEF.md), or one that was
// empty when a session started. Anywhere else, installed globally, it stays out of the way.
export const active = (dir) => existsSync(join(dir, 'BRIEF.md')) || existsSync(join(dir, '.eai', 'consult'));
export function claimIfEmpty(dir) {
  try {
    if (active(dir) || readdirSync(dir).some((f) => !f.startsWith('.'))) return active(dir);
    mkdirSync(join(dir, '.eai'), { recursive: true });
    writeFileSync(join(dir, '.eai', 'consult'), 'This folder started empty, so the EAI consultant is on here.\n');
    return true;
  } catch { return false; }
}

export function readBrief(dir) {
  const p = join(dir, 'BRIEF.md');
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

// { status: {1: 'agreed', ...}, body: {1: '...'}, extra: {assumed, parked} }
export function parse(text) {
  const status = {}, body = {}, marks = [];
  for (const m of text.matchAll(HEADING)) marks.push({ id: +m[1], status: m[2].toLowerCase(), at: m.index, end: m.index + m[0].length });
  const other = [...text.matchAll(/^##\s+(Assumed|Parked|Clients|Open questions)\s*$/gim)].map((m) => ({ key: m[1].toLowerCase(), at: m.index, end: m.index + m[0].length }));
  const all = [...marks, ...other].sort((a, b) => a.at - b.at);
  const slice = (x) => { const next = all.find((y) => y.at > x.at); return text.slice(x.end, next ? next.at : text.length).trim(); };
  for (const m of marks) { status[m.id] = m.status; body[m.id] = slice(m); }
  const extra = {};
  for (const o of other) extra[o.key] = slice(o);
  return { status, body, extra };
}

// Bullets that say something: not template placeholders ("- <…>") or "- None".
const bullets = (s = '') => s.split('\n').filter((l) => /^\s*[-*]\s+[^<\s]/.test(l) && !/^\s*[-*]\s+(none|nothing)\b/i.test(l));
const numbered = (s = '') => s.split('\n').filter((l) => /^\s*\d+[.)]\s+\S/.test(l));
const tableRows = (s = '') => s.split('\n').filter((l) => /^\s*\|/.test(l)).slice(2)
  .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
const filled = (c) => c && !/^(\?|-|–|tbc|tbd|unknown)$/i.test(c);

function hasAppFiles(dir) {
  const skip = new Set(['BRIEF.md', 'DESIGN.md', 'JOURNEY-LOG.md', 'prototype', '.claude', '.eai', '.git', 'node_modules', '.DS_Store']);
  try { return readdirSync(dir).some((f) => !skip.has(f)); } catch { return false; }
}

// What a station needs before it can be marked agreed. Returns '' when it's there.
export function missing(id, j, dir) {
  const b = j.body[id] || '';
  switch (id) {
    case 1: {
      const goal = (b.match(/\*\*Goal:\*\*[ \t]*([^<\s].*)/i) || [])[1] || '';
      if (goal.split(/\s+/).length < 6) return 'a one-sentence goal (**Goal:** …) that names the business reason, not just the app';
      if (!/\*\*Who:\*\*\s*[^<\s]/i.test(b)) return 'who it\'s for (**Who:** …)';
      if (!/no current process/i.test(b) && numbered(b).length < 3) return 'at least three steps of how the work happens today (a numbered list under "How it works today"), or "No current process"';
      const rows = tableRows(b);
      if (rows.length < 1 || rows.length > 3) return 'one to three measures in the table (Measure | Today | Target)';
      const bad = rows.find((r) => !filled(r[0]) || !filled(r[1]) || !filled(r[2]));
      return bad ? `today's number and a target for "${bad[0] || 'each measure'}" (if they don't know, offer typical numbers, mark them "(assumed)" and add them under Assumed)` : '';
    }
    case 2:
      if (!/\*\*Shape:\*\*\s*[^<\s]/i.test(b)) return 'its shape (**Shape:** a process or a tool, and why)';
      if (numbered(b).length < 1) return 'what it does (a numbered list under "What it does": the steps of a process, or the main things people do in a tool)';
      return existsSync(join(dir, 'prototype')) ? '' : 'a clickable draft in prototype/ that the user has seen';
    case 3:
      return hasAppFiles(dir) ? '' : 'the app itself, built outside prototype/';
    case 4:
      return /\*\*How to open it:\*\*\s*[^<\s]/i.test(b) ? '' : 'how the user opens or runs it (**How to open it:** …)';
  }
  return '';
}

// "**Rails:** off" in BRIEF.md: the user wants to drive. Gates open, reminders stop.
export const railsOff = (text) => /^\*\*Rails:\*\*\s*off\b/im.test(text || '');

export const passed = (j, id) => PASSED.has(j.status[id]);
export const current = (j) => STATIONS.find((s) => !passed(j, s.id));

// "Consult ✓ · **Prototype** · Build · Go live"
export function line(j, { bold = true } = {}) {
  const here = current(j);
  return STATIONS.map((s) => {
    if (here && s.id === here.id) return bold ? `**${s.name}**` : `▶ ${s.name}`;
    const st = j.status[s.id];
    return st === 'agreed' ? `${s.name} ✓` : st === 'skipped' ? `${s.name} ↷` : st === 're-check' ? `${s.name} ↺` : s.name;
  }).join(' · ');
}

export { bullets };
