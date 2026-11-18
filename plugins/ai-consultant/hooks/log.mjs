// Writes JOURNEY-LOG.md in the project: a readable timeline of the session, so the
// person testing can see what happened at each station and give feedback on it.
//   node log.mjs prompt | tool | stop      (stdin: the hook's JSON)
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { STATIONS, parse, readBrief, projectDir, current, active } from './journey.mjs';

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
const dir = projectDir(input);
if (!active(dir)) process.exit(0);
const brief = readBrief(dir);
const j = brief ? parse(brief) : null;
const here = j ? current(j) : STATIONS[0];
const at = here ? here.name : 'Done';
const file = join(dir, 'JOURNEY-LOG.md');
const time = new Date().toTimeString().slice(0, 5);
const short = (s = '', n = 160) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const rel = (p = '') => { const r = relative(dir, p); return r && !r.startsWith('..') ? r : p; };
const write = (text) => {
  if (!existsSync(file)) writeFileSync(file, '# Journey log\n\nWhat happened, turn by turn. Written by the consultant plugin; add your own notes anywhere.\n');
  appendFileSync(file, text);
};

// Station changes: compare BRIEF.md's statuses with the last ones we saw.
function stationChanges() {
  if (!j) return '';
  const stateFile = join(dir, '.eai', 'statuses.json');
  let was = {};
  try { was = JSON.parse(readFileSync(stateFile, 'utf8')); } catch {}
  const out = STATIONS.filter((s) => j.status[s.id] && j.status[s.id] !== was[s.id] && was[s.id] !== undefined)
    .map((s) => `- **${s.name} → ${j.status[s.id]}**${here ? `. Now at ${here.name}.` : '.'}\n`);
  mkdirSync(join(dir, '.eai'), { recursive: true });
  writeFileSync(stateFile, JSON.stringify(j.status));
  return out.join('');
}

function describe(name, t = {}) {
  if (/^(Read|Glob|Grep|LS|ToolSearch)$/.test(name)) return '';
  if (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(name)) return `${name === 'Write' ? 'wrote' : 'edited'} \`${rel(t.file_path || t.notebook_path)}\``;
  if (name === 'Bash') return `ran \`${short(t.command, 90)}\``;
  if (name === 'Skill') return `used the ${t.skill} skill`;
  if (name === 'AskUserQuestion') return `asked: ${short((t.questions || []).map((q) => q.question).join(' / '), 140)}`;
  if (/update_plan|TodoWrite/.test(name)) {
    const items = t.items || t.todos || [];
    const now = items.find((i) => i.status === 'in_progress');
    return now ? `plan: working on "${short(now.content || now.activeForm, 90)}"` : '';
  }
  if (/browser|Browser|playwright/.test(name)) return 'checked it in the browser';
  if (/wrap_up/.test(name)) return '';
  return `used ${name.replace(/^mcp__/, '')}`;
}

const kind = process.argv[2];
// Claude's last reply. The Stop hook can run before the final message reaches the
// transcript, so the reply is also picked up at the start of the next turn.
function lastReply() {
  if (input.last_assistant_message) return input.last_assistant_message;
  try {
    for (const l of readFileSync(input.transcript_path, 'utf8').trim().split('\n').reverse()) {
      const d = JSON.parse(l);
      if (d.type === 'user' && typeof d.message?.content === 'string') return '';
      if (d.type === 'assistant') { const t = (d.message?.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(' '); if (t) return t; }
    }
  } catch {}
  return '';
}
const logged = () => (existsSync(file) ? readFileSync(file, 'utf8') : '');

if (kind === 'prompt') {
  const prev = lastReply();
  if (prev && !logged().includes(short(prev, 240))) write(`- **Claude replied**: ${short(prev, 240)}\n`);
  write(`\n### ${time} · You, at ${at}\n> ${short(input.prompt, 400)}\n\n`);
} else if (kind === 'tool') {
  const what = describe(input.tool_name, input.tool_input);
  const changes = stationChanges();
  if (what) {
    // Collapse repeats ("checked it in the browser ×12") instead of adding a line each time.
    const log = existsSync(file) ? readFileSync(file, 'utf8') : '';
    const lines = log.trimEnd().split('\n');
    const m = lines.at(-1)?.match(/^- (\d\d:\d\d) (.*?)(?: ×(\d+))?$/);
    if (m && m[2] === what) {
      lines[lines.length - 1] = `- ${m[1]} ${what} ×${(+m[3] || 1) + 1}`;
      writeFileSync(file, lines.join('\n') + '\n');
    } else write(`- ${time} ${what}\n`);
  }
  if (changes) write(changes);
} else if (kind === 'stop') {
  const reply = input.last_assistant_message || '';
  write(reply ? `- ${time} **Claude replied** (at ${at}): ${short(reply, 240)}\n` : `- ${time} turn ended (at ${at})\n`);
}
