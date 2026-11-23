// The app shell. Draws the app from its description (EAI.manifest), in the client's brand, with
// four kinds of step: form · upload · compose · approval (and any step custom.js draws itself).
// A process has steps and a stepper. A tool ("layout": "tool") is one full-width screen, drawn by
// custom.js, with no stepper: a spreadsheet, a slide editor, a planner.
// Each kind saves what it collects through eai.js: in the browser for a prototype, or to the
// platform when connected (the eai-connected add-on swaps in its own eai.js; this file is shared).
// Pickers, dialogs and toasts are UI SDK elements (loaded in index.html), so they get
// keyboard, focus and screen-reader behaviour without any code here.
import { EAI } from './eai.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const slug = (s) => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const BTN = 'inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md text-sm font-medium transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none';
const MAIN = `${BTN} bg-primary text-primary-foreground hover:bg-primary/90`;
const OUTLINE = `${BTN} border bg-background hover:bg-accent`;
const DANGER = `${BTN} bg-destructive text-white hover:bg-destructive/90`;
const BADGE = 'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium';
// Every step offers sample data, so the draft starts empty (like the real app) but can be filled in one click.
const SAMPLE = '<button type="button" class="text-sm underline underline-offset-4 self-start" data-sample>Fill with sample data</button>';
const ICON = { prev: '<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>', next: '<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>' };

const M = await (await fetch(EAI.manifest || './eai.json')).json();
const SAVED = EAI.where ? `Saved in ${EAI.where}` : 'Saved';
const CLIENTS = await fetch('./clients.json').then((r) => (r.ok ? r.json() : []), () => []);
let custom = {};
try { custom = (await import('./custom.js')).steps || {}; } catch { /* no custom steps */ }

// "It worked" messages. The toast() helper isn't in the CDN build, so it comes from esm.sh, and
// its region is added only once that module has defined it (otherwise web.js would define it first).
export let toast = () => {};
import('https://esm.sh/@ui-sdk/web@0.1.0-beta.1/toast')
  .then(() => import('https://esm.sh/@ui-sdk/web@0.1.0-beta.1'))
  .then((m) => {
    document.body.insertAdjacentHTML('beforeend', '<ui-toast-region><template><ui-toast><ui-toast-title></ui-toast-title><ui-toast-description></ui-toast-description></ui-toast></template></ui-toast-region>');
    toast = (title, description) => m.toast.success(title, description ? { description } : {});
  }, () => {});

const ctx = { step: 0, data: M.steps.map(() => ({})), ref: null };
const TOOL = M.layout === 'tool';
// One screen needs no stepper; a tool gets the full width of the page.
if (TOOL || M.steps.length < 2) $('[data-steps]').hidden = true;
if (TOOL) $('[data-flow]').classList.replace('max-w-3xl', 'max-w-none');
document.title = M.name;
document.documentElement.lang = M.locale || 'en-AU';
document.querySelectorAll('[data-app-name]').forEach((e) => { e.textContent = M.name; });

/* ---------- client brand ---------- */
function applyClient(id) {
  const c = CLIENTS.find((x) => x.id === id) || CLIENTS[0] || { id: '', name: M.name, primaryColor: '#18181B', primaryForeground: '#FFFFFF' };
  const r = document.documentElement.style;
  r.setProperty('--primary', c.primaryColor); r.setProperty('--ring', c.primaryColor);
  r.setProperty('--primary-foreground', c.primaryForeground || '#FFFFFF');
  r.setProperty('--accent', `color-mix(in oklch, ${c.primaryColor} 12%, white)`);
  document.querySelectorAll('[data-client-logo]').forEach((i) => { if (c.logo) { i.src = c.logo; i.alt = c.name; i.hidden = false; } else i.hidden = true; });
  document.querySelectorAll('[data-client-name]').forEach((e) => { e.textContent = c.name; });
  EAI.client = c.id ? { id: c.id, name: c.name } : null;
  const url = new URL(location); if (c.id) url.searchParams.set('client', c.id); history.replaceState(null, '', url);
}
const sel = $('[data-client-switch]');
const first = new URLSearchParams(location.search).get('client') || CLIENTS[0]?.id || '';
$('[data-client-items]').innerHTML = CLIENTS.map((c) => `<ui-select-item value="${esc(c.id)}"><span class="flex items-center gap-2">${c.logo ? `<img src="${esc(c.logo)}" alt="" class="size-5 rounded object-contain">` : ''}${esc(c.name)}</span></ui-select-item>`).join('');
sel.setAttribute('default-value', first);
if (CLIENTS.length < 2) $('[data-client-trigger] button').disabled = true;
const restart = () => { ctx.step = 0; ctx.data = M.steps.map(() => ({})); ctx.ref = null; draw(); };
sel.addEventListener('valuechange', (e) => { applyClient(e.detail.value); restart(); greet(); });
applyClient(first);

