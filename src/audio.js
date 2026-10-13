// WebAudio 合成音效：引擎、风噪、刹车啸叫、撞击、成功提示
let ctx, eng, eng2, engGain, wind, windGain, sq, sqGain, master;
export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  engGain = ctx.createGain(); engGain.gain.value = 0; lp.connect(engGain).connect(master);
  eng = ctx.createOscillator(); eng.type = 'sawtooth'; eng.connect(lp); eng.start();
  eng2 = ctx.createOscillator(); eng2.type = 'square'; const g2 = ctx.createGain(); g2.gain.value = .3; eng2.connect(g2).connect(lp); eng2.start();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  wind = ctx.createBufferSource(); wind.buffer = buf; wind.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = .6;
  windGain = ctx.createGain(); windGain.gain.value = 0; wind.connect(bp).connect(windGain).connect(master); wind.start();
  sq = ctx.createOscillator(); sq.type = 'triangle'; sq.frequency.value = 1800;
  sqGain = ctx.createGain(); sqGain.gain.value = 0; sq.connect(sqGain).connect(master); sq.start();
  initAudio.noise = buf;
}
export function updateAudio(kmh, powerOn, force, active, slip = 0) {
  if (!ctx) return; const t = ctx.currentTime;
  const rpm = 40 + (kmh % 60) * 2.2 + kmh * .5;
  eng.frequency.setTargetAtTime(rpm, t, .05); eng2.frequency.setTargetAtTime(rpm * .5, t, .05);
  engGain.gain.setTargetAtTime(active ? (powerOn ? .22 : .06) : 0, t, .1);
  windGain.gain.setTargetAtTime(active ? Math.min(.35, kmh / 700) : 0, t, .1);
  // 轮胎尖叫：滑移率 > 0.2 时出现，音量随滑移率增大
  sqGain.gain.setTargetAtTime(active && slip > .2 && kmh > 3 ? Math.min(.16, slip * .18) : 0, t, .03);
  sq.frequency.setTargetAtTime(1200 + slip * 900 + Math.random() * 120, t, .02);
}
export function boom() {
  if (!ctx) return; const s = ctx.createBufferSource(); s.buffer = initAudio.noise;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; const g = ctx.createGain();
  g.gain.setValueAtTime(1, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + 1.6);
  s.connect(f).connect(g).connect(master); s.start(); s.stop(ctx.currentTime + 1.7);
}
export function snap() { blip(220, .15, 'square', 60); }
export function beep(hi) { blip(hi ? 880 : 440, .18, 'sine'); }
export function win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, .25, 'triangle'), i * 110)); }
function blip(f, dur, type, end) {
  if (!ctx) return; const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
  o.type = type; o.frequency.setValueAtTime(f, t); if (end) o.frequency.exponentialRampToValueAtTime(end, t + dur);
  g.gain.setValueAtTime(.3, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g).connect(master); o.start(); o.stop(t + dur + .05);
}
