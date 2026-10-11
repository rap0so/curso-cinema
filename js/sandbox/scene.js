import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const UP = new THREE.Vector3(0, 1, 0);
export const MONITOR_ASPECT = 16 / 9;
export const FOCAL_MM = 35;
export const HERO_TOP = 2.06;
export const HOME = { pos: new THREE.Vector3(0, 1.6, 7), target: new THREE.Vector3(0, 1.2, 0) };
export const SET_CAM_HOME = { pos: new THREE.Vector3(9, 6.5, 13.5), target: new THREE.Vector3(0, 1, 2.5) };
export const COLOR = { tungsten: 0xf0a640, daylight: 0x86b8ff, letterbox: 0x0f1115, sky: 0x14171d };

const SENSOR_HEIGHT_MM = 24;

export const fovFromFocal = mm => THREE.MathUtils.radToDeg(2 * Math.atan(SENSOR_HEIGHT_MM / (2 * mm)));

export const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('scene'), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setScissorTest(true);

export const scene = new THREE.Scene();
scene.background = new THREE.Color(COLOR.sky);
scene.fog = new THREE.Fog(COLOR.sky, 18, 46);

function addLights() {
  scene.add(new THREE.HemisphereLight(0xc9dcff, 0x2a2118, 1.2));
  const sun = new THREE.DirectionalLight(0xffe2b8, 2.4);
  sun.position.set(5, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 34 });
  scene.add(sun);
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

function addFloorStripe(fromX, fromZ, toX, toZ, color, width = 0.07) {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const stripe = new THREE.Mesh(
    new THREE.PlaneGeometry(width, Math.hypot(dx, dz)),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 }),
  );
  stripe.rotation.order = 'YXZ';
  stripe.rotation.set(-Math.PI / 2, Math.atan2(dx, dz), 0);
  stripe.position.set((fromX + toX) / 2, 0.004, (fromZ + toZ) / 2);
  scene.add(stripe);
}

function addLeadingLinesAndActorMark() {
  addFloorStripe(-3.6, 10, -0.5, 0.45, COLOR.tungsten);
  addFloorStripe(3.6, 10, 0.5, 0.45, COLOR.tungsten);
  addFloorStripe(-0.25, 0.6, 0.25, 0.6, COLOR.daylight, 0.08);
  addFloorStripe(0, 0.6, 0, 0.95, COLOR.daylight, 0.08);
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

function addForegroundCrates() {
  const material = new THREE.MeshStandardMaterial({ color: 0x6e5c46, roughness: 0.85 });
  [[-1.25, 4.4, 0.6, 0.3], [1.6, 3.2, 0.5, -0.2], [-2.5, 1.6, 0.7, 0.5]].forEach(([x, z, size, turn]) => {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), material);
    crate.position.set(x, size / 2, z);
    crate.rotation.y = turn;
    crate.castShadow = crate.receiveShadow = true;
    scene.add(crate);
  });
}

addLights();
addFloor();
addLeadingLinesAndActorMark();
addPillars();
addForegroundCrates();

export const hero = new THREE.Group();
export const heroModel = new THREE.Group();

function buildHero() {
  const material = new THREE.MeshStandardMaterial({ color: COLOR.tungsten, roughness: 0.55 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.9, 6, 18), material);
  body.position.y = 0.77;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 28, 18), material);
  head.position.y = 1.81;
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.09, 0.08),
    new THREE.MeshStandardMaterial({ color: COLOR.daylight, emissive: COLOR.daylight, emissiveIntensity: 0.7 }),
  );
  visor.position.set(0, 1.84, 0.22);
  heroModel.add(body, head, visor);
  heroModel.traverse(o => { o.castShadow = true; });
  hero.add(heroModel);
  scene.add(hero);
}
buildHero();

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
  const cam = new THREE.PerspectiveCamera(fovFromFocal(FOCAL_MM), MONITOR_ASPECT, 0.1, 140);
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
    rig: { pos: HOME.pos.clone(), target: HOME.target.clone() },
    active: null,
  };
}

export const camA = createShot('A', COLOR.tungsten);
export const camB = createShot('B', COLOR.daylight);

export function setShotVisible(shot, visible) {
  [shot.frustum, shot.body, shot.sight, shot.targetMarker].forEach(o => { o.visible = visible; });
}
setShotVisible(camB, false);

export function syncShot(shot) {
  const { cam, rig, frustumProxy } = shot;
  cam.position.copy(rig.pos);
  cam.lookAt(rig.target);
  cam.updateMatrixWorld();
  frustumProxy.position.copy(cam.position);
  frustumProxy.quaternion.copy(cam.quaternion);
  frustumProxy.fov = cam.fov;
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
