/* маленькая обвязка CDP: запустить headless-Chrome, выполнить JS на странице */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function chromeSession() {
  const BIN = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
               '/Applications/Chromium.app/Contents/MacOS/Chromium'].find(existsSync);
  if (!BIN) throw new Error('Chrome не найден');
  const PORT = 9200 + Math.floor(Math.random() * 700);
  const proc = spawn(BIN, ['--headless=new', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${join(tmpdir(), 'tts-cdp-' + PORT)}`, '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--hide-scrollbars', '--force-color-profile=srgb', '--allow-file-access-from-files',
    '--disable-lcd-text', 'about:blank'], { stdio: 'ignore' });
  let wsUrl = null;
  for (let i = 0; i < 90 && !wsUrl; i++) { await sleep(250);
    try { wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl; } catch {} }
  if (!wsUrl) { proc.kill(); throw new Error('Chrome не поднялся'); }
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const errs = [];
  ws.onmessage = e => { const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
    else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const send = (method, params = {}, s) => new Promise((res, rej) => {
    const msg = { id: ++id, method, params, ...(s ? { sessionId: s } : {}) };
    pending.set(msg.id, { res, rej }); ws.send(JSON.stringify(msg)); });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId); await send('Runtime.enable', {}, sessionId);
  const ev = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value; };
  return { send, ev, sessionId, errs, close: () => { ws.close(); proc.kill(); } };
}
