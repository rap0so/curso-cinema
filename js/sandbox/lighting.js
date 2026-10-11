import * as THREE from 'three';
import { scene, ambient, sun, DEFAULT_LIGHTING, hero } from './scene.js';
import { onReset } from './stage.js';

const HERO_CHEST = new THREE.Vector3(0, 1.3, 0);
const STUDIO_AMBIENT = 0.1;
const LAMP_POSITION = new THREE.Vector3(1.9, 1.75, -0.6);

const LIGHT_HOMES = {
  key: { position: new THREE.Vector3(3.2, 3.6, 3.4), intensity: 3, kelvin: 4300 },
  fill: { position: new THREE.Vector3(-3.6, 2.2, 3), intensity: 1, kelvin: 5600 },
  rim: { position: new THREE.Vector3(-1.2, 3.4, -3.4), intensity: 4, kelvin: 5600 },
};

export function kelvinToColor(kelvin) {
  const t = kelvin / 100;
  let red;
  let green;
  let blue;
  if (t <= 66) {
    red = 255;
    green = 99.4708025861 * Math.log(t) - 161.1195681661;
    blue = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    red = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    green = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    blue = 255;
  }
  const channel = value => THREE.MathUtils.clamp(value, 0, 255) / 255;
  return new THREE.Color().setRGB(channel(red), channel(green), channel(blue), THREE.SRGBColorSpace);
}

function buildMarker(color) {
  const marker = new THREE.Group();
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10), new THREE.MeshBasicMaterial({ color, transparent: true }));
  const beam = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 }),
  );
  beam.frustumCulled = false;
  marker.add(bulb, beam);
  marker.traverse(o => o.layers.set(1));
  scene.add(marker);
  return { marker, bulb, beam };
}

function createStudioLight(name) {
  const light = new THREE.SpotLight(0xffffff, 0, 0, 0.62, 0.35, 0);
  light.target.position.copy(HERO_CHEST);
  scene.add(light, light.target);
  return { name, light, kelvin: LIGHT_HOMES[name].kelvin, gel: null, on: false, intensity: LIGHT_HOMES[name].intensity, ...buildMarker(0xffffff) };
}

export const lights = {
  key: createStudioLight('key'),
  fill: createStudioLight('fill'),
  rim: createStudioLight('rim'),
};
lights.key.light.castShadow = true;
lights.key.light.shadow.mapSize.set(1024, 1024);
lights.key.light.shadow.bias = -0.0005;

function buildPracticalLamp() {
  const lamp = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.4 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 10), metal);
  pole.position.y = 0.8;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.04, 20), metal);
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.22, 0.24, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xf3e2c0, emissive: 0xffc77a, emissiveIntensity: 0.9, side: THREE.DoubleSide }),
  );
  shade.position.y = 1.72;
  const glow = new THREE.PointLight(0xffb867, 2.2, 7, 1.6);
  glow.position.y = 1.7;
  lamp.add(pole, base, shade, glow);
  lamp.position.set(LAMP_POSITION.x, 0, LAMP_POSITION.z);
  lamp.traverse(o => { if (o.isMesh) o.castShadow = true; });
  lamp.visible = false;
  scene.add(lamp);
  return lamp;
}
export const practicalLamp = buildPracticalLamp();

export const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(14, 7),
  new THREE.MeshBasicMaterial({ color: 0xbfd2ee, fog: false }),
);
backdrop.position.set(0, 3.5, -5);
backdrop.visible = false;
scene.add(backdrop);

export const studio = { on: false, soft: false };

