import { createScene } from './scene.js';
import { createSim, step, P } from './physics.js';
import * as A from './audio.js';
const $ = id => document.getElementById(id);
const view = createScene($('c'));
let sim = createSim(), phase = 'menu', acc = 0, last = performance.now(), crashT = 0, endT = 0, plate = '';
const LB_KEY = 'brake-remake-lb';
const lb = () => JSON.parse(localStorage.getItem(LB_KEY) || '[]');
function renderLB() { const l = lb(); $('lb').innerHTML = l.length ? l.map(e => `<li>${esc(e.plate)} <span>${e.score} 分 · ${e.v0}km/h</span></li>`).join('') : '<li style="list-style:none;opacity:.6">暂无成绩，来创造第一条记录</li>'; }
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function saveScore(e) { const l = lb(); l.push(e); l.sort((a, b) => b.score - a.score); localStorage.setItem(LB_KEY, JSON.stringify(l.slice(0, 10))); return l.indexOf(e); }
$('plate').value = localStorage.getItem('brake-plate') || '';
renderLB();
let toastTimer; function toast(m) { $('toast').textContent = m; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 1200); }
function start() {
  A.initAudio(); plate = ($('plate').value.trim() || '粤B·12345').slice(0, 8); localStorage.setItem('brake-plate', plate); view.setPlate(plate);
  sim = createSim(); $('menu').classList.add('hidden'); $('result').classList.add('hidden'); $('hud').classList.remove('hidden');
  $('hint').classList.remove('hidden'); phase = 'countdown'; let n = 3; $('cd').classList.remove('hidden'); $('cd').textContent = n; A.beep();
  const iv = setInterval(() => { n--; if (n > 0) { $('cd').textContent = n; A.beep(); } else { clearInterval(iv); $('cd').textContent = 'GO!'; A.beep(true); phase = 'run'; acc = 0; setTimeout(() => $('cd').classList.add('hidden'), 500); } }, 800);
}
$('start').onclick = start; $('again').onclick = start;
$('home').onclick = () => { $('result').classList.add('hidden'); $('hud').classList.add('hidden'); $('menu').classList.remove('hidden'); phase = 'menu'; renderLB(); };
// 输入：全屏按住 / 刹车键 / 空格
const press = on => { if (phase !== 'run') return; sim.pressed = on; $('brake').classList.toggle('on', on); };
addEventListener('pointerdown', e => { if (phase === 'run' && !e.target.closest('.panel')) { e.preventDefault(); press(true); } }, { passive: false });
addEventListener('pointerup', () => press(false)); addEventListener('pointercancel', () => press(false));
addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) press(true); } if (e.code === 'Enter' && (phase === 'menu' || phase === 'result') && document.activeElement !== $('plate')) start(); });
addEventListener('keyup', e => { if (e.code === 'Space') press(false); });
addEventListener('contextmenu', e => e.preventDefault());
let warned = 0;
function frame(now) {
  requestAnimationFrame(frame); let dt = Math.min(.1, (now - last) / 1000); last = now;
  if (phase === 'run') {
    acc += dt; while (acc >= P.DT && sim.state === 'run') { step(sim); acc -= P.DT; if (sim.warn && now - warned > 1300) { warned = now; toast('车速未到 100 km/h，还不能刹车'); } }
    sim.pitch = (sim.pitch || 0) + ((sim.powerCut ? sim.F / P.BREAK_N * .06 : -.015) - (sim.pitch || 0)) * .15;
    if (sim.powerCut) $('hint').classList.add('hidden');
    if (sim.state !== 'run') end();
  } else if (phase === 'crash') {
    const sdt = dt * (now - crashT < 1600 ? .28 : 1);
    const f = sim.flip; f.t += sdt; f.vy -= 9.8 * sdt; f.y = Math.max(0, f.y + f.vy * sdt); if (f.y === 0) f.vy = Math.abs(f.vy) * .3;
    f.rz += f.wz * sdt; f.rx += f.wx * sdt; f.wz *= .995; f.wx *= .99; f.dx += f.vx * sdt;
    sim.v = Math.max(0, sim.v - 12 * sdt); sim.x = Math.min(sim.x + sim.v * sdt, P.BARRIER - P.NOSE); dt = sdt;
    if (Math.random() < .5) view.emit(f.dx, -sim.x, 3, 4);
    if (now - crashT > 2400 && !endT) { endT = now; showResult(); }
  }
  const kmh = sim.v * 3.6;
  $('spd').textContent = Math.round(kmh); const left = Math.max(0, P.BARRIER - P.NOSE - sim.x);
  $('dst').textContent = Math.round(left); $('dbar').style.width = (sim.x / P.BARRIER * 100) + '%';
  $('gf').style.height = Math.min(100, sim.F / (P.BREAK_N * 1.25) * 100) + '%'; $('fn').textContent = Math.round(sim.F) + ' N';
  $('spd').style.color = kmh >= 100 && !sim.powerCut ? '#7CFFB2' : '#fff';
  A.updateAudio(kmh, !sim.powerCut, phase === 'run' ? sim.F : 0, phase === 'run' || phase === 'crash');
  view.render(sim, dt);
}
function end() {
  press(false);
  if (sim.state === 'crash') {
    phase = 'crash'; crashT = performance.now(); endT = 0; A.boom(); if (sim.reason === 'pedal') A.snap(); view.shake.a = 1.2;
    const hard = sim.v / P.VMAX; sim.F = sim.reason === 'pedal' ? sim.F : 0;
    sim.flip = { t: 0, y: 0, vy: 4 + 8 * hard, rz: 0, wz: (Math.random() < .5 ? -1 : 1) * (4 + 6 * hard), rx: 0, wx: sim.reason === 'barrier' ? 3 + 4 * hard : 1, dx: 0, vx: (Math.random() - .5) * 6 };
    navigator.vibrate?.(300);
  } else { phase = 'stopped'; A.win(); setTimeout(showResult, 900); }
}
function showResult() {
  phase = 'result'; $('result').classList.remove('hidden'); const s = sim;
  if (s.state === 'stop') {
    const rank = saveScore({ plate, score: s.score, v0: Math.round(s.v0), t: +s.tBrake.toFixed(2), d: Math.round(P.BARRIER - P.NOSE - s.x), at: Date.now() });
    $('rt').textContent = '🏁 成功刹停！'; $('rt').style.color = '#7CFFB2';
    $('rd').innerHTML = `得分 <b style="font-size:28px;color:#ffd29d">${s.score}</b>${rank >= 0 && rank < 10 ? `（本机第 ${rank + 1} 名）` : ''}<br>初速 ${Math.round(s.v0)} km/h · 刹车用时 ${s.tBrake.toFixed(2)} s · 距路障 ${(P.BARRIER - P.NOSE - s.x).toFixed(1)} m`;
  } else {
    $('rt').textContent = s.reason === 'pedal' ? '💥 刹车踏板踩断了！' : '💥 撞上路障了！'; $('rt').style.color = '#ff6b6b';
    $('rd').innerHTML = s.reason === 'pedal' ? `力度超过 1612 N，踏板断裂失控翻车。<br>试试点一下松一下，把力度卡在红线下。` : `${s.powerCut ? '刹得不够狠' : '一直没刹车'}，以 ${Math.round(s.curve.at(-1)?.v ?? s.v * 3.6)} km/h 撞上路障。<br>车速过 100 就可以开始点刹。`;
  }
  drawChart(s.curve);
}
function drawChart(c) {
  const cv = $('chart'), x = cv.getContext('2d'), W = cv.width, H = cv.height; x.clearRect(0, 0, W, H);
  x.fillStyle = '#ffffff99'; x.font = '14px sans-serif'; if (c.length < 2) { x.fillText('未进入刹车阶段', 20, 30); return; }
  const T = c.at(-1).t, Vm = Math.max(...c.map(p => p.v)), pad = 30;
  const X = t => pad + (t / T) * (W - pad * 2), Yv = v => H - pad - v / Vm * (H - pad * 2), Yf = f => H - pad - f / (P.BREAK_N * 1.15) * (H - pad * 2);
  x.strokeStyle = '#ff3b3b'; x.setLineDash([6, 4]); x.beginPath(); x.moveTo(pad, Yf(P.BREAK_N)); x.lineTo(W - pad, Yf(P.BREAK_N)); x.stroke(); x.setLineDash([]);
  for (const [k, col, Y] of [['v', '#4fd1c5', Yv], ['F', '#f6ad55', Yf]]) { x.strokeStyle = col; x.lineWidth = 2.5; x.beginPath(); c.forEach((p, i) => (i ? x.lineTo : x.moveTo).call(x, X(p.t), Y(p[k]))); x.stroke(); }
  x.fillStyle = '#4fd1c5'; x.fillText('车速', pad, 18); x.fillStyle = '#f6ad55'; x.fillText('踏板力', pad + 50, 18); x.fillStyle = '#ff6b6b'; x.fillText('1612N 断裂线', pad + 115, 18);
  x.fillStyle = '#fff8'; x.fillText(T.toFixed(1) + 's', W - pad - 30, H - 8);
}
requestAnimationFrame(frame);
