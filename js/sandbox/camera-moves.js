import * as THREE from 'three';
import { UP, hero } from './scene.js';
import { notify } from './stage.js';

const gsap = window.gsap;
const MOVE_EASE = 'power2.inOut';

const viewDir = shot => shot.rig.target.clone().sub(shot.rig.pos);
const rightOf = shot => viewDir(shot).cross(UP).normalize();
const horizontal = v => v.clone().setY(0);

export function dolly(shot, direction, seconds) {
  const dir = viewDir(shot);
  const distance = dir.length();
  dir.normalize();
  const step = direction > 0 ? Math.min(3, distance - 2) : Math.min(3, 24 - distance);
  if (step <= 0.05) {
    notify(direction > 0 ? 'Mais perto que isso o herói chama a segurança. Tenta um pull-out.' : 'Já tá longe demais. Daqui só de drone.');
    return null;
  }
  const end = shot.rig.pos.clone().addScaledVector(dir, step * direction);
  return gsap.to(shot.rig.pos, { x: end.x, y: end.y, z: end.z, duration: seconds, ease: MOVE_EASE });
}

export function truck(shot, direction, seconds, distance = 2.5) {
  const offset = rightOf(shot).multiplyScalar(distance * direction);
  return gsap.to([shot.rig.pos, shot.rig.target], { x: `+=${offset.x}`, z: `+=${offset.z}`, duration: seconds, ease: MOVE_EASE });
}

export function pedestal(shot, direction, seconds) {
  const amount = direction > 0 ? Math.min(1.5, 6 - shot.rig.pos.y) : -Math.min(1.5, shot.rig.pos.y - 0.4);
  if (Math.abs(amount) < 0.05) {
    notify(direction > 0 ? 'O pedestal chegou no talo. Pra subir mais, só de crane.' : 'Mais baixo que isso a câmera vira tapete.');
    return null;
  }
  return gsap.to([shot.rig.pos, shot.rig.target], { y: `+=${amount}`, duration: seconds, ease: MOVE_EASE });
}

function rotateTargetAroundCamera(shot, axis, angle, seconds) {
  const base = viewDir(shot);
  const turn = { angle: 0 };
  return gsap.to(turn, {
    angle,
    duration: seconds,
    ease: MOVE_EASE,
    onUpdate: () => shot.rig.target.copy(shot.rig.pos).add(base.clone().applyAxisAngle(axis, turn.angle)),
  });
}

export const pan = (shot, direction, seconds, angle = 0.34) => rotateTargetAroundCamera(shot, UP, -direction * angle, seconds);

export function tilt(shot, direction, seconds) {
  const pitch = Math.asin(viewDir(shot).normalize().y);
  const limit = 1.2;
  const angle = THREE.MathUtils.clamp(pitch + direction * 0.3, -limit, limit) - pitch;
  return rotateTargetAroundCamera(shot, rightOf(shot), angle, seconds);
}

export function orbitAround(shot, direction, seconds) {
  const offset = shot.rig.pos.clone().sub(shot.rig.target);
  const sweep = { angle: 0 };
  return gsap.to(sweep, {
    angle: direction * Math.PI / 2,
    duration: seconds * 1.3,
    ease: MOVE_EASE,
    onUpdate: () => shot.rig.pos.copy(shot.rig.target).add(offset.clone().applyAxisAngle(UP, sweep.angle)),
  });
}

export function crane(shot, direction, seconds) {
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
    .to(pos, { y: pos.y + rise, duration: seconds, ease: MOVE_EASE })
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
