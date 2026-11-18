// Records the walkthrough of a draft built on the app shell, with no script to write. It plays like
// a short reel: a card says what happens next ("Add the certified drawings"), then that step plays
// at a calm pace, then the next card, and so on.
// On each step it fills the sample data, adds every document, signs off, then moves on.
// Run from .eai/rec:   node walkthrough.mjs   (BASE_URL defaults to this folder's hidden port, from .eai/ports.json)
// Writes prototype/happy-path.html, which the shell's "Watch how it works" button opens.
// Card words come from each step's "walk" in app.json (under seven words), or its label.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const hidden = (() => { try { return JSON.parse(readFileSync(join(here, '..', 'ports.json'), 'utf8')).hidden; } catch { return 8898; } })();
process.env.BASE_URL ||= `http://localhost:${hidden}`;
process.env.RR_OUT ||= join(here, 'out');
const OUT = process.env.RR_OUT;
const proto = join(here, '..', '..', 'prototype');
const app = JSON.parse(readFileSync(join(proto, 'app.json'), 'utf8'));
// Loaded after the settings above: the recorder reads them when it loads.
const { record } = await import('html-recording');
const pkg = join(here, 'node_modules', 'html-recording');
const pdf = { name: 'sample.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%sample\n') };

let begun = 0; // when recording began: the take's own clock starts here
const marks = []; // one per step: when it starts and ends, and when something happens in it (page clock)
await record('happy-path', async (r) => {
  const { page } = r;
  await r.goto('/index.html?rec=1'); // ?rec hides the shell's own Watch button in the clip
  await page.waitForSelector('[data-step] h2', { timeout: 15000 });
  await page.waitForTimeout(1200);
  await r.start();
  begun = Date.now() - 200; // start() waits 200 ms after the first event
  for (let i = 0; i < Math.min(app.steps.length, 8); i++) {
    const m = { i, start: Date.now(), acts: [] };
    marks.push(m);
    const act = async (fn) => { m.acts.push(Date.now()); await fn(); };
    const step = page.locator('[data-step]');
    await r.wait(1500); // a moment to take in the screen before anything moves
    const sample = step.locator('[data-sample]');
    if (await sample.count()) await act(() => r.click(sample.first(), { after: 2200 }));
    // Any document still missing gets added; any the check flags gets a second, fixed upload, so
    // the clip shows the check catching a problem and it being put right.
    for (let pass = 0; pass < 2; pass++) {
      const docs = await step.locator('[data-doc]').evaluateAll((els, p) => els
        .filter((e) => p === 0 ? /not added/i.test(e.closest('div.flex')?.parentElement?.textContent || '') : /fixing/i.test(e.closest('div.flex')?.parentElement?.textContent || ''))
        .map((e) => e.dataset.doc), pass);
      for (const name of docs) {
        const input = step.locator(`[data-doc="${name.replace(/["\\]/g, '\\$&')}"]`);
        if (await input.count()) await act(async () => { await input.setInputFiles(pdf); await r.wait(1100); });
      }
      if (docs.length) await r.wait(900);
    }
    const accept = step.locator('[data-decide]');
    if (await accept.count()) { await act(() => r.click(accept.first(), { after: 2600 })); m.end = Date.now(); break; } // end on the decision, not a reset
    const next = step.locator('[data-next]');
    if (!(await next.count()) || !(await next.isEnabled()) || /finish/i.test((await next.textContent()) || '')) { await r.wait(1500); m.end = Date.now(); break; }
    // Next: if the step holds them back (lines to confirm, a check to accept), do what it asks,
    // the way a person would, then try again. If it still won't move, the reel ends here.
    const at = () => page.locator('[data-steps] [aria-current]').getAttribute('data-go').catch(() => null);
    const was = await at();
    await act(() => r.click(next, { after: 700 }));
    if (await at() === was && was !== null) {
      const asks = step.locator('button:visible').filter({ hasText: /^(confirm|accept|approve|looks right|mark as checked|use this|done)\b/i });
      for (let n = 0, c = await asks.count(); n < Math.min(c, 10); n++) {
        const b = asks.first();
        if (!(await b.count())) break;
        await act(() => r.click(b, { after: 450, duration: 380 }));
      }
      await act(() => r.click(step.locator('[data-next]'), { after: 700 }));
      if (await at() === was) { m.end = Date.now(); break; }
    }
    m.end = Date.now();
    await r.wait(600);
  }
  await r.wait(1200);
}, { viewport: { width: 1280, height: 720 } }); // 16:9, so it fills the reel's frame

const out = join(proto, 'happy-path.html');
const bin = join(pkg, 'cli.mjs');
const take = join(OUT, 'happy-path.json');
const rec = JSON.parse(readFileSync(take, 'utf8'));
const duration = rec.meta?.duration ?? (Date.now() - begun);
const ms = (t) => Math.max(0, Math.min(duration, t - begun));

// No camera moves for now: following the mouse looked jumpy. The window stays whole and still.
// (To bring zooms back, add { id, start, end, scale, follow, move } entries here.)
const zooms = [];
writeFileSync(join(OUT, 'happy-path.edit.json'), JSON.stringify({ version: 1, trim: { start: 0, end: duration }, cuts: [], speeds: [], crop: null, zooms, captions: [] }, null, 2));

const reelsWork = existsSync(join(pkg, 'tools', 'reel.mjs'));
if (reelsWork) {
  // Card, then the step it describes; a short opener and outro around them.
  const scenes = [{ id: 'open', type: 'opener', title: app.name, sub: 'How it works', duration: 2800 }];
  for (const m of marks) {
    const s = app.steps[m.i];
    scenes.push({ id: `c${m.i}`, type: 'card', text: s.walk || s.label, duration: 2400 });
    scenes.push({ id: `d${m.i}`, type: 'demo', take: 'happy-path.json', window: 0.94, from: ms(m.start), to: m.end ? ms(m.end) : duration });
  }
  scenes.push({ id: 'end', type: 'outro', text: app.name, duration: 2200 });
  const reel = join(OUT, 'happy-path.reel.json');
  writeFileSync(reel, JSON.stringify({ version: 1, shape: '16:9', background: 'sand', cards: 'light', brand: { mark: null }, scenes }, null, 2));
  execFileSync(process.execPath, [bin, 'reel', reel, '--single', out], { stdio: 'inherit' });
} else {
  // An older recorder without reels: the plain clip.
  execFileSync(process.execPath, [bin, 'export', take, '--single', out], { stdio: 'inherit' });
}
