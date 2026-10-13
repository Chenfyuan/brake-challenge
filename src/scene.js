import * as THREE from 'three';
import { P } from './physics.js';
// 程序化黄昏公路场景（全部几何体与 Canvas 贴图在运行时生成）
export function createScene(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  const sky = skyTex(); scene.background = sky;
  scene.fog = new THREE.Fog(0xe0867a, 60, 520);
  const cam = new THREE.PerspectiveCamera(62, 1, .1, 1500);
  scene.add(new THREE.HemisphereLight(0xffc9a8, 0x3a2a4a, .9));
  const sun = new THREE.DirectionalLight(0xffb27a, 1.4); sun.position.set(-30, 40, -60); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 });
  scene.add(sun, sun.target);
  // 地面与路面
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 4000), new THREE.MeshLambertMaterial({ color: 0x4a5a3a }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -.02, -1500); scene.add(ground);
  const rt = roadTex(); rt.wrapS = rt.wrapT = THREE.RepeatWrapping; rt.repeat.set(1, 3200 / 20);
  rt.anisotropy = r.capabilities.getMaxAnisotropy();
  const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 3200), new THREE.MeshLambertMaterial({ map: rt }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -1400); road.receiveShadow = true; scene.add(road);
  // 护栏
  const railMat = new THREE.MeshStandardMaterial({ color: 0xcfd6dc, metalness: .7, roughness: .4 });
  for (const sx of [-7.6, 7.6]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(.12, .3, 3200), railMat); rail.position.set(sx, .7, -1400); scene.add(rail);
  }
  // 可回收的路灯、树、护栏桩
  const pool = [];
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x555a66, metalness: .6, roughness: .5 });
  const glow = new THREE.MeshBasicMaterial({ color: 0xffe2a0 });
  for (let i = 0; i < 24; i++) for (const side of [-1, 1]) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, 8), lampMat); pole.position.y = 4;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2, .1, .1), lampMat); arm.position.set(-side, 7.9, 0);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(.6, .12, .3), glow); bulb.position.set(-side * 1.8, 7.8, 0);
    g.add(pole, arm, bulb); g.position.set(side * 8.4, 0, -i * 40 - (side > 0 ? 20 : 0)); scene.add(g); pool.push({ o: g, span: 960 });
  }
  const trunk = new THREE.MeshLambertMaterial({ color: 0x5a3d2b });
  const leafs = [0x2f6b3a, 0x3e7d45, 0x5c8a3a, 0x8a6a2f].map(c => new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
  for (let i = 0; i < 70; i++) {
    const g = new THREE.Group(), s = 1 + Math.random() * 1.4;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.15 * s, .25 * s, 2 * s), trunk); t.position.y = s;
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.4 * s, 3.6 * s, 6), leafs[i % 4]); c.position.y = 3.6 * s; c.castShadow = true;
    g.add(t, c); const side = i % 2 ? 1 : -1;
    g.position.set(side * (11 + Math.random() * 30), 0, -Math.random() * 700); scene.add(g); pool.push({ o: g, span: 700 });
  }
  // 远山
  const mt = new THREE.MeshLambertMaterial({ color: 0x6b4a6e, flatShading: true });
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(60 + Math.random() * 80, 50 + Math.random() * 70, 5), mt);
    m.position.set((i % 2 ? 1 : -1) * (150 + Math.random() * 250), 20, -400 - i * 200); scene.add(m);
  }
  // 终点路障
  const barrier = new THREE.Group(); const bz = -P.BARRIER;
  const stripe = stripeTex();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(14, 1.6, .8), new THREE.MeshLambertMaterial({ map: stripe }));
  wall.position.y = .8; wall.castShadow = true; barrier.add(wall);
  for (let k = -3; k <= 3; k++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(.3, .8, 12), new THREE.MeshLambertMaterial({ color: 0xff6a00 }));
    cone.position.set(k * 2, .4, 6); barrier.add(cone);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.15), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    lamp.position.set(k * 2, 1.75, 0); barrier.add(lamp);
  }
  barrier.position.z = bz; scene.add(barrier);
  // 距离牌
  for (const m of [500, 1000, 1500, 2000, 2400, 2500]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), new THREE.MeshBasicMaterial({ map: textTex(`距路障 ${P.BARRIER - m}m`) }));
    sign.position.set(-9.5, 3, -m); scene.add(sign);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 3), lampMat); post.position.set(-9.5, 1.5, -m); scene.add(post);
  }
  // 车辆
  const car = makeCar(); scene.add(car.g);
  // 烟尘粒子
  const N = 160, pg = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), vel = [];
  for (let i = 0; i < N; i++) { pos[i * 3 + 1] = -10; vel.push({ x: 0, y: 0, z: 0, life: 0 }); }
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const smoke = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xdddddd, size: .9, transparent: true, opacity: .55, depthWrite: false }));
  scene.add(smoke); let pi = 0;
  function emit(x, z, n, spread = 1) {
    for (let k = 0; k < n; k++) { const p = vel[pi]; pi = (pi + 1) % N;
      p.life = 1; pos[pi * 3] = x + (Math.random() - .5) * 1.6; pos[pi * 3 + 1] = .2; pos[pi * 3 + 2] = z;
      p.x = (Math.random() - .5) * spread; p.y = Math.random() * spread; p.z = Math.random() * 2; p.i = pi; }
  }
  // 刹车印：预分配的贴地四边形，循环复用
  const SK = 600, skG = new THREE.PlaneGeometry(.26, 1), skM = new THREE.MeshBasicMaterial({ color: 0x0b0b0d, transparent: true, opacity: .55, depthWrite: false });
  const skids = new THREE.InstancedMesh(skG, skM, SK); skids.count = 0; skids.frustumCulled = false; scene.add(skids);
  let skI = 0, skLast = [null, null, null, null]; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), v3 = new THREE.Vector3(), sc = new THREE.Vector3();
  const WX = [-.95, .95, -.95, .95], WZ = [-1.5, -1.5, 1.5, 1.5];
  function addSkid(i, z) { const prev = skLast[i]; skLast[i] = z; if (prev == null || Math.abs(prev - z) < .05) return;
    const len = Math.min(3, Math.abs(prev - z)); v3.set(WX[i], .012, (prev + z) / 2); sc.set(1, len, 1); m4.compose(v3, q, sc);
    skids.setMatrixAt(skI, m4); skI = (skI + 1) % SK; skids.count = Math.max(skids.count, skI); skids.instanceMatrix.needsUpdate = true; }
  function clearSkids() { skids.count = 0; skI = 0; skLast = [null, null, null, null]; }
  // 速度线：相机前方的细长线段
  const SL = 60, slPos = new Float32Array(SL * 6), slG = new THREE.BufferGeometry(); slG.setAttribute('position', new THREE.BufferAttribute(slPos, 3));
  const slM = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }); const lines = new THREE.LineSegments(slG, slM); lines.frustumCulled = false; scene.add(lines);
  const slD = Array.from({ length: SL }, () => ({ x: 0, y: 0, z: 0 })); const reseat = (d, z) => { const a = Math.random() * Math.PI * 2, rr = 4 + Math.random() * 6; d.x = Math.cos(a) * rr; d.y = 2 + Math.sin(a) * rr * .6; d.z = z - 10 - Math.random() * 60; if (d.y < .3) d.y = .3 + Math.random(); };
  // 路面外观
  const roadMat = road.material;
  function setSurface(k) { roadMat.color.setHex(k === 'wet' ? 0x8a93a6 : k === 'ice' ? 0xcfe6ff : 0xffffff); roadMat.needsUpdate = true; scene.fog.color.setHex(k === 'ice' ? 0xc7d4e8 : k === 'wet' ? 0x8f8aa0 : 0xe0867a); }
  // 画质分级：0 全开；1 关动态模糊；2 再关阴影；3 再降分辨率
  let quality = 0; const blurEl = document.getElementById('blur');
  function setQuality(qv) { quality = qv; r.shadowMap.enabled = qv < 2; sun.castShadow = qv < 2; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    r.setPixelRatio(qv >= 3 ? Math.min(devicePixelRatio, 1) * .7 : Math.min(devicePixelRatio, 2)); resize(); if (blurEl && qv >= 1) blurEl.style.opacity = 0; }
  const shake = { a: 0 };
  function resize() { const w = innerWidth, h = innerHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < h ? 72 : 58; cam.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  function setPlate(text) { car.setPlate(text); }
  function render(st, dt) {
    const z = -st.x, kmh = st.v * 3.6;
    car.g.position.set(0, 0, z);
    car.wheels.forEach(w => w.rotation.x -= st.v * dt / .4);
    // 刹车点头
    const pitch = st.pitch || 0; car.body.rotation.x = -pitch;
    car.lights.material.color.setHex(st.F > 50 ? 0xff1a1a : 0x661010);
    if (st.flip) { car.g.rotation.z = st.flip.rz; car.g.rotation.x = st.flip.rx; car.g.position.y = st.flip.y; car.g.position.x = st.flip.dx; }
    else { car.g.rotation.set(0, 0, 0); }
    if (st.slip) for (let i = 0; i < 4; i++) { if (st.slip[i] > .5 && st.v > .5) { addSkid(i, z + WZ[i]); if (Math.random() < .5) emit(WX[i], z + WZ[i], 1, .6); } else skLast[i] = null; }
    // 速度线与动态模糊（随车速增强）
    const sp = Math.max(0, (kmh - 120) / 200); slM.opacity = quality < 1 ? Math.min(.55, sp) : 0;
    for (let k = 0; k < SL; k++) { const d = slD[k]; if (d.z > z + 6 || d.z < z - 80 || !d.z) reseat(d, z); const o = k * 6, L = 1 + kmh * .03;
      slPos[o] = d.x; slPos[o + 1] = d.y; slPos[o + 2] = d.z; slPos[o + 3] = d.x; slPos[o + 4] = d.y; slPos[o + 5] = d.z + L; }
    slG.attributes.position.needsUpdate = true; if (blurEl && quality < 1) blurEl.style.opacity = Math.min(.8, sp).toFixed(2);
    for (const p of vel) if (p.life > 0) { p.life -= dt * .8; const i = p.i * 3; pos[i] += p.x * dt; pos[i + 1] += (p.y + .8) * dt; pos[i + 2] += p.z * dt; if (p.life <= 0) pos[i + 1] = -10; }
    pg.attributes.position.needsUpdate = true;
    for (const it of pool) if (it.o.position.z > z + 30) it.o.position.z -= it.span;
    const back = 9 + kmh * .012, high = 3.2 + kmh * .003;
    shake.a *= .9; const sa = shake.a + (st.flip ? 0 : kmh / 320 * .12 + (st.maxSlip > .2 ? .08 : 0)); const sx = (Math.random() - .5) * sa, sy = (Math.random() - .5) * sa;
    cam.position.set(sx + (st.camSide || 0), high + sy, z + back);
    cam.lookAt(0, 1.2, z - 12); cam.fov += ((innerWidth < innerHeight ? 72 : 58) + kmh * .07 - cam.fov) * .1; cam.updateProjectionMatrix();
    sun.position.set(-30, 40, z - 60); sun.target.position.set(0, 0, z);
    r.render(scene, cam);
  }
  return { render, emit, shake, setPlate, setSurface, setQuality, clearSkids, get quality() { return quality; } };
}
function makeCar() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const paint = new THREE.MeshStandardMaterial({ color: 0x1f6fb5, metalness: .6, roughness: .3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1a2230, metalness: .9, roughness: .1 });
  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.9, .6, 4.6), paint); lower.position.y = .65; lower.castShadow = true;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, .55, 2.3), glass); cabin.position.set(0, 1.22, .2); cabin.castShadow = true;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, .08, 1.9), paint); roof.position.set(0, 1.52, .25);
  const lights = new THREE.Mesh(new THREE.BoxGeometry(1.7, .14, .05), new THREE.MeshBasicMaterial({ color: 0x661010 }));
  lights.position.set(0, .82, 2.31);
  const plateC = document.createElement('canvas'); plateC.width = 256; plateC.height = 80;
  const pt = new THREE.CanvasTexture(plateC);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(.6, .19), new THREE.MeshBasicMaterial({ map: pt })); plate.position.set(0, .55, 2.31);
  body.add(lower, cabin, roof, lights, plate);
  const wheels = [], wg = new THREE.CylinderGeometry(.4, .4, .3, 18), wm = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .8 });
  for (const [x, z] of [[-.95, -1.5], [.95, -1.5], [-.95, 1.5], [.95, 1.5]]) {
    const w = new THREE.Mesh(wg, wm); w.rotation.z = Math.PI / 2; const h = new THREE.Group(); h.add(w); h.position.set(x, .4, z); g.add(h); wheels.push(h);
  }
  function setPlate(t) { const c = plateC.getContext('2d'); c.fillStyle = '#1446a0'; c.fillRect(0, 0, 256, 80);
    c.strokeStyle = '#fff'; c.lineWidth = 4; c.strokeRect(6, 6, 244, 68); c.fillStyle = '#fff'; c.font = 'bold 44px sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, 128, 42); pt.needsUpdate = true; }
  setPlate('粤B·12345');
  return { g, body, wheels, lights, setPlate };
}
function skyTex() { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#2b1f4a'); gr.addColorStop(.45, '#a4507a'); gr.addColorStop(.75, '#f08a6a'); gr.addColorStop(1, '#ffd29d');
  x.fillStyle = gr; x.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function roadTex() { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#3a3a40'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .06})`; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  x.fillStyle = '#eee'; x.fillRect(8, 0, 6, 256); x.fillRect(242, 0, 6, 256);
  x.fillStyle = '#f2c94c'; x.fillRect(124, 0, 8, 140);
  x.fillStyle = '#ddd'; x.fillRect(64, 0, 4, 120); x.fillRect(188, 0, 4, 120);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function stripeTex() { const c = document.createElement('canvas'); c.width = 256; c.height = 32; const x = c.getContext('2d');
  for (let i = -2; i < 20; i++) { x.fillStyle = i % 2 ? '#fff' : '#e53e3e'; x.beginPath(); x.moveTo(i * 16, 32); x.lineTo(i * 16 + 16, 32); x.lineTo(i * 16 + 32, 0); x.lineTo(i * 16 + 16, 0); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function textTex(s) { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#1b7a3e'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#fff'; x.lineWidth = 6; x.strokeRect(6, 6, 244, 116);
  x.fillStyle = '#fff'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, 128, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
