import * as THREE from 'three';
import { UP, hero, setFocal, SENSOR_HEIGHT_MM } from './scene.js';
import { notify } from './stage.js';

const gsap = window.gsap;
export const MOVE_EASE = 'power2.inOut';

const viewDir = shot => shot.rig.target.clone().sub(shot.rig.pos);
const rightOf = shot => viewDir(shot).cross(UP).normalize();
const horizontal = v => v.clone().setY(0);

export function dolly(shot, direction, seconds, ease = MOVE_EASE) {
  const dir = viewDir(shot);
  const distance = dir.length();
  dir.normalize();
  const step = direction > 0 ? Math.min(3, distance - 2) : Math.min(3, 24 - distance);
  if (step <= 0.05) {
    notify(direction > 0 ? 'Mais perto que isso o herói chama a segurança. Tenta um pull-out.' : 'Já tá longe demais. Daqui só de drone.');
    return null;
  }
  const end = shot.rig.pos.clone().addScaledVector(dir, step * direction);
  return gsap.to(shot.rig.pos, { x: end.x, y: end.y, z: end.z, duration: seconds, ease });
}

export function truck(shot, direction, seconds, distance = 2.5, ease = MOVE_EASE) {
  const offset = rightOf(shot).multiplyScalar(distance * direction);
  return gsap.to([shot.rig.pos, shot.rig.target], { x: `+=${offset.x}`, z: `+=${offset.z}`, duration: seconds, ease });
}

export function pedestal(shot, direction, seconds, ease = MOVE_EASE) {
  const amount = direction > 0 ? Math.min(1.5, 6 - shot.rig.pos.y) : -Math.min(1.5, shot.rig.pos.y - 0.4);
  if (Math.abs(amount) < 0.05) {
    notify(direction > 0 ? 'O pedestal chegou no talo. Pra subir mais, só de crane.' : 'Mais baixo que isso a câmera vira tapete.');
    return null;
  }
  return gsap.to([shot.rig.pos, shot.rig.target], { y: `+=${amount}`, duration: seconds, ease });
}

function rotateTargetAroundCamera(shot, axis, angle, seconds, ease) {
  const base = viewDir(shot);
  const turn = { angle: 0 };
  return gsap.to(turn, {
    angle,
    duration: seconds,
    ease,
    onUpdate: () => shot.rig.target.copy(shot.rig.pos).add(base.clone().applyAxisAngle(axis, turn.angle)),
  });
}

export const pan = (shot, direction, seconds, angle = 0.34, ease = MOVE_EASE) => rotateTargetAroundCamera(shot, UP, -direction * angle, seconds, ease);

export function tilt(shot, direction, seconds, ease = MOVE_EASE) {
  const pitch = Math.asin(viewDir(shot).normalize().y);
  const limit = 1.2;
  const angle = THREE.MathUtils.clamp(pitch + direction * 0.3, -limit, limit) - pitch;
  return rotateTargetAroundCamera(shot, rightOf(shot), angle, seconds, ease);
}

export function orbitAround(shot, direction, seconds, ease = MOVE_EASE) {
  const offset = shot.rig.pos.clone().sub(shot.rig.target);
  const sweep = { angle: 0 };
  return gsap.to(sweep, {
    angle: direction * Math.PI / 2,
    duration: seconds * 1.3,
    ease,
    onUpdate: () => shot.rig.pos.copy(shot.rig.target).add(offset.clone().applyAxisAngle(UP, sweep.angle)),
  });
}

export function crane(shot, direction, seconds, ease = MOVE_EASE) {
  const { pos } = shot.rig;
  const away = horizontal(viewDir(shot)).normalize().multiplyScalar(-1);
  const horizontalDistance = horizontal(viewDir(shot)).length();
  const rise = direction > 0 ? Math.min(3.2, 8 - pos.y) : -Math.min(3.2, pos.y - 0.6);
  const reach = direction > 0 ? 2 : -Math.min(2, horizontalDistance - 2.2);
  if (Math.abs(rise) < 0.05) {
    notify(direction > 0 ? 'A grua não estica mais. O sindicato dos braços mecânicos agradece.' : 'Crane no chão já. Daqui pra baixo é escavação.');
    return null;
  }
  return gsap.timeline()
    .to(pos, { y: pos.y + rise, duration: seconds, ease })
    .to(pos, { x: pos.x + away.x * reach, z: pos.z + away.z * reach, duration: seconds, ease: direction > 0 ? 'sine.out' : 'sine.in' }, '<');
}

export function tracking(shot, seconds) {
  const step = hero.position.x > 1.5 ? -4 : 4;
  const turnTime = seconds * 0.12;
  return gsap.timeline()
    .to(hero.rotation, { y: Math.sign(step) * Math.PI / 2, duration: turnTime, ease: 'power1.out' })
    .to(hero.position, { x: `+=${step}`, duration: seconds, ease: 'none' })
    .to([shot.rig.pos, shot.rig.target], { x: `+=${step}`, duration: seconds, ease: 'none' }, '<')
    .to(hero.rotation, { y: 0, duration: turnTime, ease: 'power1.inOut' });
}

