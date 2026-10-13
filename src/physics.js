// 纵向动力学（定步长 1/120 s），参数与原作玩法对齐，代码为自研实现
export const P = {
  VMAX: 260 / 3.6, ACCEL: 7.4, EXP: 1.55,
  MIN_BRAKE: 100 / 3.6, BREAK_N: 1612, RAMP_BASE: 200, RAMP_GROWTH: 400,
  RELEASE: 900, K_PEDAL: 10.8 / 1612, ROLL: 0.15, DRAG: 2.2e-5, STOP_V: 0.08,
  BARRIER: 2600, NOSE: 2.7, DT: 1 / 120,
};
export function createSim() {
  return { v: 0, x: 0, F: 0, hold: 0, pressed: false, powerCut: false, braking: false,
    v0: 0, tBrake: 0, t: 0, state: 'run', curve: [], warn: false };
}
export function step(s, dt = P.DT) {
  if (s.state !== 'run') return s;
  s.t += dt; s.warn = false;
  if (s.pressed && !s.powerCut) {
    if (s.v >= P.MIN_BRAKE) { s.powerCut = true; s.braking = true; s.v0 = s.v * 3.6; }
    else s.warn = true;
  }
  let a;
  if (!s.powerCut) a = P.ACCEL * (1 - Math.pow(s.v / P.VMAX, P.EXP));
  else {
    if (s.pressed) { s.hold += dt; s.F += (P.RAMP_BASE + 2 * P.RAMP_GROWTH * s.hold) * dt; }
    else { s.hold = 0; s.F = Math.max(0, s.F - P.RELEASE * dt); }
    a = -(P.ROLL + P.DRAG * s.v * s.v + P.K_PEDAL * s.F);
    s.tBrake += dt;
    if (s.curve.length === 0 || s.tBrake - s.curve[s.curve.length - 1].t > 0.05) s.curve.push({ t: s.tBrake, v: s.v * 3.6, F: s.F });
  }
  s.v = Math.max(0, s.v + a * dt); s.x += s.v * dt;
  if (s.powerCut && s.F >= P.BREAK_N) { s.state = 'crash'; s.reason = 'pedal'; }
  else if (s.x >= P.BARRIER - P.NOSE) { s.state = 'crash'; s.reason = 'barrier'; }
  else if (s.braking && s.v <= P.STOP_V) { s.state = 'stop'; s.v = 0; s.score = Math.round(s.v0 ** 2 / s.tBrake ** 1.7); }
  return s;
}
