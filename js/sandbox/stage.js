import * as THREE from 'three';
import {
  renderer, scene, setCam, orbit, camA, camB, hero, heroModel, syncShot, setShotVisible,
  HOME, SET_CAM_HOME, MONITOR_ASPECT, FOCAL_MM, COLOR,
} from './scene.js';
import { storage } from '../progress.js';
import { $ } from '../html.js';
import { showCode } from '../code-panel.js';

const gsap = window.gsap;
const MOTION_KEY = 'cine-course.motion';
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const sandboxState = {
  motion: storage.read(MOTION_KEY, !prefersReducedMotion),
  setView: true,
  compare: false,
  tags: { A: '', B: '' },
  baseline: null,
};

export const dur = seconds => (sandboxState.motion ? seconds : 0);

const frameListeners = [];
const resetListeners = [];
export const onFrame = listener => frameListeners.push(listener);
export const onReset = listener => resetListeners.push(listener);

export const visibleShots = () => (sandboxState.compare ? [camA, camB] : [camA]);

const READOUT_KEYS = ['px', 'py', 'pz', 'rx', 'ry', 'rz', 'fov'];
const READOUT_NAMES = { px: 'position.x', py: 'position.y', pz: 'position.z', rx: 'rotation.x', ry: 'rotation.y', rz: 'rotation.z', fov: 'fov' };

function readCamera(cam) {
  return { px: cam.position.x, py: cam.position.y, pz: cam.position.z, rx: cam.rotation.x, ry: cam.rotation.y, rz: cam.rotation.z, fov: cam.fov };
}

function buildReadout() {
  const multi = sandboxState.compare;
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
  sandboxState.baseline = Object.fromEntries(visibleShots().map(shot => [shot.name, readCamera(shot.cam)]));
}

let lastChangedText = '';
function updateReadout() {
  const changed = new Set();
  for (const shot of visibleShots()) {
    const now = readCamera(shot.cam);
    const base = sandboxState.baseline?.[shot.name];
    for (const key of READOUT_KEYS) {
      const cell = $('readout').querySelector(`[data-k="${shot.name}-${key}"]`);
      if (!cell) continue;
      const text = key === 'fov' ? `${now.fov.toFixed(1)}° (${FOCAL_MM}mm)` : now[key].toFixed(2);
      if (cell.textContent !== text) cell.textContent = text;
      const isChanged = base && Math.abs(now[key] - base[key]) > 0.01;
      cell.classList.toggle('changed', Boolean(isChanged));
      if (isChanged) changed.add(READOUT_NAMES[key]);
    }
  }
  const text = changed.size ? [...changed].join(' · ') : (sandboxState.baseline ? 'nada (ainda)' : 'nada ainda');
  if (text !== lastChangedText) {
    $('changed-chip').innerHTML = `mudou → <b>${text}</b>`;
    lastChangedText = text;
  }
}

let toastTimer = 0;
export function notify(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

export function killShotMotion(shot) {
  shot.active?.kill();
  shot.active = null;
}

export function placeShotAtHome(shot) {
  killShotMotion(shot);
  shot.rig.pos.copy(HOME.pos);
  shot.rig.target.copy(HOME.target);
}

export function placeHeroOnMark() {
  gsap.killTweensOf([hero.position, hero.rotation]);
  hero.position.set(0, 0, 0);
  hero.rotation.set(0, 0, 0);
}

export function setCompare(on) {
  sandboxState.compare = on;
  setShotVisible(camB, on);
  if (!on) sandboxState.tags.B = '';
  buildReadout();
  relayout();
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

function resetScene() {
  [camA, camB].forEach(placeShotAtHome);
  placeHeroOnMark();
  setCam.position.copy(SET_CAM_HOME.pos);
  orbit.target.copy(SET_CAM_HOME.target);
  orbit.update();
  sandboxState.tags = { A: '', B: '' };
  if (sandboxState.compare) setCompare(false);
  sandboxState.baseline = null;
  showCode(null);
  refreshFrameLabels();
  resetListeners.forEach(listener => listener());
}

const stage = $('stage');
const frames = { set: $('frame-set'), A: $('frame-a'), B: $('frame-b') };
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

function computeViews(w, h) {
  const { setView, compare } = sandboxState;
  if (setView) {
    const margin = 10;
    const insetW = Math.min(w * (compare ? 0.42 : 0.4), compare ? 300 : 360);
    const insetH = insetW / MONITOR_ASPECT;
    return [
      { kind: 'set', rect: { x: 0, y: 0, w, h } },
      ...visibleShots().map((shot, i) => ({
        kind: 'shot', shot,
        rect: { x: compare && i === 0 ? margin : w - insetW - margin, y: h - insetH - margin, w: insetW, h: insetH },
      })),
    ];
  }
  if (compare) {
    const gap = 6;
    const half = (w - gap) / 2;
    return [
      { kind: 'shot', shot: camA, rect: fitAspect(0, 0, half, h, MONITOR_ASPECT) },
      { kind: 'shot', shot: camB, rect: fitAspect(half + gap, 0, half, h, MONITOR_ASPECT) },
    ];
  }
  return [{ kind: 'shot', shot: camA, rect: fitAspect(0, 0, w, h, MONITOR_ASPECT) }];
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
  for (const view of views) {
    if (view.kind === 'set') {
      placeFrame(frames.set, view.rect);
      continue;
    }
    const el = frames[view.shot.name];
    placeFrame(el, view.rect);
    el.classList.toggle('fullscreen', !sandboxState.setView && !sandboxState.compare);
  }
  refreshFrameLabels();
}

export function refreshFrameLabels() {
  ['A', 'B'].forEach(name => {
    const tag = sandboxState.tags[name] ? ` · ${sandboxState.tags[name]}` : '';
    frames[name].querySelector('.txt').textContent = `Cam ${name} · ${FOCAL_MM}mm${tag}`;
  });
  const mode = sandboxState.setView ? 'Visão de set' : 'Monitor';
  $('sandbox-title').innerHTML = `Sandbox · <b>${mode}</b> · Cam A ${FOCAL_MM}mm`;
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
    renderer.render(scene, view.kind === 'set' ? setCam : view.shot.cam);
  }
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
    renderViews();
    updateReadout();
    frameListeners.forEach(listener => listener());
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
  $('btn-reset').addEventListener('click', resetScene);

  setMotion(sandboxState.motion);
  setSetView(true);
  buildReadout();
  showCode(null);
  startRenderLoop();
}
