import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  renderer, scene, setCam, orbit, camA, SHOTS, hero, heroModel, heroVisor, syncShot, setShotVisible, resetShot,
  setTwoShotScene, placeCratesHome, SET_CAM_HOME, MONITOR_ASPECT, COLOR,
} from './scene.js';
import { storage } from '../progress.js';
import { $ } from '../html.js';
import { showCode } from '../code-panel.js';

const gsap = window.gsap;
const MOTION_KEY = 'cine-course.motion';
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DOF_DEFAULTS = { enabled: false, focus: 7, aperture: 0.0025, maxBlur: 0.012 };

export const sandboxState = {
  motion: storage.read(MOTION_KEY, !prefersReducedMotion),
  setView: true,
  compareShots: null,
  tags: { A: '', B: '', C: '' },
  baseline: null,
  dof: { ...DOF_DEFAULTS },
};

export const dur = seconds => (sandboxState.motion ? seconds : 0);

const frameListeners = [];
const resetListeners = [];
const userResetListeners = [];
export const onFrame = listener => frameListeners.push(listener);
export const onReset = listener => resetListeners.push(listener);
export const onUserReset = listener => userResetListeners.push(listener);

export const visibleShots = () => sandboxState.compareShots ?? [camA];

const READOUT_KEYS = ['px', 'py', 'pz', 'rx', 'ry', 'rz', 'fov'];
const READOUT_NAMES = { px: 'position.x', py: 'position.y', pz: 'position.z', rx: 'rotation.x', ry: 'rotation.y', rz: 'rotation.z', fov: 'fov' };

function readCamera(shot) {
  const { cam } = shot;
  return { px: cam.position.x, py: cam.position.y, pz: cam.position.z, rx: cam.rotation.x, ry: cam.rotation.y, rz: cam.rotation.z, fov: cam.fov };
}

let extraReadout = null;
let extraSignature = '';
export function setExtraReadout(rowsProvider) {
  extraReadout = rowsProvider;
  extraSignature = '';
}
const readExtraRows = () => extraReadout?.() ?? [];

function buildReadout() {
  const multi = Boolean(sandboxState.compareShots);
  $('readout').innerHTML = visibleShots().map(shot => {
    const id = shot.name;
    const tag = multi ? `<span class="cam-tag ${id.toLowerCase()}">Cam ${id}</span>` : '';
    return `${tag}
      <span class="prop">camera.position</span><span class="val" data-k="${id}-px"></span><span class="val" data-k="${id}-py"></span><span class="val" data-k="${id}-pz"></span>
      <span class="prop">camera.rotation</span><span class="val" data-k="${id}-rx"></span><span class="val" data-k="${id}-ry"></span><span class="val" data-k="${id}-rz"></span>
      <span class="prop">camera.fov</span><span class="val" data-k="${id}-fov"></span><span></span><span></span>`;
  }).join('');
}

export function snapshotBaseline() {
  visibleShots().forEach(syncShot);
  sandboxState.baseline = {
    shots: Object.fromEntries(visibleShots().map(shot => [shot.name, readCamera(shot)])),
    extra: Object.fromEntries(readExtraRows().map(row => [row.name, row.value])),
  };
}

let lastChangedText = '';
function updateReadout() {
  const changed = new Set();
  const baseline = sandboxState.baseline;
  for (const shot of visibleShots()) {
    const now = readCamera(shot);
    const base = baseline?.shots[shot.name];
    for (const key of READOUT_KEYS) {
      const cell = $('readout').querySelector(`[data-k="${shot.name}-${key}"]`);
      if (!cell) continue;
      const text = key === 'fov' ? `${now.fov.toFixed(1)}° (${Math.round(shot.focal)}mm)` : now[key].toFixed(2);
      if (cell.textContent !== text) cell.textContent = text;
      const isChanged = base && Math.abs(now[key] - base[key]) > 0.01;
      cell.classList.toggle('changed', Boolean(isChanged));
      if (isChanged) changed.add(READOUT_NAMES[key]);
    }
  }
  updateExtraReadout(changed, baseline);
  const text = changed.size ? [...changed].join(' · ') : (baseline ? 'nada (ainda)' : 'nada ainda');
  if (text !== lastChangedText) {
    $('changed-chip').innerHTML = `mudou → <b>${text}</b>`;
    lastChangedText = text;
  }
}

function updateExtraReadout(changed, baseline) {
  const rows = readExtraRows();
  const container = $('readout-extra');
  const signature = rows.map(row => row.name).join('|');
  if (signature !== extraSignature) {
    container.innerHTML = rows.map(row => `<span class="prop">${row.name}</span><span class="val" data-x="${row.name}"></span>`).join('');
    container.hidden = rows.length === 0;
    extraSignature = signature;
  }
  rows.forEach(row => {
    const cell = container.querySelector(`[data-x="${row.name}"]`);
    if (cell.textContent !== row.text) cell.textContent = row.text;
    const base = baseline?.extra[row.name];
    const isChanged = base !== undefined && (typeof row.value === 'number' ? Math.abs(row.value - base) > 0.005 : row.value !== base);
    cell.classList.toggle('changed', isChanged);
    if (isChanged) changed.add(row.name);
  });
}