export function tweenFocal(shot, mm, seconds, ease = MOVE_EASE) {
  const lens = { mm: shot.focal };
  return gsap.to(lens, { mm, duration: seconds, ease, onUpdate: () => setFocal(shot, lens.mm) });
}

export function tweenShotTo(shot, pose, seconds, ease = MOVE_EASE) {
  const timeline = gsap.timeline();
  timeline.to(shot.rig.pos, { x: pose.pos.x, y: pose.pos.y, z: pose.pos.z, duration: seconds, ease }, 0);
  timeline.to(shot.rig.target, { x: pose.target.x, y: pose.target.y, z: pose.target.z, duration: seconds, ease }, 0);
  if (pose.roll !== undefined) timeline.to(shot.rig, { roll: pose.roll, duration: seconds, ease }, 0);
  if (pose.shift) timeline.to(shot.shift, { x: pose.shift.x, y: pose.shift.y, duration: seconds, ease }, 0);
  if (pose.focal !== undefined) timeline.add(tweenFocal(shot, pose.focal, seconds, ease), 0);
  return timeline;
}

export function placeShot(shot, pose) {
  tweenShotTo(shot, pose, 0).progress(1).kill();
}

// Keeps distance * tan(fov / 2) constant, which is what keeps the subject the same size on screen.
export function dollyZoom(shot, endDistance, seconds, ease = 'power1.inOut') {
  const { target } = shot.rig;
  const direction = shot.rig.pos.clone().sub(target);
  const startDistance = direction.length();
  direction.normalize();
  const frameHalfHeight = startDistance * Math.tan(THREE.MathUtils.degToRad(shot.cam.fov) / 2);
  const travel = { distance: startDistance };
  return gsap.to(travel, {
    distance: endDistance,
    duration: seconds,
    ease,
    onUpdate: () => {
      shot.rig.pos.copy(target).addScaledVector(direction, travel.distance);
      setFocal(shot, (SENSOR_HEIGHT_MM / 2) * travel.distance / frameHalfHeight);
    },
  });
}

export const MOVE_LIBRARY = {
  static: { label: 'Static', cinema: 'static', run: () => null },
  pushIn: { label: 'Push-in', cinema: 'push-in', run: (shot, seconds, ease) => dolly(shot, 1, seconds, ease) },
  pullOut: { label: 'Pull-out', cinema: 'pull-out', run: (shot, seconds, ease) => dolly(shot, -1, seconds, ease) },
  truckLeft: { label: 'Truck ←', cinema: 'truck left', run: (shot, seconds, ease) => truck(shot, -1, seconds, 2.5, ease) },
  truckRight: { label: 'Truck →', cinema: 'truck right', run: (shot, seconds, ease) => truck(shot, 1, seconds, 2.5, ease) },
  panLeft: { label: 'Pan ←', cinema: 'pan left', run: (shot, seconds, ease) => pan(shot, -1, seconds, 0.34, ease) },
  panRight: { label: 'Pan →', cinema: 'pan right', run: (shot, seconds, ease) => pan(shot, 1, seconds, 0.34, ease) },
  tiltUp: { label: 'Tilt ↑', cinema: 'tilt up', run: (shot, seconds, ease) => tilt(shot, 1, seconds, ease) },
  craneUp: { label: 'Crane ↑', cinema: 'crane up', run: (shot, seconds, ease) => crane(shot, 1, seconds, ease) },
  craneDown: { label: 'Crane ↓', cinema: 'crane down', run: (shot, seconds, ease) => crane(shot, -1, seconds, ease) },
  orbitRight: { label: 'Orbit ⟳', cinema: 'orbit', run: (shot, seconds, ease) => orbitAround(shot, 1, seconds / 1.3, ease) },
  tracking: { label: 'Tracking', cinema: 'tracking', run: (shot, seconds) => tracking(shot, seconds) },
};

export const EASES = ['none', 'power1.inOut', 'power2.inOut', 'power3.inOut', 'power2.in', 'power2.out', 'sine.inOut', 'expo.out', 'expo.inOut', 'back.out(1.7)'];

export function playSequence(steps, { onUpdate } = {}) {
  const spawned = [];
  const timeline = gsap.timeline({ onUpdate: () => onUpdate?.(timeline.progress()) });
  steps.forEach(step => {
    timeline.addLabel(step.label);
    timeline.call(() => {
      const tween = step.start?.();
      if (tween) spawned.push(tween);
    }, [], step.label);
    timeline.to({}, { duration: step.seconds });
  });
  return {
    timeline,
    kill() {
      timeline.kill();
      spawned.forEach(tween => tween.kill());
    },
  };
}
