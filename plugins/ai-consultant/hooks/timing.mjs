// Where the time goes, from Claude Code's own session transcript.
//   node timing.mjs stop     (Stop hook) one line per turn in JOURNEY-LOG.md
//   node timing.mjs report [project dir]   writes TIMING.md: every turn, split into Claude
//                                          thinking, each tool call, and our hooks
// Tool time includes any wait for the person to approve the tool.
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { active, projectDir } from './journey.mjs';

let input = {};
try { if (process.argv[2] === 'stop') input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
const dir = process.argv[3] || projectDir(input);
if (process.argv[2] === 'stop' && !active(dir)) process.exit(0);

function transcriptFor(d) {
  if (input.transcript_path) return input.transcript_path;
  const folder = join(homedir(), '.claude', 'projects', d.replace(/[^a-zA-Z0-9]/g, '-'));
  const files = existsSync(folder) ? readdirSync(folder).filter((f) => f.endsWith('.jsonl')).map((f) => join(folder, f)) : [];
  return files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

const secs = (ms) => (ms >= 60000 ? `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s` : `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`);
const short = (s, n = 70) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
function label(name, i = {}) {
  if (name === 'Bash') return `Bash: ${short(String(i.command || '').replace(/^cd\s+("[^"]*"|\S+)\s*&&\s*/, ''), 60)}`;
  if (name === 'Skill') return `Skill: ${i.skill}`;
  if (/^(Write|Edit|Read)$/.test(name)) return `${name}: ${String(i.file_path || '').split('/').slice(-2).join('/')}`;
  return name.replace(/^mcp__/, '');
}

function analyse(file) {
  const turns = []; let turn = null, last = null; const open = new Map();
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue; let d; try { d = JSON.parse(line); } catch { continue; }
    const ts = d.timestamp ? Date.parse(d.timestamp) : null;
    if (d.type === 'user' && typeof d.message?.content === 'string' && !d.isMeta && !d.message.content.startsWith('<')) {
      turn = { prompt: d.message.content, start: ts, end: ts, model: 0, thinking: 0, tools: [], hooks: 0, out: 0, station: '' };
      turns.push(turn); last = ts; continue;
    }
    if (!turn || !ts) continue;
    if (d.type === 'assistant') {
      turn.model += Math.max(0, ts - last); turn.thinking += d.thinkingDurationMs || 0; turn.out += d.message?.usage?.output_tokens || 0;
      for (const c of d.message?.content || []) {
        if (c.type === 'tool_use') open.set(c.id, { name: c.name, label: label(c.name, c.input), start: ts });
        if (c.type === 'text') { const m = c.text.match(/\*\*(Consult|Prototype|Build|Go live)\*\*/); if (m) turn.station = m[1]; }
      }
    } else if (d.type === 'user' && Array.isArray(d.message?.content)) {
      for (const c of d.message.content) if (c.type === 'tool_result' && open.has(c.tool_use_id)) {
        const t = open.get(c.tool_use_id); open.delete(c.tool_use_id); turn.tools.push({ ...t, ms: ts - t.start });
      }
    } else if (d.type === 'system' && d.subtype === 'stop_hook_summary') {
      turn.hooks += (d.hookInfos || []).reduce((a, h) => a + (h.durationMs || 0), 0);
    } else if (d.type === 'attachment' && d.attachment?.durationMs) turn.hooks += d.attachment.durationMs;
    last = ts; turn.end = Math.max(turn.end, ts);
  }
  // Tool calls that run side by side overlap; count the span they cover, not the sum.
  for (const t of turns) {
    const spans = t.tools.map((x) => [x.start, x.start + x.ms]).sort((a, b) => a[0] - b[0]); let covered = 0, edge = 0;
    for (const [a, b] of spans) { if (b > edge) { covered += b - Math.max(a, edge); edge = b; } }
    t.toolMs = covered; t.wall = t.end - t.start;
  }
  return turns;
}

const file = transcriptFor(dir);
if (!file || !existsSync(file)) { console.error('No session transcript found for ' + dir); process.exit(process.argv[2] === 'stop' ? 0 : 1); }
const turns = analyse(file);

if (process.argv[2] === 'stop') {
  const t = turns.at(-1); if (!t || t.wall < 1000) process.exit(0);
  const slow = [...t.tools].sort((a, b) => b.ms - a.ms).slice(0, 2).map((x) => `${short(x.label, 50)} ${secs(x.ms)}`).join('; ');
  const log = join(dir, 'JOURNEY-LOG.md');
  if (existsSync(log)) appendFileSync(log, `- ⏱ turn took ${secs(t.wall)}: Claude ${secs(Math.max(0, t.wall - t.toolMs))} (~${Math.round(t.out * 0.75).toLocaleString()} words written), tools ${secs(t.toolMs)} (${t.tools.length} calls${slow ? `; slowest ${slow}` : ''}), our hooks ${secs(t.hooks)}\n`);
  process.exit(0);
}

const out = ['# Where the time went', '', `From \`${file.split('/').pop()}\`. "Claude" is thinking and writing; "tools" is time inside tool calls, including waiting for you to approve one. "Words written" counts everything Claude generated, including its thinking. "Hooks" is this plugin's own checks.`, ''];
out.push('| # | Station | You said | Total | Claude | Words written | Tools | Hooks | Slowest call |', '|---|---|---|---|---|---|---|---|---|');
turns.forEach((t, i) => {
  const s = [...t.tools].sort((a, b) => b.ms - a.ms)[0];
  out.push(`| ${i + 1} | ${t.station || ''} | ${short(t.prompt, 40).replace(/\|/g, '/')} | ${secs(t.wall)} | ${secs(Math.max(0, t.wall - t.toolMs))} | ~${Math.round(t.out * 0.75).toLocaleString()} | ${secs(t.toolMs)} | ${secs(t.hooks)} | ${s ? `${short(s.label, 40).replace(/\|/g, '/')} (${secs(s.ms)})` : ''} |`);
});
const all = turns.flatMap((t) => t.tools); const by = new Map();
for (const x of all) { const k = x.label.startsWith('Bash') ? x.label.split(':')[0] + ': ' + x.label.split(': ')[1]?.split(' ')[0] : x.label.split(':')[0]; const e = by.get(k) || { n: 0, ms: 0 }; e.n++; e.ms += x.ms; by.set(k, e); }
out.push('', '## Time by kind of tool', '', '| Tool | Calls | Total |', '|---|---|---|');
[...by].sort((a, b) => b[1].ms - a[1].ms).slice(0, 12).forEach(([k, e]) => out.push(`| ${k.replace(/\|/g, '/')} | ${e.n} | ${secs(e.ms)} |`));
out.push('', '## The 10 slowest calls', '');
[...all].sort((a, b) => b.ms - a.ms).slice(0, 10).forEach((x) => out.push(`- ${secs(x.ms)} · ${x.label.replace(/\|/g, '/')}`));
const total = turns.reduce((a, t) => a + t.wall, 0), tools = turns.reduce((a, t) => a + t.toolMs, 0), hooks = turns.reduce((a, t) => a + t.hooks, 0);
out.push('', `**Overall:** ${secs(total)} across ${turns.length} turns. Claude ${secs(total - tools)}, tools ${secs(tools)}, our hooks ${secs(hooks)}.`);
writeFileSync(join(dir, 'TIMING.md'), out.join('\n') + '\n');
console.log(out.slice(-1)[0]); console.log('Wrote ' + join(dir, 'TIMING.md'));
