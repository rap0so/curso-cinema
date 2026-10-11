import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const UP = new THREE.Vector3(0, 1, 0);
export const MONITOR_ASPECT = 16 / 9;
export const FOCAL_MM = 35;
export const SENSOR_HEIGHT_MM = 24;
export const HERO_TOP = 2.06;
export const HERO_EYE_Y = 1.84;
export const HOME = { pos: new THREE.Vector3(0, 1.6, 7), target: new THREE.Vector3(0, 1.2, 0) };
export const SET_CAM_HOME = { pos: new THREE.Vector3(9, 6.5, 13.5), target: new THREE.Vector3(0, 1, 2.5) };
export const COLOR = { tungsten: 0xf0a640, daylight: 0x86b8ff, violet: 0xc9a6ff, alert: 0xf07a66, letterbox: 0x0f1115, sky: 0x14171d };
const DEFAULT_NEAR = 0.1;
const DEFAULT_FAR = 140;

export const fovFromFocal = mm => THREE.MathUtils.radToDeg(2 * Math.atan(SENSOR_HEIGHT_MM / (2 * mm)));
export const focalFromFov = fov => SENSOR_HEIGHT_MM / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));

export const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('scene'), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
// PCFSoftShadowMap ignores shadow.radius, and the lighting module needs radius for hard vs soft light.
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setScissorTest(true);

export const scene = new THREE.Scene();
scene.background = new THREE.Color(COLOR.sky);
scene.fog = new THREE.Fog(COLOR.sky, 18, 46);

export const ambient = new THREE.HemisphereLight(0xc9dcff, 0x2a2118, 1.2);
export const sun = new THREE.DirectionalLight(0xffe2b8, 2.4);
export const DEFAULT_LIGHTING = { ambient: 1.2, sun: 2.4 };

function addLights() {
  sun.position.set(5, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 3;
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 34 });
  scene.add(ambient, sun);
}

function addFloor() {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: 0x1c2027, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(90, 90, 0x3a4250, 0x272d37);
  grid.position.y = 0.002;
  scene.add(grid);
}

function floorStripe(fromX, fromZ, toX, toZ, color, width = 0.07) {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const stripe = new THREE.Mesh(
    new THREE.PlaneGeometry(width, Math.hypot(dx, dz)),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 }),
  );
  stripe.rotation.order = 'YXZ';
  stripe.rotation.set(-Math.PI / 2, Math.atan2(dx, dz), 0);
  stripe.position.set((fromX + toX) / 2, 0.004, (fromZ + toZ) / 2);
  return stripe;
}

export const leadingLines = [floorStripe(-3.6, 10, -0.5, 0.45, COLOR.tungsten), floorStripe(3.6, 10, 0.5, 0.45, COLOR.tungsten)];

function addLeadingLinesAndActorMark() {
  scene.add(...leadingLines);
  scene.add(floorStripe(-0.25, 0.6, 0.25, 0.6, COLOR.daylight, 0.08), floorStripe(0, 0.6, 0, 0.95, COLOR.daylight, 0.08));
}

function addPillars() {
  const material = new THREE.MeshStandardMaterial({ color: 0x5c6573, roughness: 0.8 });
  const geometry = new THREE.CylinderGeometry(0.32, 0.32, 3.4, 20);
  [[-2.6, -1.5], [2.4, -3.6], [-1.3, -7], [3.4, -9.5], [-4.2, -13], [1.2, -16.5], [-6.5, -5], [6, -6.5], [-7.5, 2], [7, 1]].forEach(([x, z]) => {
    const pillar = new THREE.Mesh(geometry, material);
    pillar.position.set(x, 1.7, z);
    pillar.castShadow = pillar.receiveShadow = true;
    scene.add(pillar);
  });
}

export const crates = [];
export const CRATE_HOMES = [[-1.25, 4.4, 0.6, 0.3], [1.6, 3.2, 0.5, -0.2], [-2.5, 1.6, 0.7, 0.5]];

