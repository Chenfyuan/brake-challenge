import { createSim, step, startBraking, P, SURF } from '../src/physics.js';
import assert from 'node:assert';
function brakeDist(surface, abs, kmh, noDrag) {
  const s = createSim({ surface, abs, testForce: 1600, noDrag }); s.v = kmh / 3.6; s.w = s.w.map(() => s.v / P.R);
  startBraking(s); s.pressed = true; let n = 0; while (s.state === 'run' && n < 1e6) { step(s); n++; } return s.dist;
}
const cases = [['dry', true, 39], ['dry', false, 49], ['wet', true, 66], ['wet', false, 87], ['ice', true, 262], ['ice', false, 393]];
const r = {}; let fail = 0;
for (const [sf, abs, exp] of cases) {
  const d = brakeDist(sf, abs, 100); r[sf + abs] = d; r['p' + sf + abs] = brakeDist(sf, abs, 100, true); const err = (d - exp) / exp * 100;
  const pure = brakeDist(sf, abs, 100, true), perr = (pure - exp) / exp * 100;
  const ok = Math.abs(perr) <= 5 && err <= 5 && d < pure; if (!ok) fail++;
  console.log(`${sf} ABS${abs ? '开' : '关'} 期望${exp} 实测${d.toFixed(1)}m 偏差${err.toFixed(1)}% | 纯轮胎${pure.toFixed(1)}m 偏差${perr.toFixed(1)}% ${ok ? 'OK' : 'FAIL'}`);
}
for (const sf of ['dry', 'wet', 'ice']) { const k = r[sf + false] / r[sf + true], kp = r['p' + sf + false] / r['p' + sf + true], ke = SURF[sf].peak / SURF[sf].slide; console.log(sf, '抱死/ABS 比 含阻力', k.toFixed(3), '纯轮胎', kp.toFixed(3), '理论', ke.toFixed(3)); assert(k > 1 && Math.abs(kp / ke - 1) < 0.08); }
const d300 = brakeDist('dry', true, 300); console.log('干 ABS 300km/h', d300.toFixed(1), 'm'); assert(d300 < 354);
assert.equal(fail, 0);
// 断踏板：持续按住 1.773 s
let s = createSim(); while (s.v * 3.6 < 99) step(s);
s.pressed = true; step(s); assert(!s.powerCut && s.warn);
s.pressed = false; while (s.v * 3.6 < 200) step(s);
s.pressed = true; let n = 0; while (s.state === 'run') { step(s); n++; }
assert.equal(s.reason, 'pedal'); console.log('按住断踏板', (n / 120).toFixed(3), 's'); assert(Math.abs(n / 120 - 1.773) < 0.02);
s = createSim(); let m = 0; while (s.state === 'run') { step(s); m++; } assert.equal(s.reason, 'barrier'); console.log('不刹撞墙，极速', (P.VMAX*3.6).toFixed(0));
s = createSim(); while (s.v * 3.6 < 200) step(s);
while (s.state === 'run') { s.pressed = s.F < 1450 && !(s.pressed && s.F > 1500); step(s); }
console.log('点刹', s.state, s.dist?.toFixed(1)); assert.equal(s.state, 'stop'); console.log('ALL OK');