/* ---------- shell: sidebar, assistant, new ---------- */
const mobile = matchMedia('(max-width: 767px)');
const B = document.body;
const things = M.steps.find((x) => x.config?.saveAs)?.config?.saveAs || 'Submissions';
const one = things.replace(/s$/, '').toLowerCase();
$('[data-where]').textContent = SAVED + (EAI.where ? '' : ' in this browser');
$('[data-new-label]').textContent = M.newLabel || `New ${one}`;
// What's been saved this session, for the list place.
const saved = [];
function track(patch) {
  if (!ctx.ref) return;
  let r = saved.find((x) => x.ref === ctx.ref);
  if (!r) saved.unshift((r = { ref: ctx.ref, client: EAI.client?.name || '', status: 'In progress' }));
  Object.assign(r, patch, { when: new Date().toLocaleString(document.documentElement.lang, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) });
}
const PLACES = [
  { id: 'flow', label: M.name, icon: '<path d="M4 6h16M4 12h16M4 18h10"/>' },
  { id: 'list', label: things, icon: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 10v10"/>' },
];
let place = 'flow';
function show(id) {
  place = id;
  $('[data-places]').innerHTML = PLACES.map((x) => `<button type="button" data-place="${x.id}" class="place flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-sidebar-accent" ${x.id === id ? 'aria-current="page"' : ''}>
    <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${x.icon}</svg><span class="truncate">${esc(x.label)}</span>${x.id === 'list' && saved.length ? `<span class="ml-auto text-xs text-muted-foreground">${saved.length}</span>` : ''}</button>`).join('');
  document.querySelectorAll('[data-place]').forEach((b) => b.addEventListener('click', () => { show(b.dataset.place); if (mobile.matches) B.dataset.sidebar = 'collapsed'; }));
  $('[data-flow]').hidden = id !== 'flow'; $('[data-list]').hidden = id !== 'list';
  $('[data-step-title]').textContent = PLACES.find((x) => x.id === id).label;
  if (id === 'list') listView();
}
function listView() {
  const tone = (st) => (/lodg|accept|approv|submit|done/i.test(st) ? 'bg-emerald-50 text-emerald-700' : /back|return|reject/i.test(st) ? 'bg-amber-50 text-amber-700' : 'bg-muted text-muted-foreground');
  $('[data-list]').innerHTML = `<div class="flex flex-col gap-1"><h2 class="text-base font-semibold">${esc(things)}</h2><p class="text-sm text-muted-foreground">${EAI.where ? `Everything here is also kept in ${esc(EAI.where)}.` : 'Everything saved in this session.'}</p></div>` + (saved.length
    ? `<div class="overflow-x-auto rounded-xl border"><table class="w-full text-sm"><thead><tr class="border-b"><th class="h-10 px-3 text-left font-medium">Reference</th><th class="h-10 px-3 text-left font-medium">${esc(M.steps[0]?.config?.fields?.[0]?.label || 'Details')}</th><th class="h-10 px-3 text-left font-medium">Status</th><th class="h-10 px-3 text-left font-medium">Updated</th></tr></thead><tbody>${saved.map((r) => `<tr class="border-b last:border-0"><td class="p-3 font-medium tabular-nums">${esc(r.ref)}</td><td class="p-3">${esc(r.summary || '')}</td><td class="p-3"><span class="${BADGE} whitespace-nowrap ${tone(r.status)}">${esc(r.status)}</span></td><td class="p-3 whitespace-nowrap text-muted-foreground tabular-nums">${esc(r.when)}</td></tr>`).join('')}</tbody></table></div>`
    : `<div class="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6"><p class="text-sm text-muted-foreground">No ${esc(things.toLowerCase())} yet. Start one and it shows up here.</p><button type="button" class="${OUTLINE}" data-start>${esc($('[data-new-label]').textContent)}</button></div>`);
  $('[data-start]', $('[data-list]'))?.addEventListener('click', () => { restart(); show('flow'); });
}
$('[data-new]').addEventListener('click', () => { restart(); show('flow'); if (mobile.matches) B.dataset.sidebar = 'collapsed'; });
$('[data-toggle-sidebar]').addEventListener('click', () => {
  B.dataset.sidebar = mobile.matches ? (B.dataset.sidebar === 'open' ? 'collapsed' : 'open') : (B.dataset.sidebar === 'collapsed' ? 'expanded' : 'collapsed');
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && B.dataset.sidebar === 'open') B.dataset.sidebar = 'collapsed'; });
document.addEventListener('click', (e) => { if (B.dataset.sidebar === 'open' && !e.target.closest('[data-sidebar-panel], [data-toggle-sidebar], ui-select-content')) B.dataset.sidebar = 'collapsed'; });
// The walkthrough, once it's been recorded next to the draft.
if (!new URLSearchParams(location.search).has('rec')) fetch('./happy-path.html', { method: 'HEAD', cache: 'no-store' }).then((r) => { if (r.ok) $('[data-watch]').hidden = false; }, () => {});
const asst = $('[data-assistant]'), asstBtn = $('[data-toggle-assistant]');
const showAssistant = (on) => { asst.hidden = !on; asstBtn.setAttribute('aria-pressed', String(on)); };
let asstTouched = false;
asstBtn.addEventListener('click', () => { asstTouched = true; showAssistant(asst.hidden); });
showAssistant(!mobile.matches && innerWidth >= 1100);
if (mobile.matches) B.dataset.sidebar = 'collapsed';

