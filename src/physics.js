// V1 物理：踏板→液压→扭矩→轮胎力，载荷转移，简化魔术公式，ABS，风阻滚阻（固定步长 1/120 s）
export const P = {
  DT: 1 / 120, SUB: 16, G: 9.81, RHO: 1.225,
  M: 2500, H: 0.55, L: 3.0, A: 1.45, B: 1.55, CD: 0.28, AREA: 2.4, CRR: 0.012, R: 0.36, I: 1.2,
  VMAX: 320 / 3.6, ACCEL: 9.0, EXP: 1.6, MIN_BRAKE: 100 / 3.6,
  BREAK_N: 1612, RAMP_BASE: 200, RAMP_GROWTH: 800, RELEASE: 900,
  BAR_PER_N: 0.075, TF: 60, TR: 35, ABS_HI: 0.15, ABS_LO: 0.08, ABS_KEEP: 0.6, ABS_UP: 1.1,
  STOP_V: 0.08, BARRIER: 2600, NOSE: 2.7,
};
export const SURF = {
  dry: { name: '干燥', peak: 1.0, slide: 0.8 },
  wet: { name: '湿滑', peak: 0.6, slide: 0.45 },
  ice: { name: '结冰', peak: 0.15, slide: 0.10 },
};
// 魔术公式形状：B=10,C=1.9,E=0.97，横轴缩放使峰值落在 s=0.12
const raw = x => Math.sin(1.9 * Math.atan(10 * x - 0.97 * (10 * x - Math.atan(10 * x))));
let xp = 0, fp = 0; for (let x = 0; x < 1; x += 1e-4) { const f = raw(x); if (f > fp) { fp = f; xp = x; } }
const K = xp / 0.12, F1 = raw(K) / fp;
export function mu(s, surf) {
  const f = raw(s * K) / fp; if (s <= 0.12) return surf.peak * f;
  return surf.slide + (surf.peak - surf.slide) * Math.max(0, (f - F1) / (1 - F1));
}
export function createSim(opt = {}) {
  return { v: 0, x: 0, F: 0, hold: 0, pressed: false, powerCut: false, braking: false,
    surface: opt.surface || 'dry', abs: opt.abs ?? true, testForce: opt.testForce ?? null, noDrag: !!opt.noDrag,
    w: [0, 0, 0, 0], slip: [0, 0, 0, 0], absK: [1, 1, 1, 1], absCut: [false, false, false, false], ax: 0,
    v0: 0, xBrake: 0, tBrake: 0, t: 0, Fmax: 0, maxSlip: 0, locked: false, state: 'run', curve: [], warn: false };
}
export function startBraking(s) { s.powerCut = s.braking = true; s.v0 = s.v * 3.6; s.xBrake = s.x; }
export function step(s, dt = P.DT) {
  if (s.state !== 'run') return s;
  s.t += dt; s.warn = false;
  if (s.pressed && !s.powerCut) { if (s.v >= P.MIN_BRAKE) startBraking(s); else s.warn = true; }
  const aero = s.noDrag ? 0 : 0.5 * P.RHO * P.CD * P.AREA * s.v * s.v, roll = s.v > 0 && !s.noDrag ? P.CRR * P.M * P.G : 0;
  if (!s.powerCut) {
    const a = P.ACCEL * (1 - Math.pow(s.v / P.VMAX, P.EXP));
    s.v = Math.max(0, s.v + a * dt); s.w = s.w.map(() => s.v / P.R); s.slip.fill(0);
  } else {
    if (s.testForce != null) s.F = s.testForce;
    else if (s.pressed) { s.hold += dt; s.F += (P.RAMP_BASE + P.RAMP_GROWTH * s.hold) * dt; }
    else { s.hold = 0; s.F = Math.max(0, s.F - P.RELEASE * dt); }
    s.Fmax = Math.max(s.Fmax, s.F);
    const bar = s.F * P.BAR_PER_N, surf = SURF[s.surface];
    const Nf = (P.M * P.G * P.B / P.L + P.M * s.ax * P.H / P.L) / 2, Nr = (P.M * P.G * P.A / P.L - P.M * s.ax * P.H / P.L) / 2;
    const h = dt / P.SUB; let v = s.v, Fsum = 0, ms = 0;
    for (let k = 0; k < P.SUB; k++) {
      let Fx = 0;
      for (let i = 0; i < 4; i++) {
        const front = i < 2, N = front ? Nf : Nr;
        const sl = Math.min(1, Math.max(0, (v - s.w[i] * P.R) / Math.max(v, 0.5)));
        // ABS：滑移率超 0.15 就把该轮压力降到 60%（仍超则继续降），低滑移时每子步 ×1.1，低于 0.08 逐步恢复
        if (s.abs) { if (sl > P.ABS_HI) s.absK[i] *= P.ABS_KEEP; else if (sl < P.ABS_LO) s.absK[i] = Math.min(1, s.absK[i] * P.ABS_UP); }
        if (!s.abs) s.absK[i] = 1; s.absCut[i] = s.absK[i] < 1;
        const T = bar * (front ? P.TF : P.TR) * s.absK[i];
        const f = mu(sl, surf) * N; Fx += f; s.slip[i] = sl; ms = Math.max(ms, sl);
        let w = s.w[i] + (f * P.R - (s.w[i] > 0 ? T : 0)) / P.I * h;
        if (s.w[i] <= 0 && f * P.R <= T) w = 0;
        s.w[i] = Math.max(0, Math.min(w, v / P.R));
      }
      v = Math.max(0, v - (Fx + aero + roll) / P.M * h); Fsum += Fx / P.SUB;
    }
    s.ax = (Fsum + aero + roll) / P.M; s.v = v; s.maxSlip = ms;
    if (ms > 0.5) s.locked = true;
    s.tBrake += dt;
    if (s.curve.length === 0 || s.tBrake - s.curve[s.curve.length - 1].t > 0.05) s.curve.push({ t: s.tBrake, v: s.v * 3.6, F: s.F, s: ms });
  }
  s.x += s.v * dt;
  if (s.powerCut && s.testForce == null && s.F >= P.BREAK_N) { s.state = 'crash'; s.reason = 'pedal'; }
  else if (s.testForce == null && s.x >= P.BARRIER - P.NOSE) { s.state = 'crash'; s.reason = 'barrier'; }
  else if (s.braking && s.v <= P.STOP_V) {
    s.state = 'stop'; s.v = 0; s.dist = s.x - s.xBrake;
    s.score = Math.round(s.v0 ** 2 / s.tBrake ** 1.7 * (s.abs ? 1 : 1.2));
  }
  return s;
}
// 理论刹停距离 v²/(2μg)
export const ideal = (v0kmh, surface) => (v0kmh / 3.6) ** 2 / (2 * SURF[surface].peak * P.G);