function syncLight(entry) {
  const color = entry.gel ? new THREE.Color(entry.gel) : kelvinToColor(entry.kelvin);
  entry.light.color.copy(color);
  entry.light.intensity = studio.on && entry.on ? entry.intensity : 0;
  entry.light.target.position.copy(hero.position).add(HERO_CHEST);
  entry.bulb.material.color.copy(color);
  entry.bulb.material.opacity = entry.on ? 1 : 0.25;
  entry.marker.visible = studio.on;
  const points = entry.beam.geometry.attributes.position;
  const from = entry.light.position;
  const to = entry.light.target.position;
  points.setXYZ(0, from.x, from.y, from.z);
  points.setXYZ(1, to.x, to.y, to.z);
  points.needsUpdate = true;
  entry.beam.visible = entry.on;
  entry.bulb.position.copy(from);
}

export function syncLights() {
  Object.values(lights).forEach(syncLight);
  ambient.intensity = studio.on ? STUDIO_AMBIENT : DEFAULT_LIGHTING.ambient;
  sun.intensity = studio.on ? 0 : DEFAULT_LIGHTING.sun;
}

export function setStudio(on) {
  studio.on = on;
  syncLights();
}

export function updateLight(name, changes) {
  Object.assign(lights[name], changes);
  syncLights();
}

export function setSoftness(soft) {
  studio.soft = soft;
  Object.values(lights).forEach(({ light }) => {
    light.penumbra = soft ? 0.95 : 0.05;
    light.shadow.radius = soft ? 12 : 1;
    light.shadow.blurSamples = soft ? 16 : 4;
  });
}

function placeLightsHome() {
  Object.entries(LIGHT_HOMES).forEach(([name, home]) => {
    const entry = lights[name];
    entry.light.position.copy(home.position);
    entry.kelvin = home.kelvin;
    entry.gel = null;
    entry.intensity = home.intensity;
    entry.on = false;
  });
}

export const LIGHT_PRESETS = {
  natural: { label: 'Natural (sol)' },
  keyOnly: { label: 'Só key', key: true },
  threePoint: { label: 'Three-point', key: true, fill: true, rim: true },
  silhouette: { label: 'Silhueta', rim: true, rimIntensity: 6, backdrop: true },
  motivated: { label: 'Motivada (abajur)', key: true, fill: true, practical: true, motivated: true, fillIntensity: 0.35 },
  moonlight: { label: 'Luar (fria)', key: true, rim: true, keyKelvin: 9000, keyIntensity: 1.6, rimKelvin: 10000 },
};

export function applyLightPreset(name) {
  const preset = LIGHT_PRESETS[name];
  placeLightsHome();
  practicalLamp.visible = Boolean(preset.practical);
  backdrop.visible = Boolean(preset.backdrop);
  if (name === 'natural') {
    setStudio(false);
    return;
  }
  lights.key.on = Boolean(preset.key);
  lights.fill.on = Boolean(preset.fill);
  lights.rim.on = Boolean(preset.rim);
  if (preset.rimIntensity) lights.rim.intensity = preset.rimIntensity;
  if (preset.fillIntensity) lights.fill.intensity = preset.fillIntensity;
  if (preset.keyKelvin) lights.key.kelvin = preset.keyKelvin;
  if (preset.keyIntensity) lights.key.intensity = preset.keyIntensity;
  if (preset.rimKelvin) lights.rim.kelvin = preset.rimKelvin;
  if (preset.motivated) {
    lights.key.light.position.set(LAMP_POSITION.x + 0.4, LAMP_POSITION.y + 0.4, LAMP_POSITION.z + 0.4);
    lights.key.kelvin = 2700;
  }
  setStudio(true);
}

export function contrastRatio() {
  const { key, fill } = lights;
  if (!key.on) return null;
  if (!fill.on || fill.intensity === 0) return Infinity;
  return key.intensity / fill.intensity;
}

export function formatRatio(ratio) {
  if (ratio === null) return 'sem key';
  if (ratio === Infinity) return '∞:1 (sem fill)';
  return `${ratio.toFixed(ratio < 10 ? 1 : 0)}:1`;
}

onReset(() => {
  applyLightPreset('natural');
  setSoftness(false);
});
setSoftness(false);
placeLightsHome();
syncLights();
