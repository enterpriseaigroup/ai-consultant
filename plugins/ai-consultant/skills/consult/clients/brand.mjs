#!/usr/bin/env node
// Client brands for prototypes: name, website, logo and colours, in the shape
// Enterprise AI's context.dev lookup returns.
//
//   node brand.mjs list                          what's in the brand pack
//   node brand.mjs add <name or website>… [--out prototype]
//
// "add" looks each client up in the brand pack first. If it isn't there and
// CONTEXT_DEV_API_KEY is set on this computer (team testing only), it asks
// context.dev. It writes <out>/clients.json and copies logos into <out>/clients/.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pack = JSON.parse(readFileSync(join(here, 'clients.json'), 'utf8'));
const args = process.argv.slice(2);
const cmd = args.shift();
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? args.splice(outAt, 2)[1] : 'prototype';
const slug = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const host = (s) => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[/?#].*$/, '');

function foreground(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#111111' : '#FFFFFF';
}

function fromPack(q) {
  const k = q.trim().toLowerCase(), h = host(q);
  return pack.find((b) => b.website === h || b.name.toLowerCase() === k || (b.aliases || []).includes(k));
}

async function fromContextDev(q) {
  const key = process.env.CONTEXT_DEV_API_KEY;
  if (!key) return null;
  const h = host(q);
  const body = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h) ? { type: 'by_domain', domain: h } : { type: 'by_name', name: q.trim() };
  const res = await fetch('https://api.context.dev/v1/brand/retrieve', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, maxSpeed: true, timeoutOpts: { milliseconds: 10000, behavior: 'return-partial' } }),
    signal: AbortSignal.timeout(12000),
  }).catch(() => null);
  if (!res || !res.ok) return null;
  const b = (await res.json().catch(() => ({}))).brand;
  if (!b) return null;
  const hexes = (b.colors || []).map((c) => String(c.hex || '').toUpperCase()).filter((x) => /^#[0-9A-F]{6}$/.test(x));
  const sat = (x) => { const [r, g, bl] = [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16)); const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl); return mx === 0 ? 0 : (mx - mn) / mx; };
  const primary = hexes.find((x) => sat(x) > 0.25) || hexes[0] || '#1D1D1F';
  const logo = (b.logos || []).find((l) => /^https:/.test(l.url || '') && l.mode !== 'dark') || (b.logos || []).find((l) => /^https:/.test(l.url || ''));
  return { name: String(b.title || q), website: String(b.domain || h), aliases: [], sector: '', logoUrl: logo?.url || null,
    logoOnDark: logo?.mode === 'dark', primaryColor: primary, secondaryColor: hexes.find((x) => x !== primary) || null, source: 'context.dev' };
}

if (cmd === 'list') {
  for (const b of pack) console.log(`${b.name.padEnd(26)} ${b.website.padEnd(20)} ${b.primaryColor}  ${b.sector}`);
  process.exit(0);
}
if (cmd !== 'add' || !args.length) { console.error('Usage: node brand.mjs list | add <name or website>… [--out prototype]'); process.exit(1); }

mkdirSync(join(out, 'clients'), { recursive: true });
const file = join(out, 'clients.json');
const clients = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
for (const q of args) {
  const b = fromPack(q) || (await fromContextDev(q));
  if (!b) { console.log(`Not found: "${q}". In the brand pack: ${pack.map((p) => p.name).join(', ')}.`); continue; }
  const id = slug(b.name);
  let logo = null;
  if (b.logo) { logo = `clients/${id}${extname(b.logo)}`; copyFileSync(join(here, b.logo), join(out, logo)); }
  else if (b.logoUrl) {
    const r = await fetch(b.logoUrl, { signal: AbortSignal.timeout(10000) }).catch(() => null);
    if (r?.ok) { const ext = (r.headers.get('content-type') || '').includes('svg') ? '.svg' : '.png'; logo = `clients/${id}${ext}`; writeFileSync(join(out, logo), Buffer.from(await r.arrayBuffer())); }
  }
  const entry = { id, name: b.name, website: b.website, sector: b.sector || '', logo, logoOnDark: !!b.logoOnDark,
    primaryColor: b.primaryColor, primaryForeground: foreground(b.primaryColor), secondaryColor: b.secondaryColor || null, source: b.source };
  const at = clients.findIndex((c) => c.id === id);
  at >= 0 ? (clients[at] = entry) : clients.push(entry);
  console.log(`Added ${b.name} (${b.source})`);
}
writeFileSync(file, JSON.stringify(clients, null, 2) + '\n');
console.log(`${file}: ${clients.map((c) => c.name).join(', ')}`);