function addForegroundCrates() {
  const material = new THREE.MeshStandardMaterial({ color: 0x6e5c46, roughness: 0.85 });
  CRATE_HOMES.forEach(([, , size]) => {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), material);
    crate.castShadow = crate.receiveShadow = true;
    crates.push(crate);
    scene.add(crate);
  });
  placeCratesHome();
}

export function placeCratesHome() {
  crates.forEach((crate, i) => {
    const [x, z, size, turn] = CRATE_HOMES[i];
    crate.position.set(x, size / 2, z);
    crate.rotation.set(0, turn, 0);
  });
}

export const moon = new THREE.Mesh(
  new THREE.SphereGeometry(2, 32, 20),
  new THREE.MeshStandardMaterial({ color: 0xe9e4d8, emissive: 0xd8d2c4, emissiveIntensity: 0.55, roughness: 1, fog: false }),
);
moon.position.set(-24, 15, -42);

addLights();
addFloor();
addLeadingLinesAndActorMark();
addPillars();
addForegroundCrates();
scene.add(moon);

function buildFigure(bodyColor, visorColor) {
  const figure = new THREE.Group();
  const model = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.55 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.9, 6, 18), material);
  body.position.y = 0.77;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 28, 18), material);
  head.position.y = 1.81;
  const visorMaterial = new THREE.MeshStandardMaterial({ color: visorColor, emissive: visorColor, emissiveIntensity: 0.7 });
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.08), visorMaterial);
  visor.position.set(0, 1.84, 0.22);
  model.add(body, head, visor);
  model.traverse(o => { o.castShadow = true; });
  figure.add(model);
  scene.add(figure);
  return { figure, model, visorMaterial };
}

const heroParts = buildFigure(COLOR.tungsten, COLOR.daylight);
export const hero = heroParts.figure;
export const heroModel = heroParts.model;
export const heroVisor = heroParts.visorMaterial;

const partnerParts = buildFigure(COLOR.daylight, COLOR.tungsten);
export const partner = partnerParts.figure;
partner.visible = false;

function buildActionLine() {
  const group = new THREE.Group();
  const line = floorStripe(-6, 0, 6, 0, COLOR.alert, 0.06);
  const zone = new THREE.Mesh(
    new THREE.CircleGeometry(5.5, 48, 0, Math.PI),
    new THREE.MeshBasicMaterial({ color: COLOR.alert, transparent: true, opacity: 0.08, side: THREE.DoubleSide }),
  );
  zone.rotation.x = Math.PI / 2;
  zone.position.y = 0.003;
  group.add(line, zone);
  group.visible = false;
  scene.add(group);
  return group;
}
export const actionLine = buildActionLine();

export function setTwoShotScene(on) {
  partner.visible = on;
  actionLine.visible = on;
  if (on) {
    hero.position.set(-0.9, 0, 0);
    hero.rotation.set(0, Math.PI / 2, 0);
    partner.position.set(0.9, 0, 0);
    partner.rotation.set(0, -Math.PI / 2, 0);
  } else {
    hero.position.set(0, 0, 0);
    hero.rotation.set(0, 0, 0);
  }
}

function buildCameraBody(color) {
  const group = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.5 });
  const accent = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.52), shell);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.22, 20), accent);
  lens.rotation.x = Math.PI / 2;
  lens.position.z = -0.37;
  const reelGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 24);
  [0.13, -0.13].forEach(z => {
    const reel = new THREE.Mesh(reelGeo, accent);
    reel.rotation.z = Math.PI / 2;
    reel.position.set(0, 0.3, z);
    group.add(reel);
  });
  group.add(box, lens);
  group.traverse(o => o.layers.set(1));
  return group;
}