/* ---------- steps ---------- */
const nav = (i) => `<div class="flex justify-between">
  <button type="button" class="${OUTLINE}" data-back ${i === 0 ? 'hidden' : ''}>Back</button>
  <button type="button" class="${MAIN} ml-auto" data-next>${i === M.steps.length - 1 ? 'Finish' : `Next: ${esc(M.steps[i + 1].label.toLowerCase())}`}</button></div>`;
const head = (s) => `<div class="flex flex-col gap-1"><h2 class="text-base font-semibold">${esc(s.config?.title || s.label)}</h2>${s.goal ? `<p class="text-sm text-muted-foreground">${esc(s.goal)}</p>` : ''}</div>`;
const nextRef = () => `${(M.refPrefix || M.name.split(' ').map((w) => w[0]).join('')).toUpperCase()}-${String(Date.now()).slice(-4)}`;
const opts = (o) => (Array.isArray(o) ? o : String(o || '').split(',')).map((x) => String(x).trim()).filter(Boolean);
const shown = (x, v) => (x.type === 'date' && v ? new Date(`${v}T00:00`).toLocaleDateString(document.documentElement.lang, { day: 'numeric', month: 'short', year: 'numeric' }) : v);

// One form field, as UI SDK markup. v is the value to start with.
function field(x, n, v) {
  const id = `f${n}`, req = x.required ? ' <span class="text-destructive" aria-hidden="true">*</span>' : '';
  const hint = x.hint ? `<ui-field-description>${esc(x.hint)}</ui-field-description>` : '';
  const err = `<ui-field-error match="false">${esc(x.error || `Add the ${x.label.toLowerCase()}.`)}</ui-field-error>`;
  const wide = x.type === 'long' || x.wide ? 'sm:col-span-2' : '';
  const dv = v ? ` default-value="${esc(v)}"` : '';
  if (x.type === 'toggle') return `<ui-field data-f="${n}" data-row class="sm:col-span-2 rounded-lg border p-4"><div class="flex flex-col gap-1"><ui-field-label>${esc(x.label)}</ui-field-label>${hint}</div>
    <ui-switch aria-label="${esc(x.label)}"${v === 'Yes' ? ' default-checked' : ''}><ui-switch-thumb></ui-switch-thumb></ui-switch></ui-field>`;
  if (x.type === 'date') return `<div data-f="${n}" class="flex flex-col gap-2 ${wide}"><span class="text-sm font-medium" id="${id}-l">${esc(x.label)}${req}</span>
    <ui-date-picker${dv} class="w-full"><div class="flex w-full gap-2"><ui-date-picker-input class="flex-1"><input aria-labelledby="${id}-l"></ui-date-picker-input><ui-date-picker-trigger><button type="button" aria-label="Choose ${esc(x.label.toLowerCase())}"></button></ui-date-picker-trigger></div>
    <ui-date-picker-content hidden><div class="flex items-center justify-between"><ui-calendar-previous><button type="button" aria-label="Previous month" class="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent">${ICON.prev}</button></ui-calendar-previous><ui-calendar-heading class="text-sm font-medium"></ui-calendar-heading><ui-calendar-next><button type="button" aria-label="Next month" class="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent">${ICON.next}</button></ui-calendar-next></div>
    <ui-calendar-grid><ui-calendar-weekdays><template><ui-calendar-weekday></ui-calendar-weekday></template></ui-calendar-weekdays><ui-calendar-weeks><template><ui-calendar-day></ui-calendar-day></template></ui-calendar-weeks></ui-calendar-grid></ui-date-picker-content></ui-date-picker>
    <p data-err class="text-sm text-destructive" hidden>${esc(x.error || `Choose the ${x.label.toLowerCase()}.`)}</p></div>`;
  if (x.type === 'search') return `<div data-f="${n}" class="flex flex-col gap-2 ${wide}"><ui-combobox${dv}><ui-combobox-label>${esc(x.label)}${req}</ui-combobox-label>
    <ui-combobox-input><input placeholder="${esc(x.placeholder || 'Search by name')}"></ui-combobox-input><ui-combobox-content hidden><ui-combobox-list>${opts(x.options).map((o) => `<ui-combobox-item value="${esc(o)}">${esc(o)}</ui-combobox-item>`).join('')}</ui-combobox-list><ui-combobox-empty>Nothing matches.</ui-combobox-empty></ui-combobox-content></ui-combobox>
    <p data-err class="text-sm text-destructive" hidden>${esc(x.error || `Choose the ${x.label.toLowerCase()}.`)}</p></div>`;
  const control = x.type === 'choice'
    ? `<ui-select${dv} placeholder="Choose…"><ui-select-trigger><button><ui-select-value></ui-select-value></button></ui-select-trigger><ui-select-content>${opts(x.options).map((o) => `<ui-select-item value="${esc(o)}">${esc(o)}</ui-select-item>`).join('')}</ui-select-content></ui-select>`
    : x.type === 'long' ? `<ui-textarea><textarea rows="3">${esc(v)}</textarea></ui-textarea>`
    : `<ui-input><input type="${{ number: 'text', email: 'email' }[x.type] || 'text'}"${x.type === 'number' ? ' inputmode="decimal"' : ''} value="${esc(v)}"></ui-input>`;
  return `<ui-field data-f="${n}" class="${wide}"><ui-field-label>${esc(x.label)}${req}</ui-field-label>${control}${hint}${err}</ui-field>`;
}
// Read one field's value back.
function read(x, el) {
  if (x.type === 'toggle') return $('ui-switch', el).checked ? 'Yes' : 'No';
  if (x.type === 'date') return $('ui-date-picker', el).value || '';
  if (x.type === 'search') return $('ui-combobox', el).value || '';
  if (x.type === 'choice') return $('ui-select', el).value || '';
  return $('input,textarea', el).value.trim();
}
function invalid(x, el, bad) {
  if (el.localName === 'ui-field') { el.invalid = bad ? true : undefined; $('ui-field-error', el)?.setAttribute('match', bad ? 'true' : 'false'); }
  else $('[data-err]', el).hidden = !bad;
}
function fill(x, el, v) {
  if (x.type === 'toggle') $('ui-switch', el).checked = v === 'Yes';
  else if (x.type === 'date') $('ui-date-picker', el).value = v;
  else if (x.type === 'search') $('ui-combobox', el).value = v;
  else if (x.type === 'choice') $('ui-select', el).value = v;
  else {
    // Fire the events a person's typing would, so the change is seen by anything listening,
    // including the walkthrough recorder.
    const inp = $('input,textarea', el);
    inp.value = v;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

const KINDS = {
  form(el, s, i) {
    const f = s.config?.fields || [];
    el.innerHTML = `${head(s)}<form class="grid grid-cols-1 gap-4 sm:grid-cols-2" data-form novalidate>${f.map((x, n) => field(x, n, ctx.data[i][x.label])).join('')}</form>
      ${s.config?.sample ? SAMPLE : ''}${nav(i)}`;
    const at = (n) => el.querySelector(`[data-f="${n}"]`);
    $('[data-sample]', el)?.addEventListener('click', () => f.forEach((x, n) => { if (s.config.sample[x.label] != null) { fill(x, at(n), s.config.sample[x.label]); invalid(x, at(n), false); } }));
    return async () => {
      const v = {}, bad = [];
      f.forEach((x, n) => { v[x.label] = read(x, at(n)); const b = x.required && !v[x.label]; invalid(x, at(n), b); if (b) bad.push(n); });
      if (bad.length) { $('input,textarea,button', at(bad[0]))?.focus(); return false; }
      ctx.data[i] = v; ctx.ref = ctx.ref || nextRef();
      if (i === 0) track({ summary: shown(f[0], v[f[0].label]) });
      const row = Object.fromEntries(f.map((x) => [x.label, shown(x, v[x.label])]));
      await EAI.save(slug(s.config?.saveAs || 'submissions'), { Ref: ctx.ref, ...row }, { store: 'records', name: s.config?.saveAs || 'Submissions', from: i + 1 });
      return true;
    };
  },
  upload(el, s, i) {
    const list = s.config?.checklist || [];
    const st = (ctx.data[i].docs = ctx.data[i].docs || {});
    const row = (d) => { const r = st[d.name]; return `<div class="flex items-center justify-between gap-4 py-3 border-b last:border-0">
      <div class="flex flex-col gap-1"><span class="text-sm font-medium">${esc(d.name)}</span>
      ${r ? `<span class="text-xs text-muted-foreground">${esc(r.file)}</span>` : d.check ? `<span class="text-xs text-muted-foreground">Needs to be ${esc(d.check)}</span>` : ''}</div>
      <div class="flex items-center gap-3">${r ? (r.issue ? `<span class="${BADGE} bg-amber-50 text-amber-700">Needs fixing: ${esc(r.issue)}</span>` : `<span class="${BADGE} bg-emerald-50 text-emerald-700">Looks good</span>`) : `<span class="${BADGE} bg-muted text-muted-foreground">Not added</span>`}
      <label class="${OUTLINE} cursor-pointer">${r ? 'Upload new version' : 'Upload'}<input type="file" hidden data-doc="${esc(d.name)}"></label></div></div>`; };
    const paint = () => { el.innerHTML = `${head(s)}<div>${list.map(row).join('')}</div>${list.some((d) => !st[d.name]) ? SAMPLE : ''}${nav(i)}`; bind(); };
    const bind = () => {
      el.querySelectorAll('[data-doc]').forEach((inp) => inp.addEventListener('change', () => { const f = inp.files[0]; if (f) add(list.find((x) => x.name === inp.dataset.doc), f); }));
      $('[data-sample]', el)?.addEventListener('click', async () => { for (const d of list.filter((x) => !st[x.name])) await add(d, new File(['sample'], `${d.name}.pdf`, { type: 'application/pdf' }), true); paint(); wire(el, i); });
    };
    const add = async (d, file, quiet) => {
      const first = !st[d.name];
      const issue = s.config?.aiCheck !== false && first && d.sample ? d.sample : ''; // the prototype's AI check: a typical problem the first time
      st[d.name] = { file: file.name, issue };
      await EAI.upload(file, { item: slug(s.config?.saveAs || 'documents'), row: { Document: d.name, 'AI check': issue ? issue : 'Passed', Ref: ctx.ref || '' }, meta: { store: 'files', name: s.config?.saveAs || 'Documents', from: i + 1 } });
      if (s.config?.aiCheck !== false) await EAI.save('ai-checks', { Ref: ctx.ref || '', Document: d.name, Result: issue ? issue : 'Passed' }, { store: 'tables', name: 'AI check results', from: i + 1 });
      if (!quiet) { paint(); wire(el, i); }
    };
    paint();
    return async () => true;
  },
  compose(el, s, i) {
    const docs = Object.entries(ctx.data.find((d) => d.docs)?.docs || {});
    const todo = docs.filter(([, r]) => r.issue).map(([n, r]) => `${n}: ${r.issue}`);
    const missing = (M.steps.find((x) => x.kind === 'upload')?.config?.checklist || []).filter((d) => !docs.some(([n]) => n === d.name)).map((d) => `${d.name}: not added`);
    const all = [...missing, ...todo];
    const text = all.length ? `Not ready yet. Before you go on, fix:\n${all.map((x) => `• ${x}`).join('\n')}` : 'Everything is here and looks right. Ready to go.';
    ctx.data[i] = { text, ready: !all.length };
    el.innerHTML = `${head(s)}<div class="rounded-lg bg-muted p-4 text-sm whitespace-pre-line">${esc(text)}</div>${nav(i)}`;
    return async () => { await EAI.save(slug(s.config?.saveAs || 'reports'), { Ref: ctx.ref || '', Ready: ctx.data[i].ready ? 'Yes' : 'No', Summary: text.replace(/\n/g, ' ') }, { store: 'records', name: s.config?.saveAs || 'Reports', from: i + 1 }); return true; };
  },
  approval(el, s, i) {
    const c = s.config || {}, who = c.approvers || [];
    const yes = c.accept || 'Accept', no = c.sendBack || 'Send back';
    el.innerHTML = `${head(s)}<div class="flex flex-col gap-2">${who.map((p) => `<div class="text-sm"><span class="font-medium">${esc(p.name)}</span> <span class="text-muted-foreground">· ${esc(p.role)}</span></div>`).join('')}</div>
      <div class="flex gap-2"><button type="button" class="${MAIN}" data-decide="accept">${esc(yes)}</button>
      <ui-alert-dialog data-sendback><ui-alert-dialog-trigger><button type="button" class="${OUTLINE}">${esc(no)}</button></ui-alert-dialog-trigger><ui-alert-dialog-backdrop hidden></ui-alert-dialog-backdrop>
        <ui-alert-dialog-content hidden><ui-alert-dialog-title>${esc(c.confirmTitle || `${no}?`)}</ui-alert-dialog-title><ui-alert-dialog-description>${esc(c.confirmText || 'They’ll be told it needs changes, with your note.')}</ui-alert-dialog-description>
        <ui-field class="mt-4"><ui-field-label>Note</ui-field-label><ui-textarea><textarea rows="4" data-note>${esc(c.note || '')}</textarea></ui-textarea></ui-field>
        <div class="mt-4 flex justify-end gap-2"><ui-alert-dialog-close><button type="button" class="${OUTLINE}">Cancel</button></ui-alert-dialog-close><ui-alert-dialog-close value="confirm"><button type="button" class="${MAIN}">${esc(c.confirmButton || no)}</button></ui-alert-dialog-close></div></ui-alert-dialog-content></ui-alert-dialog></div>
      <p data-done class="text-sm text-muted-foreground" tabindex="-1" hidden></p>${nav(i)}`;
    const decide = async (decision, note) => {
      await EAI.save('decisions', { Ref: ctx.ref || '', Decision: decision, By: who[0]?.name || '', Note: note || '', When: new Date().toLocaleString('en-AU') }, { store: 'tables', name: 'Decisions', from: i + 1 });
      track({ status: decision });
      const p = $('[data-done]', el); p.hidden = false; p.textContent = `${decision}${ctx.ref ? ` · ${ctx.ref}` : ''}. ${SAVED}.`;
      toast(decision, ctx.ref ? `${ctx.ref} · ${SAVED.toLowerCase()}` : SAVED);
      return p;
    };
    $('[data-decide]', el).addEventListener('click', () => decide(c.accepted || 'Accepted'));
    const dlg = $('[data-sendback]', el);
    dlg.addEventListener('openchange', async (e) => {
      if (!e.detail.value && e.detail.returnValue === 'confirm') { const p = await decide(c.sentBack || 'Sent back', $('[data-note]', el).value.trim()); requestAnimationFrame(() => p.focus()); }
    });
    return async () => true;
  },
};

/* ---------- options: one step, drawn two or three ways ---------- */
// A step can carry "options": [{ "name": "One at a time", …what differs: kind, config, goal }].
// A dark pill at the bottom flips between them, so they can try each and say which works. It's
// harness chrome, not part of their app: it looks the same in every draft and never takes the
// client's brand. A custom option is drawn in screens/<label slug>--<option slug>.js.
// The choice sticks in this browser. The walkthrough (?rec) shows the first option, with no pill.
const REC = new URLSearchParams(location.search).has('rec');
const KEY = (s) => `eai-option:${M.name}:${s.label}`;
const chosen = (s) => { const n = REC ? 0 : Number(localStorage.getItem(KEY(s))) || 0; return n < s.options.length ? n : 0; };
function pick(s, n) {
  if (!s?.options?.length) return s;
  if (n === undefined) n = chosen(s);
  const o = s.options[n], x = { ...s, ...o, label: s.label, option: n };
  if (x.kind === 'custom') x.screen = `${slug(s.label)}--${slug(o.name)}`;
  return x;
}
document.head.insertAdjacentHTML('beforeend', `<style>
.proto-picker{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;align-items:center;gap:2px;padding:4px;border-radius:999px;background:rgba(10,10,10,.82);-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);box-shadow:0 0 0 1px rgba(255,255,255,.08) inset,0 8px 24px rgba(0,0,0,.24),0 2px 6px rgba(0,0,0,.12);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;line-height:1;-webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none}
.proto-picker[hidden]{display:none}
.proto-picker-highlight{position:absolute;top:4px;left:0;height:28px;border-radius:999px;background:rgba(255,255,255,.12);will-change:transform}
.proto-picker[data-ready] .proto-picker-highlight{transition:transform 250ms cubic-bezier(.23,1,.32,1),width 250ms cubic-bezier(.23,1,.32,1)}
@media (prefers-reduced-motion:reduce){.proto-picker[data-ready] .proto-picker-highlight{transition:none}}
.proto-picker-item{position:relative;display:flex;align-items:center;height:28px;padding:0 12px;border:0;border-radius:999px;background:transparent;color:rgba(255,255,255,.55);font:inherit;white-space:nowrap;cursor:pointer;transition:color 150ms ease-out}
@media (hover:hover) and (pointer:fine){.proto-picker-item:hover{color:rgba(255,255,255,.85)}}
.proto-picker-item:active{transform:scale(.97)}
.proto-picker-item:focus-visible{outline:2px solid rgba(255,255,255,.4);outline-offset:2px}
.proto-picker-item[data-active]{color:#fff}
</style>`);
document.body.insertAdjacentHTML('beforeend', '<nav class="proto-picker" hidden></nav>');
const PICK = $('.proto-picker');
let pickFor = null;
function picker(s) {
  const on = !REC && !!s.options?.length;
  PICK.hidden = !on;
  $('[data-flow]').style.paddingBottom = on ? '72px' : '';
  if (!on) { pickFor = null; return; }
  if (pickFor !== s.label) {
    pickFor = s.label;
    PICK.removeAttribute('data-ready');
    PICK.setAttribute('aria-label', `Ways to do ${s.label}`);
    PICK.innerHTML = '<span class="proto-picker-highlight" aria-hidden="true"></span>' + s.options.map((o, n) => `<button type="button" class="proto-picker-item" data-option="${n}" title="${n + 1}">${esc(o.name)}</button>`).join('');
    PICK.querySelectorAll('[data-option]').forEach((b) => b.addEventListener('click', () => choose(Number(b.dataset.option))));
    requestAnimationFrame(() => requestAnimationFrame(() => PICK.setAttribute('data-ready', '')));
  }
  const items = [...PICK.querySelectorAll('[data-option]')];
  items.forEach((b, n) => { b.toggleAttribute('data-active', n === s.option); if (n === s.option) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  const a = items[s.option], h = $('.proto-picker-highlight', PICK);
  h.style.width = `${a.offsetWidth}px`; h.style.transform = `translateX(${a.offsetLeft}px)`;
}
function choose(n) {
  const s = M.steps[ctx.step];
  if (!s.options?.[n] || n === chosen(s)) return;
  localStorage.setItem(KEY(s), String(n));
  draw();
}
addEventListener('resize', () => { if (pickFor) picker(pick(M.steps[ctx.step])); });
document.addEventListener('keydown', (e) => {
  const s = M.steps[ctx.step];
  if (!pickFor || !s.options || e.metaKey || e.ctrlKey || e.altKey) return;
  // Only when nothing in their app has focus, so a grid's arrow keys or a typed number stay theirs.
  const f = document.activeElement;
  if (f && f !== document.body && !PICK.contains(f)) return;
  const n = parseInt(e.key, 10), c = chosen(s), len = s.options.length;
  if (n >= 1 && n <= len) choose(n - 1);
  else if (e.key === 'ArrowRight') choose((c + 1) % len);
  else if (e.key === 'ArrowLeft') choose((c - 1 + len) % len);
});

/* ---------- screens drawn one by one ---------- */
// A step with "kind": "custom" can live in screens/<its label as a slug>.js:
//   export default (el, step, i, kit) => { el.innerHTML = …; return async () => true; }
//   export function sample(el, step, i, kit) { …fill the screen with sample data… }
// Until that file exists the step says it's being drawn, and the screen appears by itself when it
// lands, so the draft can open before every screen is finished.
const screens = {};
const file = (s) => s.screen || slug(s.label);
const loadScreen = (s) => import(`./screens/${file(s)}.js?v=${Date.now()}`).then((m) => (screens[file(s)] = m), () => null);
let waiting = null;
function drawing(el, s, i) {
  el.innerHTML = `${head(s)}<div class="flex flex-col gap-3 rounded-lg border border-dashed p-6" aria-live="polite">
    <span class="text-sm font-medium">Drawing this screen…</span>
    <span class="text-sm text-muted-foreground">It appears here by itself in a minute or two. You can look at the other steps meanwhile.</span>
    <div class="flex flex-col gap-2" aria-hidden="true"><div class="h-3 w-2/3 rounded bg-muted motion-safe:animate-pulse"></div><div class="h-3 w-1/2 rounded bg-muted motion-safe:animate-pulse"></div><div class="h-3 w-3/5 rounded bg-muted motion-safe:animate-pulse"></div></div></div>${nav(i)}`;
  clearInterval(waiting);
  waiting = setInterval(async () => { if (await loadScreen(s)) { clearInterval(waiting); if (ctx.step === i) draw(); } }, 2500);
}
M.steps.flatMap((x) => (x.options || [null]).map((_, n) => pick(x, n))).filter((x) => x.kind === 'custom' && !custom[x.label]).forEach(loadScreen);

// Tables need room: while the step on screen has a table (or "wide": true), the page widens.
function fit() {
  if (TOOL) return;
  const s = pick(M.steps[ctx.step]), wide = !!(s?.wide || s?.config?.wide || $('[data-step] table'));
  $('[data-flow]').classList.toggle('max-w-3xl', !wide);
  $('[data-flow]').classList.toggle('max-w-6xl', wide);
  // …and the assistant steps aside for it, unless they opened the assistant themselves.
  if (wide && !asstTouched && !asst.hidden && $('main').clientWidth < 960) showAssistant(false);
}
new MutationObserver(fit).observe($('[data-step]'), { childList: true, subtree: true });

let leave = null;
function wire(el, i) {
  $('[data-back]', el)?.addEventListener('click', () => { ctx.step = i - 1; draw(); });
  $('[data-next]', el)?.addEventListener('click', async () => {
    if (leave && (await leave()) === false) return;
    if (i === M.steps.length - 1) { await EAI.run('finished', i + 1); if (saved[0]?.ref === ctx.ref && saved[0].status === 'In progress') track({ status: 'Submitted' }); restart(); toast('All done', `${SAVED}.`); say('assistant', `All done. ${SAVED}.`); return; }
    ctx.step = i + 1; draw();
  });
}
function draw() {
  const i = ctx.step, s = pick(M.steps[i]), el = $('[data-step]');
  const CHECK = '<svg class="size-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  $('[data-steps]').innerHTML = M.steps.map((x, n) => `<button type="button" class="cs-pill" title="${esc(x.label)}" aria-label="Step ${n + 1}: ${esc(x.label)}" data-go="${n}" ${n === i ? 'aria-current="step"' : ''} ${n < i ? 'data-done' : ''} ${n > i ? 'disabled' : ''}>
    <span class="cs-ring">${n < i ? CHECK : n + 1}</span><span class="cs-label">${esc(x.short || x.label.split(/\s+/)[0])}</span></button>`).join('');
  document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { ctx.step = Number(b.dataset.go); draw(); }));
  clearInterval(waiting);
  const mod = screens[file(s)];
  const draw1 = custom[s.label] || custom[i + 1] || mod?.default || KINDS[s.kind];
  const kit = { EAI, ctx, nav, head, esc, field, read, fill, toast: (...a) => toast(...a), MAIN, OUTLINE, BADGE, SAMPLE };
  leave = draw1 ? draw1(el, s, i, kit) : null;
  if (!draw1 && s.kind === 'custom') drawing(el, s, i);
  else if (!draw1) el.innerHTML = `${head(s)}<p class="text-sm text-destructive">Unknown step kind "${esc(s.kind)}".</p>`;
  fit();
  // A drawn screen's sample data: the same "Fill with sample data" as every other step.
  if (mod?.sample && !$('[data-sample]', el)) {
    const navRow = $('[data-next]', el)?.closest('div');
    (navRow ? navRow.insertAdjacentHTML('beforebegin', SAMPLE) : el.insertAdjacentHTML('beforeend', SAMPLE));
    $('[data-sample]', el).addEventListener('click', () => mod.sample(el, s, i, kit));
  }
  wire(el, i);
  picker(s);
  $('[data-assist-sub]').textContent = `Helping with ${s.label}`;
}

/* ---------- assistant ---------- */
function say(who, text) {
  const box = $('[data-messages]');
  box.insertAdjacentHTML('beforeend', `<div class="max-w-[85%] rounded-lg px-3 py-2 text-sm ${who === 'me' ? 'msg-me self-end' : 'bg-muted self-start'}">${esc(text)}</div>`);
  box.scrollTop = box.scrollHeight;
}
function greet() { $('[data-messages]').innerHTML = ''; say('assistant', M.assistant?.greeting || `Hi, I can help with ${M.name}. Ask me anything about the step you're on.`); }
const askInput = $('[data-ask] [name=q]'), send = $('[data-send]');
askInput.addEventListener('input', () => { send.disabled = !askInput.value.trim(); });
$('[data-ask]').addEventListener('submit', async (e) => {
  e.preventDefault(); const q = e.target.q.value.trim(); if (!q) return; e.target.q.value = ''; send.disabled = true;
  say('me', q); const r = await EAI.ask(q, ctx.step + 1); say('assistant', r.reply || 'Sorry, I couldn’t answer that.');
});

draw(); show('flow'); greet();
EAI.run('opened', 1);
