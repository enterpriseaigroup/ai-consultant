// Claude Code status line: the journey as a train line, from BRIEF.md.
import { readFileSync } from 'node:fs';
import { parse, readBrief, line } from './journey.mjs';

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
const dir = input.workspace?.current_dir || input.cwd || process.cwd();
const text = readBrief(dir);
console.log(text ? line(parse(text), { bold: false }) : 'Consultant mode · Consult · Prototype · Build · Go live');
