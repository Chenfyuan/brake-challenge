import { SURF, ideal } from './physics.js';
export const SHARE_URL = 'https://chenfyuan.github.io/brake-challenge/?ref=share';
export function verdict(s) {
  if (s.state === 'crash') return s.reason === 'pedal' ? '1612 N 达成，踏板已阵亡' : '刹是刹了，就是没刹住';
  if (s.dist <= ideal(s.v0, s.surface) * 1.1) return '教科书级点刹';
  if (s.surface === 'ice') return '冰上舞者';
  if (s.locked) return '轮胎冒烟，好歹活下来了';
  return '稳稳停住，下次再近一点';
}
// 生成 1080×1350 成绩图
export function makeCard(s, plate) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2b1f4a'); g.addColorStop(.6, '#a4507a'); g.addColorStop(1, '#f08a6a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#ffffff22'; x.lineWidth = 3; for (let i = 0; i < 14; i++) { x.beginPath(); x.moveTo(W / 2, H * .62); x.lineTo(i / 13 * W * 1.6 - W * .3, H); x.stroke(); }
  x.fillStyle = '#fff'; x.textAlign = 'left'; x.font = 'bold 44px system-ui,sans-serif'; x.fillText('极限刹车 · 点刹挑战', 80, 120);
  x.font = '32px system-ui,sans-serif'; x.fillStyle = '#ffffffaa'; x.fillText(`${plate} · ${SURF[s.surface].name}路面 · ABS ${s.abs ? '开' : '关'}`, 80, 175);
  x.fillStyle = s.state === 'stop' ? '#ffd29d' : '#ff8b8b'; x.font = 'bold 76px system-ui,sans-serif'; wrap(x, verdict(s), 80, 330, W - 160, 92);
  const dist = s.state === 'stop' ? s.dist.toFixed(1) + ' m' : '—', rows = [['初速', Math.round(s.v0 || s.v * 3.6) + ' km/h'], ['刹车距离', dist], ['最大踏板力', Math.round(s.Fmax) + ' N']];
  rows.forEach(([k, v], i) => { const y = 560 + i * 150; x.fillStyle = '#0005'; rr(x, 80, y - 90, W - 160, 125, 24); x.fill();
    x.fillStyle = '#ffffffb0'; x.font = '34px system-ui,sans-serif'; x.fillText(k, 120, y - 15); x.fillStyle = '#fff'; x.font = 'bold 64px system-ui,sans-serif'; x.textAlign = 'right'; x.fillText(v, W - 120, y - 5); x.textAlign = 'left'; });
  if (s.state === 'stop') { x.fillStyle = '#ffffffcc'; x.font = '30px system-ui,sans-serif'; x.fillText(`得分 ${s.score} · 理论极限 ${ideal(s.v0, s.surface).toFixed(1)} m`, 80, 1040); }
  x.fillStyle = '#fff'; x.font = 'bold 46px system-ui,sans-serif'; x.fillText('你能比我刹得更近吗？', 80, 1170);
  x.fillStyle = '#ffffffcc'; x.font = '30px system-ui,sans-serif'; x.fillText(SHARE_URL.replace('https://', ''), 80, 1235);
  return c;
}
function rr(x, a, b, w, h, r) { x.beginPath(); x.roundRect ? x.roundRect(a, b, w, h, r) : x.rect(a, b, w, h); }
function wrap(x, t, a, y, max, lh) { let line = ''; for (const ch of t) { if (x.measureText(line + ch).width > max) { x.fillText(line, a, y); line = ch; y += lh; } else line += ch; } x.fillText(line, a, y); }
