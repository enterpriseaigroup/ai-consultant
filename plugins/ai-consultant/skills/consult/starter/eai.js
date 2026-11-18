// Where the prototype saves: in this browser only (localStorage). No platform, nothing to set up.
// kit.js calls the same four functions whether the app is a prototype or connected.
const KEY = `prototype:${location.pathname}`;
const keep = (entry) => {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '[]');
    all.push({ at: new Date().toISOString(), ...entry });
    localStorage.setItem(KEY, JSON.stringify(all.slice(-500)));
  } catch { /* private browsing: keep going without saving */ }
  return { ok: true };
};
let M;
const manifest = async () => (M ||= await fetch('./app.json').then((r) => r.json(), () => ({})));

export const EAI = {
  manifest: './app.json',
  where: '', // nothing to name: it's this browser
  client: null, // { id, name } of the client being viewed
  save: async (item, row, meta = {}) => keep({ type: 'save', item, row, client: EAI.client?.id }),
  upload: async (file, { item = 'documents', row = {} } = {}) => keep({ type: 'upload', item, name: file.name, row, client: EAI.client?.id }),
  run: async (event, step) => keep({ type: 'run', event, step }),
  // The assistant answers from app.json: assistant.answers [{ when: "word or phrase", reply }].
  ask: async (message) => {
    const a = (await manifest()).assistant || {};
    const hit = (a.answers || []).find((x) => message.toLowerCase().includes(String(x.when).toLowerCase()));
    return { reply: hit?.reply || a.fallback || 'In the real app I’d answer that from your documents. In this prototype, try asking about one of the steps.' };
  },
};