function createShot(name, color) {
  const cam = new THREE.PerspectiveCamera(fovFromFocal(FOCAL_MM), MONITOR_ASPECT, DEFAULT_NEAR, DEFAULT_FAR);
  cam.rotation.order = 'YXZ';
  const frustumProxy = new THREE.PerspectiveCamera(cam.fov, MONITOR_ASPECT, 0.3, 3.2);
  const frustum = new THREE.CameraHelper(frustumProxy);
  const tint = new THREE.Color(color);
  frustum.setColors(tint, tint, tint, tint, tint);
  frustum.layers.set(1);
  const body = buildCameraBody(color);
  const sight = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 }),
  );
  sight.frustumCulled = false;
  sight.layers.set(1);
  const targetMarker = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color }));
  targetMarker.layers.set(1);
  scene.add(frustum, body, sight, targetMarker);
  return {
    name, cam, frustumProxy, frustum, body, sight, targetMarker,
    rig: { pos: HOME.pos.clone(), target: HOME.target.clone(), roll: 0 },
    shift: { x: 0, y: 0 },
    focal: FOCAL_MM,
    showClipping: false,
    active: null,
  };
}

export const camA = createShot('A', COLOR.tungsten);
export const camB = createShot('B', COLOR.daylight);
export const camC = createShot('C', COLOR.violet);
export const SHOTS = [camA, camB, camC];

export function setShotVisible(shot, visible) {
  [shot.frustum, shot.body, shot.sight, shot.targetMarker].forEach(o => { o.visible = visible; });
}
setShotVisible(camB, false);
setShotVisible(camC, false);

export function setFocal(shot, mm) {
  shot.focal = mm;
  shot.cam.fov = fovFromFocal(mm);
  shot.cam.updateProjectionMatrix();
}

export function resetShot(shot) {
  shot.active?.kill();
  shot.active = null;
  shot.rig.pos.copy(HOME.pos);
  shot.rig.target.copy(HOME.target);
  shot.rig.roll = 0;
  shot.shift.x = 0;
  shot.shift.y = 0;
  shot.showClipping = false;
  shot.cam.near = DEFAULT_NEAR;
  shot.cam.far = DEFAULT_FAR;
  setFocal(shot, FOCAL_MM);
}

function applyViewShift(camera, shift) {
  if (shift.x || shift.y) camera.setViewOffset(1, 1, shift.x, shift.y, 1, 1);
  else if (camera.view?.enabled) camera.clearViewOffset();
}

export function syncShot(shot) {
  const { cam, rig, frustumProxy } = shot;
  cam.position.copy(rig.pos);
  cam.lookAt(rig.target);
  if (rig.roll) cam.rotateZ(rig.roll);
  applyViewShift(cam, shot.shift);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();

  frustumProxy.position.copy(cam.position);
  frustumProxy.quaternion.copy(cam.quaternion);
  frustumProxy.fov = cam.fov;
  frustumProxy.near = shot.showClipping ? cam.near : 0.3;
  frustumProxy.far = shot.showClipping ? Math.min(cam.far, 40) : 3.2;
  applyViewShift(frustumProxy, shot.shift);
  frustumProxy.updateProjectionMatrix();
  frustumProxy.updateMatrixWorld();
  shot.frustum.update();

  shot.body.position.copy(cam.position);
  shot.body.quaternion.copy(cam.quaternion);
  const line = shot.sight.geometry.attributes.position;
  line.setXYZ(0, rig.pos.x, rig.pos.y, rig.pos.z);
  line.setXYZ(1, rig.target.x, rig.target.y, rig.target.z);
  line.needsUpdate = true;
  shot.targetMarker.position.copy(rig.target);
}

export const setCam = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
setCam.position.copy(SET_CAM_HOME.pos);
setCam.layers.enable(1);

export const orbit = new OrbitControls(setCam, renderer.domElement);
orbit.target.copy(SET_CAM_HOME.target);
orbit.enableDamping = true;
orbit.maxPolarAngle = Math.PI * 0.495;
orbit.minDistance = 3;
orbit.maxDistance = 40;
orbit.update();
