import * as THREE from 'three';
import { hero, HERO_EYE_Y, HERO_TOP, FOCAL_MM, syncShot } from './scene.js';

// Distances are calibrated for 35mm; longer lenses back off proportionally so the framing stays the same.
export const FRAMINGS = {
  wide: { label: 'Wide', distance: 13, targetY: 1.1 },
  medium: { label: 'Medium', distance: 2.3, targetY: 1.45 },
  closeUp: { label: 'Close-up', distance: 1.25, targetY: 1.78 },
  extremeCloseUp: { label: 'Extreme close-up', distance: 0.55, targetY: 1.84 },
};

export const ANGLES = {
  eye: { label: 'Eye level', height: () => HERO_EYE_Y, roll: 0 },
  high: { label: 'High angle', height: ({ targetY, distance }) => targetY + Math.max(0.5, distance * 0.7), roll: 0 },
  low: { label: 'Low angle', height: ({ targetY, distance }) => Math.max(0.15, targetY - Math.max(0.25, distance * 0.55)), roll: 0 },
  dutch: { label: 'Dutch angle', height: () => HERO_EYE_Y, roll: 0.35 },
};

export function composePose({ framing = 'medium', angle = 'eye', focal = FOCAL_MM, azimuth = 0, shift = { x: 0, y: 0 } } = {}) {
  const frame = FRAMINGS[framing];
  const view = ANGLES[angle];
  const distance = frame.distance * focal / FOCAL_MM;
  const center = hero.position;
  return {
    pos: new THREE.Vector3(
      center.x + Math.sin(azimuth) * distance,
      view.height({ targetY: frame.targetY, distance }),
      center.z + Math.cos(azimuth) * distance,
    ),
    target: new THREE.Vector3(center.x, frame.targetY, center.z),
    roll: view.roll,
    focal,
    shift,
  };
}

export function measureHeroFraming(shot) {
  syncShot(shot);
  const top = hero.position.clone().setY(HERO_TOP).project(shot.cam);
  const feet = hero.position.clone().setY(0).project(shot.cam);
  const eye = hero.position.clone().setY(HERO_EYE_Y).project(shot.cam);
  return {
    share: (top.y - feet.y) / 2,
    headInFrame: top.y <= 0.98 && Math.abs(top.x) <= 1,
    eye,
  };
}