let toastTimer = 0;
export function notify(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3400);
}

export function caption(text) {
  const el = $('caption');
  el.textContent = text;
  el.hidden = !text;
}

export const fadeOverlay = () => $('frame-a').querySelector('.fade');

export function setThirds(on) {
  $('stage').classList.toggle('show-thirds', on);
}

export function killShotMotion(shot) {
  shot.active?.kill();
  shot.active = null;
}

export function placeHeroOnMark() {
  gsap.killTweensOf([hero.position, hero.rotation]);
  setTwoShotScene(false);
}

export function setCompare(shots) {
  const list = shots && shots.length > 1 ? shots : null;
  sandboxState.compareShots = list;
  SHOTS.forEach(shot => setShotVisible(shot, shot === camA || Boolean(list?.includes(shot))));
  if (!list) Object.assign(sandboxState.tags, { B: '', C: '' });
  buildReadout();
  relayout();
}

export function setDof(changes) {
  Object.assign(sandboxState.dof, changes);
  if (sandboxState.dof.enabled) ensureComposer();
  if (bokehPass) {
    bokehPass.uniforms.focus.value = sandboxState.dof.focus;
    bokehPass.uniforms.aperture.value = sandboxState.dof.aperture;
    bokehPass.uniforms.maxblur.value = sandboxState.dof.maxBlur;
  }
}

function setSetView(on) {
  sandboxState.setView = on;
  orbit.enabled = on;
  $('btn-setview').setAttribute('aria-pressed', String(on));
  relayout();
}

function setMotion(on) {
  sandboxState.motion = on;
  storage.write(MOTION_KEY, on);
  const button = $('btn-motion');
  button.setAttribute('aria-pressed', String(on));
  button.textContent = on ? 'Animar' : 'Instantâneo';
  button.title = on ? 'Animações ligadas. Clique para resultado instantâneo.' : 'Modo instantâneo (prefers-reduced-motion). Clique para animar.';
}

export function resetScene() {
  gsap.killTweensOf(fadeOverlay());
  SHOTS.forEach(resetShot);
  placeHeroOnMark();
  placeCratesHome();
  heroVisor.color.setHex(COLOR.daylight);
  heroVisor.emissive.setHex(COLOR.daylight);
  setCam.position.copy(SET_CAM_HOME.pos);
  orbit.target.copy(SET_CAM_HOME.target);
  orbit.update();
  sandboxState.tags = { A: '', B: '', C: '' };
  setCompare(null);
  setDof({ ...DOF_DEFAULTS });
  setThirds(false);
  caption('');
  fadeOverlay().style.opacity = '0';
  sandboxState.baseline = null;
  showCode(null);
  refreshFrameLabels();
  resetListeners.forEach(listener => listener());
}

const stage = $('stage');
const frames = { set: $('frame-set'), A: $('frame-a'), B: $('frame-b'), C: $('frame-c') };
let stageSize = { w: 1, h: 1 };
let views = [];

function fitAspect(x, y, w, h, aspect) {
  let width = w;
  let height = w / aspect;
  if (height > h) {
    height = h;
    width = h * aspect;
  }
  return { x: x + (w - width) / 2, y: y + (h - height) / 2, w: width, h: height };
}

function gridRects(count, w, h) {
  const gap = 6;
  let best = null;
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const cellW = (w - gap * (cols - 1)) / cols;
    const cellH = (h - gap * (rows - 1)) / rows;
    const size = fitAspect(0, 0, cellW, cellH, MONITOR_ASPECT).w;
    if (!best || size > best.size) best = { cols, cellW, cellH, size };
  }
  return Array.from({ length: count }, (_, i) => {
    const col = i % best.cols;
    const row = Math.floor(i / best.cols);
    return fitAspect(col * (best.cellW + gap), row * (best.cellH + gap), best.cellW, best.cellH, MONITOR_ASPECT);
  });
}

function insetRects(count, w, h) {
  const margin = 10;
  const insetW = count === 1
    ? Math.min(w * 0.4, 360)
    : Math.min((w - margin * (count + 1)) / count, 300);
  const insetH = insetW / MONITOR_ASPECT;
  return Array.from({ length: count }, (_, i) => ({
    x: count === 1 ? w - insetW - margin : margin + i * (insetW + margin),
    y: h - insetH - margin,
    w: insetW,
    h: insetH,
  }));
}

function computeViews(w, h) {
  const shots = visibleShots();
  if (sandboxState.setView) {
    const rects = insetRects(shots.length, w, h);
    return [{ kind: 'set', rect: { x: 0, y: 0, w, h } }, ...shots.map((shot, i) => ({ kind: 'shot', shot, rect: rects[i] }))];
  }
  const rects = gridRects(shots.length, w, h);
  return shots.map((shot, i) => ({ kind: 'shot', shot, rect: rects[i] }));
}

