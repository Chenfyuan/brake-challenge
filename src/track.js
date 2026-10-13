// 本地埋点封装：只记在本机 localStorage，不上报任何第三方服务
const KEY = 'brake-events';
export function track(name, data = {}) {
  const ref = new URLSearchParams(location.search).get('ref') || 'direct';
  const e = { name, ref, at: Date.now(), ...data };
  try { const l = JSON.parse(localStorage.getItem(KEY) || '[]'); l.push(e); localStorage.setItem(KEY, JSON.stringify(l.slice(-500))); } catch {}
  window.dispatchEvent(new CustomEvent('brake:track', { detail: e }));
}
export const events = () => JSON.parse(localStorage.getItem(KEY) || '[]');
