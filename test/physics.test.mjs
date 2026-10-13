import { createSim, step, P } from '../src/physics.js';
import assert from 'node:assert';
let s = createSim(); while (s.v * 3.6 < 99) step(s);
s.pressed = true; step(s); assert(!s.powerCut && s.warn);
s.pressed = false; while (s.v * 3.6 < 200) step(s);
s.pressed = true; let n = 0; while (s.state === 'run') { step(s); n++; }
assert.equal(s.reason, 'pedal'); console.log('hold-to-break secs', (n / 120).toFixed(2));
s = createSim(); while (s.state === 'run') step(s); assert.equal(s.reason, 'barrier');
// 点刹策略：力度在 1500 附近
s = createSim(); while (s.v * 3.6 < 200) step(s);
while (s.state === 'run') { s.pressed = s.F < 1450 && !(s.pressed && s.F > 1500) ; step(s); }
console.log(s.state, s.reason || '', 'score', s.score, 'x', s.x.toFixed(0), 't', s.tBrake.toFixed(2));
assert.equal(s.state, 'stop'); console.log('ok');