function placeFrame(el, rect) {
  el.hidden = false;
  Object.assign(el.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` });
}

function relayout() {
  const { w, h } = stageSize;
  views = computeViews(w, h);
  setCam.aspect = w / h;
  setCam.updateProjectionMatrix();
  Object.values(frames).forEach(el => { el.hidden = true; });
  const single = !sandboxState.setView && !sandboxState.compareShots;
  for (const view of views) {
    if (view.kind === 'set') {
      placeFrame(frames.set, view.rect);
      continue;
    }
    const el = frames[view.shot.name];
    placeFrame(el, view.rect);
    el.classList.toggle('fullscreen', single);
  }
  refreshFrameLabels();
}

export function refreshFrameLabels() {
  ['A', 'B', 'C'].forEach(name => {
    const shot = SHOTS.find(s => s.name === name);
    const tag = sandboxState.tags[name] ? ` · ${sandboxState.tags[name]}` : '';
    frames[name].querySelector('.txt').textContent = `Cam ${name} · ${Math.round(shot.focal)}mm${tag}`;
  });
  const mode = sandboxState.setView ? 'Visão de set' : 'Monitor';
  $('sandbox-title').innerHTML = `Sandbox · <b>${mode}</b> · Cam A ${Math.round(camA.focal)}mm`;
}

let composer = null;
let renderPass = null;
let bokehPass = null;
let composerSize = '';

function ensureComposer() {
  if (composer) return;
  composer = new EffectComposer(renderer);
  renderPass = new RenderPass(scene, camA.cam);
  const { focus, aperture, maxBlur } = sandboxState.dof;
  bokehPass = new BokehPass(scene, camA.cam, { focus, aperture, maxblur: maxBlur });
  composer.addPass(renderPass);
  composer.addPass(bokehPass);
  composer.addPass(new OutputPass());
}

function renderWithDepthOfField(rect) {
  const size = `${Math.round(rect.w)}x${Math.round(rect.h)}`;
  if (size !== composerSize) {
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(Math.round(rect.w), Math.round(rect.h));
    composerSize = size;
  }
  composer.render();
}

function renderViews() {
  const { w, h } = stageSize;
  renderer.setViewport(0, 0, w, h);
  renderer.setScissor(0, 0, w, h);
  renderer.setClearColor(COLOR.letterbox);
  renderer.clear();
  for (const view of views) {
    const { x, y, w: vw, h: vh } = view.rect;
    const glY = h - y - vh;
    renderer.setViewport(x, glY, vw, vh);
    renderer.setScissor(x, glY, vw, vh);
    if (view.kind === 'shot' && view.shot === camA && sandboxState.dof.enabled && composer) renderWithDepthOfField(view.rect);
    else renderer.render(scene, view.kind === 'set' ? setCam : view.shot.cam);
  }
}

// Reading the on-screen WebGL canvas after render returns black in some browsers, so stills go through a render target.
export function renderStill(shot, targetCanvas) {
  syncShot(shot);
  const width = targetCanvas.width * 2;
  const height = targetCanvas.height * 2;
  const target = new THREE.WebGLRenderTarget(width, height, { samples: 4 });
  target.texture.colorSpace = THREE.SRGBColorSpace;
  renderer.setRenderTarget(target);
  renderer.render(scene, shot.cam);
  const pixels = new Uint8ClampedArray(width * height * 4);
  renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
  renderer.setRenderTarget(null);
  target.dispose();

  const flipped = new ImageData(width, height);
  const rowBytes = width * 4;
  for (let row = 0; row < height; row++) {
    flipped.data.set(pixels.subarray(row * rowBytes, (row + 1) * rowBytes), (height - 1 - row) * rowBytes);
  }
  const buffer = document.createElement('canvas');
  buffer.width = width;
  buffer.height = height;
  buffer.getContext('2d').putImageData(flipped, 0, 0);
  targetCanvas.getContext('2d').drawImage(buffer, 0, 0, targetCanvas.width, targetCanvas.height);
}

function startRenderLoop() {
  const clock = new THREE.Clock();
  let lastHeroX = 0;
  renderer.setAnimationLoop(() => {
    const elapsed = clock.getElapsedTime();
    const heroSpeed = Math.abs(hero.position.x - lastHeroX);
    lastHeroX = hero.position.x;
    heroModel.position.y = heroSpeed > 0.0005 ? Math.abs(Math.sin(elapsed * 11)) * 0.06 : 0;

    visibleShots().forEach(syncShot);
    if (sandboxState.setView) orbit.update();
    frameListeners.forEach(listener => listener());
    renderViews();
    updateReadout();
  });
}

export function startSandbox() {
  new ResizeObserver(() => {
    const rect = stage.getBoundingClientRect();
    stageSize = { w: Math.max(1, Math.round(rect.width)), h: Math.max(1, Math.round(rect.height)) };
    renderer.setSize(stageSize.w, stageSize.h, false);
    relayout();
  }).observe(stage);

  $('btn-setview').addEventListener('click', () => setSetView(!sandboxState.setView));
  $('btn-motion').addEventListener('click', () => setMotion(!sandboxState.motion));
  $('btn-reset').addEventListener('click', () => {
    resetScene();
    userResetListeners.forEach(listener => listener());
  });

  setMotion(sandboxState.motion);
  setSetView(true);
  buildReadout();
  showCode(null);
  startRenderLoop();
}
