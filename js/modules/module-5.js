import * as THREE from 'three';
import {
  HOME, camA, camB, camC, crates, heroVisor, moon, setTwoShotScene, SENSOR_HEIGHT_MM, COLOR,
} from '../sandbox/scene.js';
import {
  sandboxState, dur, snapshotBaseline, killShotMotion, placeHeroOnMark, setCompare, refreshFrameLabels,
  caption, fadeOverlay,
} from '../sandbox/stage.js';
import { placeShot, MOVE_LIBRARY, EASES, playSequence, dolly, pan, crane } from '../sandbox/camera-moves.js';
import { composePose } from '../sandbox/framing.js';
import { showCode } from '../code-panel.js';
import { slate } from '../course-ui.js';
import { progress } from '../progress.js';
import { createLesson, panelTabs, rangeField, selectField } from '../lesson.js';
import { $ } from '../html.js';

const gsap = window.gsap;
const HEAD = new THREE.Vector3(0, 1.81, 0);
const HEAD_RADIUS = 0.25;
const CHALLENGE_MOVES = ['pushIn', 'pullOut', 'panLeft', 'panRight', 'truckLeft', 'truckRight', 'craneUp', 'orbitRight'];

const ui = {
  active: false,
  panelTab: 'rhythm',
  challengeActive: false,
  ease: 'power2.inOut',
  duration: 2.4,
  hold: 1,
  run: null,
  beats: [],
  challenge: { move1: 'pushIn', ease1: 'none', dur1: 1, hold: 0, move2: 'panRight', ease2: 'none', dur2: 1 },
};

const ACHIEVEMENT = { id: 'm5', icon: '⏱️', name: 'Maestria em Easing', desc: 'Câmera que respira. Robô nenhum.' };

const pose = (pos, target, focal = 35) => ({ pos: new THREE.Vector3(...pos), target: new THREE.Vector3(...target), roll: 0, focal, shift: { x: 0, y: 0 } });

const TWO_SHOT = {
  master: pose([0, 1.6, 6.5], [0, 1.35, 0]),
  partnerSameSide: pose([-1.7, 1.7, 2.6], [0.9, 1.75, 0], 50),
  crossed: pose([0, 1.6, -6.5], [0, 1.35, 0]),
};

const TERMS = [
  {
    id: 'easing', name: 'Easing', aka: 'a respiração do movimento',
    analogy: 'Ninguém sai correndo do zero nem para de uma vez: o corpo acelera e desacelera. Easing é a respiração do movimento.',
    short: 'acelerar e frear como gente',
    definition: 'A curva que diz como a velocidade muda ao longo do movimento.',
    screen: 'Linear parece robô de fábrica. Com ease, parece um operador de câmera de verdade.',
    code: 'O parâmetro ease do GSAP: "none" (linear), "power2.inOut", "expo.out"...',
    alt: 'Elevador velho: dá um tranco pra sair e outro pra parar. Elevador bom acelera e freia suave. Mesmo trajeto, outra sensação. O primeiro é linear, o segundo tem ease.',
    demos: [['linear', 'push-in linear'], ['eased', 'push-in power2.inOut']],
  },
  {
    id: 'inOut', name: 'Ease-in / ease-out', aka: 'sair devagar / chegar devagar',
    analogy: 'Ease-in é o carro saindo do sinal; ease-out é o carro chegando no estacionamento.',
    short: 'saindo do sinal / estacionando',
    definition: 'In = começa devagar e acelera. Out = começa rápido e freia. InOut = os dois.',
    screen: 'Ease-in termina de supetão (bom pra corte). Ease-out pousa macio (bom pra revelar).',
    code: '"power2.in", "power2.out", "power2.inOut". O número é a força da curva.',
    alt: 'Pensa no nome pelo lado do movimento: "in" é onde ele entra (o começo), "out" é onde ele sai (o fim). A suavidade fica do lado do nome.',
    demos: [['easeIn', 'ease-in'], ['easeOut', 'ease-out']],
  },
  {
    id: 'hold', name: 'Hold', aka: 'pausa',
    analogy: 'A pausa antes do punchline da piada. Sem ela, a piada morre.',
    short: 'a pausa antes do punchline',
    definition: 'Um momento parado entre movimentos, pra imagem assentar.',
    screen: 'Push-in, segura um segundo, depois pan. O público tem tempo de olhar.',
    code: 'tl.to({}, { duration: 1 }) no meio da timeline. Ou position parameter "+=1".',
    alt: 'Lado a lado: mesma sequência com e sem hold. Sem hold parece que a câmera está atrasada pra um compromisso.',
    demos: [['withHold', 'com hold'], ['withoutHold', 'sem hold']],
  },
  {
    id: 'beat', name: 'Beat', aka: 'batida',
    analogy: 'Cada mudança de assunto numa conversa. Uma conversa boa tem beats claros.',
    short: 'cada virada da conversa',
    definition: 'A menor unidade de ação ou emoção de uma cena. Cada beat pede uma intenção de câmera.',
    screen: 'Beat 1 aproxima, beat 2 revela o lado, beat 3 sobe e mostra o espaço.',
    code: 'tl.addLabel("beat1"). Labels do GSAP são literalmente marcações de beat.',
    alt: 'Você já usa: aquele tl.addLabel("intro") que você coloca pra sincronizar animação de página. No cinema esse rótulo se chama beat.',
    demos: [['beats', 'sequência em 3 beats']],
  },
  {
    id: 'pacing', name: 'Pacing', aka: 'ritmo',
    analogy: 'A mesma música tocada como balada ou como forró.',
    short: 'balada ou forró',
    definition: 'A velocidade geral da sequência: quanto tempo cada beat e cada pausa duram.',
    screen: 'Mesma sequência: lenta parece contemplativa; rápida parece urgente.',
    code: 'tl.timeScale(1.6) acelera tudo. Ou encurte cada duration.',
    alt: 'Trailer de filme de ação vs trailer de drama: as mesmas técnicas de câmera, com durações completamente diferentes.',
    demos: [['slowPace', 'lento'], ['fastPace', 'rápido']],
  },
  {
    id: 'cut', name: 'Cut vs transition', aka: 'corte vs transição',
    analogy: 'Corte é piscar o olho. Transição é fechar os olhos devagar e abrir em outro lugar.',
    short: 'piscar vs fechar os olhos devagar',
    definition: 'Cut troca de plano instantaneamente. Transição (fade, dissolve) troca aos poucos e sinaliza passagem de tempo ou lugar.',
    screen: 'Corte: wide e na hora close-up. Fade: escurece, troca, clareia.',
    code: 'Cut: placeShot(novoPlano) no mesmo frame. Fade: anima a opacidade de um overlay preto e troca no escuro.',
    alt: 'Filme usa corte 95% do tempo. Fade pro preto é tipo um "ponto final" de capítulo. Se cada troca de plano tivesse fade, o filme ia parecer apresentação de PowerPoint.',
    demos: [['cut', 'cut'], ['fade', 'fade']],
  },
  {
    id: 'matchCut', name: 'Match cut', aka: 'corte por semelhança',
    analogy: 'Rima visual: o fim de um plano e o começo do outro têm a mesma forma.',
    short: 'rima visual',
    definition: 'Corte entre dois planos com forma, movimento ou composição parecidos.',
    screen: 'A cabeça redonda do herói vira a lua, no mesmo lugar e tamanho do quadro.',
    code: 'Mesma posição e tamanho no quadro: aqui a lua pede uma lente de ~250mm pra caber igual à cabeça.',
    alt: '2001: Uma Odisseia no Espaço: o osso jogado pro alto vira uma nave espacial. Milhões de anos num corte.',
    demos: [['matchCut', 'cabeça → lua']],
  },
  {
    id: 'rule180', name: '180-degree rule', aka: 'regra dos 180°',
    analogy: 'Assistir futebol da arquibancada: se a câmera pular pro outro lado do campo, parece que o time trocou de gol.',
    short: 'câmera do mesmo lado do campo',
    definition: 'Uma linha imaginária liga os personagens. A câmera fica sempre do mesmo lado dela.',
    screen: 'Cruzou a linha: o herói, que estava à esquerda, aparece à direita. O público se perde.',
    code: 'Mantenha todos os planos da cena com câmera do mesmo lado do eixo (aqui, z > 0).',
    alt: 'Cena de diálogo: um olha pra direita, o outro pra esquerda, e você entende que estão se olhando. Cruzou a linha, os dois olham pro mesmo lado e parecem conversar com uma parede.',
    demos: [['respect180', 'respeitando a linha'], ['cross180', 'cruzando a linha']],
  },
  {
    id: 'continuity', name: 'Continuity', aka: 'continuidade',
    analogy: 'O copo de café que aparece cheio, depois vazio, depois cheio de novo na mesma conversa.',
    short: 'o copo que enche sozinho',
    definition: 'Manter tudo coerente entre planos: posição de objetos, figurino, luz, direção do olhar.',
    screen: 'Entre o wide e o medium, algo muda de lugar. Depois que você vê, não desvê.',
    code: 'Estado da cena é estado: se um plano muda um objeto, o próximo plano precisa herdar.',
    alt: 'O copo da Starbucks esquecido em Game of Thrones. Uma equipe inteira de continuidade e mesmo assim escapou. Por isso existe a função de continuísta.',
    demos: [['continuity', 'achar o erro']],
  },
];

const QUIZ = [
  {
    id: 'q1',
    text: 'Um push-in começa e termina de supetão, parece robô. O que mudar no GSAP?',
    options: ['duration', 'ease: "power2.inOut"', 'delay', 'repeat'],
    answer: 1,
    why: [
      'Mais longo ou mais curto, linear continua robótico.',
      'O ease faz o movimento acelerar e frear como uma pessoa.',
      'Delay só adia o tranco.',
      'Repeat repete o tranco.',
    ],
  },
  {
    id: 'q2',
    text: 'Plano 1: herói à esquerda olhando pra direita. Plano 2: herói à direita olhando pra esquerda, mesmo diálogo. O que aconteceu?',
    options: ['Match cut', 'A câmera cruzou a linha dos 180°', 'Ease-out', 'Hold'],
    answer: 1,
    why: [
      'Match cut é rima visual intencional.',
      'Cruzou o eixo: o público sente que os personagens trocaram de lugar.',
      'Ease é curva de movimento, não posição.',
      'Hold é pausa.',
    ],
  },
  {
    id: 'q3',
    text: 'No GSAP, qual ferramenta funciona como marcação de beats?',
    options: ['tl.addLabel("beat2")', 'tl.kill()', 'gsap.set()', 'tl.reverse()'],
    answer: 0,
    why: [
      'Labels nomeiam momentos da timeline. Cada beat vira um label.',
      'kill destrói a timeline.',
      'set aplica valores sem animar.',
      'reverse toca de trás pra frente.',
    ],
  },
];

const lesson = createLesson({ key: 'm5', terms: TERMS, quiz: QUIZ, achievement: ACHIEVEMENT });
lesson.state.compared ??= false;

const extraSteps = () => [
  [lesson.state.compared, 'linear × power2.inOut × expo.out'],
  [lesson.state.challenge, 'Dois movimentos com um hold que respira'],
];

function stopRun() {
  ui.run?.kill();
  ui.run = null;
  gsap.killTweensOf(fadeOverlay());
  fadeOverlay().style.opacity = '0';
}

function prepare(tag) {
  stopRun();
  if (sandboxState.compareShots) setCompare(null);
  if (ui.challengeActive) exitChallenge();
  killShotMotion(camA);
  placeHeroOnMark();
  placeShot(camA, pose(HOME.pos.toArray(), HOME.target.toArray()));
  caption('');
  snapshotBaseline();
  sandboxState.tags.A = tag;
  refreshFrameLabels();
  progress.takes += 1;
}

function easeCurvePath(ease, width = 160, height = 90) {
  const curve = gsap.parseEase(ease);
  const points = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    return `${(t * width).toFixed(1)},${(height - curve(t) * height).toFixed(1)}`;
  });
  return `M${points.join(' L')}`;
}

function renderEaseCurve() {
  const path = $('ease-path');
  if (path) path.setAttribute('d', easeCurvePath(ui.ease));
  const label = $('ease-label');
  if (label) label.textContent = ui.ease;
}

function moveEaseDot(progressValue) {
  const dot = $('ease-dot');
  if (!dot) return;
  const y = gsap.parseEase(ui.ease)(progressValue);
  dot.setAttribute('cx', (progressValue * 160).toFixed(1));
  dot.setAttribute('cy', (90 - y * 90).toFixed(1));
}

function renderBeats(beats, activeIndex = -1) {
  ui.beats = beats;
  const bar = $('beatbar');
  if (!bar) return;
  const total = beats.reduce((sum, b) => sum + b.seconds, 0) || 1;
  bar.innerHTML = `${beats.map((b, i) => `<span class="beat ${b.hold ? 'is-hold' : ''} ${i === activeIndex ? 'is-active' : ''}" style="flex:${b.seconds / total}">${b.label}</span>`).join('')}<i class="playhead" id="playhead"></i>`;
  bar.hidden = beats.length === 0;
}

function movePlayhead(progressValue) {
  const head = $('playhead');
  if (head) head.style.left = `${progressValue * 100}%`;
}

function runSequence(beats, tag, code) {
  prepare(tag);
  renderBeats(beats);
  ui.run = playSequence(
    beats.map(b => ({ label: b.label, seconds: dur(b.seconds), start: () => b.start?.() })),
    { onUpdate: movePlayhead },
  );
  showCode({ label: tag, notes: ['cada label é um beat. o hold é um tween vazio.'], code });
}

function pushIn(ease, seconds = ui.duration, tag = ease) {
  prepare(tag);
  ui.ease = ease;
  renderEaseCurve();
  const tween = dolly(camA, 1, dur(seconds), ease);
  tween.eventCallback('onUpdate', () => moveEaseDot(tween.progress()));
  camA.active = tween;
  renderBeats([]);
  showCode({
    label: `Push-in · ${ease}`,
    notes: [ease === 'none' ? 'linear: velocidade constante, começo e fim no tranco.' : 'acelera no começo, freia no fim.'],
    code: `gsap.to(camera.position, { z: 4, duration: ${seconds}, ease: "${ease}" })`,
  });
}

const beatsWithHold = hold => [
  { label: 'push-in', seconds: 2, start: () => dolly(camA, 1, dur(2), 'power2.inOut') },
  ...(hold ? [{ label: 'hold', seconds: hold, hold: true }] : []),
  { label: 'pan', seconds: 1.6, start: () => pan(camA, 1, dur(1.6), 0.34, 'power2.inOut') },
];

const threeBeats = scale => [
  { label: 'beat 1', seconds: 2 * scale, start: () => dolly(camA, 1, dur(2 * scale), 'power2.inOut') },
  { label: 'hold', seconds: 0.9 * scale, hold: true },
  { label: 'beat 2', seconds: 1.6 * scale, start: () => pan(camA, 1, dur(1.6 * scale), 0.34, 'power2.inOut') },
  { label: 'hold', seconds: 0.6 * scale, hold: true },
  { label: 'beat 3', seconds: 2.2 * scale, start: () => crane(camA, 1, dur(2.2 * scale), 'power2.inOut') },
];

const beatsCode = scale => `gsap.timeline()\n  .addLabel("beat1").to(camera.position, { z: 4, duration: ${2 * scale}, ease: "power2.inOut" })\n  .to({}, { duration: ${(0.9 * scale).toFixed(2)} })\n  .addLabel("beat2").to(camera.rotation, { y: "-=0.34", duration: ${(1.6 * scale).toFixed(2)} })\n  .to({}, { duration: ${(0.6 * scale).toFixed(2)} })\n  .addLabel("beat3").to(camera.position, { y: 4.8, duration: ${(2.2 * scale).toFixed(2)} })`;

function cutTo(nextPose, tagText) {
  return () => {
    placeShot(camA, nextPose);
    sandboxState.tags.A = tagText;
    refreshFrameLabels();
  };
}

function matchCutPoses() {
  const headPose = pose([0, 1.81, 0.95], HEAD.toArray());
  const camPos = new THREE.Vector3(0, 1.0, 3);
  const headFill = Math.tan(Math.asin(HEAD_RADIUS / 0.95)) / Math.tan(THREE.MathUtils.degToRad(camA.cam.fov) / 2);
  const moonTan = 2 / camPos.distanceTo(moon.position);
  const moonFocal = (SENSOR_HEIGHT_MM / 2) * headFill / moonTan;
  return { headPose, moonPose: pose(camPos.toArray(), moon.position.toArray(), moonFocal), moonFocal };
}

const DEMOS = {
  linear: { term: 'easing', run: () => pushIn('none') },
  eased: { term: 'easing', run: () => pushIn('power2.inOut') },
  easeIn: { term: 'inOut', run: () => pushIn('power2.in') },
  easeOut: { term: 'inOut', run: () => pushIn('power2.out') },
  withHold: { term: 'hold', run: () => runSequence(beatsWithHold(1.2), 'com hold', 'gsap.timeline()\n  .to(camera.position, { z: 4, duration: 2, ease: "power2.inOut" })\n  .to({}, { duration: 1.2 })\n  .to(camera.rotation, { y: "-=0.34", duration: 1.6, ease: "power2.inOut" })') },
  withoutHold: { term: 'hold', run: () => runSequence(beatsWithHold(0), 'sem hold', 'gsap.timeline()\n  .to(camera.position, { z: 4, duration: 2, ease: "power2.inOut" })\n  .to(camera.rotation, { y: "-=0.34", duration: 1.6, ease: "power2.inOut" })') },
  beats: { term: 'beat', run: () => runSequence(threeBeats(1), '3 beats', beatsCode(1)) },
  slowPace: { term: 'pacing', run: () => runSequence(threeBeats(1.7), 'pacing lento', `${beatsCode(1)}\n  .timeScale(0.6)`) },
  fastPace: { term: 'pacing', run: () => runSequence(threeBeats(0.55), 'pacing rápido', `${beatsCode(1)}\n  .timeScale(1.8)`) },
  cut: {
    term: 'cut',
    run: () => {
      prepare('cut');
      placeShot(camA, composePose({ framing: 'wide' }));
      ui.run = gsap.timeline().call(cutTo(composePose({ framing: 'closeUp' }), 'cut → close-up'), [], dur(1.4));
      showCode({ label: 'Cut', notes: ['troca de plano no mesmo frame. sem animação.'], code: 'tl.call(() => {\n  camera.position.copy(closeUp.position)\n  camera.lookAt(closeUp.target)\n}, [], 1.4)' });
    },
  },
  fade: {
    term: 'cut',
    run: () => {
      prepare('fade');
      placeShot(camA, composePose({ framing: 'wide' }));
      const overlay = fadeOverlay();
      ui.run = gsap.timeline()
        .to(overlay, { opacity: 1, duration: dur(0.7), ease: 'power1.in' }, dur(1.2))
        .call(cutTo(composePose({ framing: 'closeUp' }), 'fade → close-up'))
        .to(overlay, { opacity: 0, duration: dur(0.7), ease: 'power1.out' }, `+=${dur(0.3)}`);
      showCode({ label: 'Fade', notes: ['escurece, troca no escuro, clareia.'], code: 'gsap.timeline()\n  .to(blackOverlay, { opacity: 1, duration: 0.7 })\n  .call(cutToCloseUp)\n  .to(blackOverlay, { opacity: 0, duration: 0.7 }, "+=0.3")' });
    },
  },
  matchCut: {
    term: 'matchCut',
    run: () => {
      prepare('match cut');
      const { headPose, moonPose, moonFocal } = matchCutPoses();
      placeShot(camA, headPose);
      ui.run = gsap.timeline()
        .call(cutTo(moonPose, `lua · ${Math.round(moonFocal)}mm`), [], dur(1.8))
        .call(() => caption(`cabeça → lua. pra caber igual, ${Math.round(moonFocal)}mm`), []);
      showCode({
        label: 'Match cut',
        notes: ['mesma forma, mesmo lugar, mesmo tamanho no quadro.', 'a lua está a ~53m: precisa de tele forte pra ficar do tamanho da cabeça.'],
        code: `shotA: camera.lookAt(hero.head); focal 35\nshotB: camera.lookAt(moon); focal ${Math.round(moonFocal)}`,
      });
    },
  },
  respect180: { term: 'rule180', run: () => twoShotCut(TWO_SHOT.partnerSameSide, 'mesmo lado', 'Mesmo lado da linha: o parceiro continua olhando pra esquerda, na direção do herói.') },
  cross180: { term: 'rule180', run: () => twoShotCut(TWO_SHOT.crossed, 'cruzou!', 'Cruzou a linha: o herói pulou da esquerda pra direita. Parece outra cena.') },
  continuity: {
    term: 'continuity',
    run: () => {
      prepare('continuidade');
      placeShot(camA, composePose({ framing: 'wide' }));
      ui.run = gsap.timeline()
        .call(() => {
          crates[1].position.set(0.75, 0.25, 0.45);
          heroVisor.color.setHex(COLOR.alert);
          heroVisor.emissive.setHex(COLOR.alert);
          cutTo(composePose({ framing: 'medium' }), 'medium')();
        }, [], dur(1.8))
        .call(() => caption('Achou? O visor mudou de cor e um caixote surgiu do lado dele.'), [], `+=${dur(2.2)}`);
      showCode({ label: 'Continuity', notes: ['dois erros no corte. o reset do sandbox conserta.'], code: 'crate.position.set(0.75, 0.25, 0.45) // não estava aqui no wide\nvisor.color.set("#f07a66")          // nem dessa cor' });
    },
  },
};

function twoShotCut(nextPose, tag, explanation) {
  prepare('master');
  setTwoShotScene(true);
  placeShot(camA, TWO_SHOT.master);
  caption('linha vermelha no chão = eixo da cena');
  ui.run = gsap.timeline()
    .call(cutTo(nextPose, tag), [], dur(1.8))
    .call(() => caption(explanation), []);
  showCode({
    label: '180°',
    notes: ['a linha liga herói e parceiro. todos os planos do lado z > 0.'],
    code: `master:  camera.position.set(0, 1.6, 6.5)\n${tag}: camera.position.set(${nextPose.pos.toArray().map(v => v.toFixed(1)).join(', ')})`,
  });
}

function runEaseComparison() {
  stopRun();
  if (ui.challengeActive) exitChallenge();
  placeHeroOnMark();
  setCompare([camA, camB, camC]);
  const eases = ['none', 'power2.inOut', 'expo.out'];
  [camA, camB, camC].forEach(shot => {
    killShotMotion(shot);
    placeShot(shot, pose(HOME.pos.toArray(), HOME.target.toArray()));
  });
  snapshotBaseline();
  [camA, camB, camC].forEach((shot, i) => {
    shot.active = gsap.to(shot.rig.pos, { z: 3.2, duration: dur(2.8), ease: eases[i], delay: dur(0.4) });
  });
  Object.assign(sandboxState.tags, { A: 'none', B: 'power2.inOut', C: 'expo.out' });
  refreshFrameLabels();
  showCode({
    label: '3 eases',
    notes: ['mesmo push-in, mesma duração. só a curva muda.', 'A robô · B operador de câmera · C chegada com freio de mão.'],
    code: 'gsap.to(camA.position, { z: 3.2, duration: 2.8, ease: "none" })\ngsap.to(camB.position, { z: 3.2, duration: 2.8, ease: "power2.inOut" })\ngsap.to(camC.position, { z: 3.2, duration: 2.8, ease: "expo.out" })',
  });
  progress.takes += 1;
  lesson.state.compared = true;
  lesson.markSeen('easing');
}

function readChallenge() {
  const c = ui.challenge;
  return {
    move1: $('ch-move1')?.value ?? c.move1,
    ease1: $('ch-ease1')?.value ?? c.ease1,
    dur1: Number($('ch-dur1')?.value ?? c.dur1),
    hold: Number($('ch-hold')?.value ?? c.hold),
    move2: $('ch-move2')?.value ?? c.move2,
    ease2: $('ch-ease2')?.value ?? c.ease2,
    dur2: Number($('ch-dur2')?.value ?? c.dur2),
  };
}

function challengeCode(c) {
  return `gsap.timeline()\n  .addLabel("beat1")\n  .add(${c.move1}({ duration: ${c.dur1}, ease: "${c.ease1}" }))\n  .to({}, { duration: ${c.hold} }) // hold\n  .addLabel("beat2")\n  .add(${c.move2}({ duration: ${c.dur2}, ease: "${c.ease2}" }))`;
}

function runChallenge() {
  const c = readChallenge();
  ui.challenge = c;
  stopRun();
  killShotMotion(camA);
  placeHeroOnMark();
  placeShot(camA, pose(HOME.pos.toArray(), HOME.target.toArray()));
  snapshotBaseline();
  const beats = [
    { label: MOVE_LIBRARY[c.move1].label, seconds: c.dur1, start: () => MOVE_LIBRARY[c.move1].run(camA, dur(c.dur1), c.ease1) },
    ...(c.hold > 0 ? [{ label: 'hold', seconds: c.hold, hold: true }] : []),
    { label: MOVE_LIBRARY[c.move2].label, seconds: c.dur2, start: () => MOVE_LIBRARY[c.move2].run(camA, dur(c.dur2), c.ease2) },
  ];
  renderBeats(beats);
  ui.run = playSequence(beats.map(b => ({ ...b, seconds: dur(b.seconds) })), { onUpdate: movePlayhead });
  ui.run.timeline.eventCallback('onComplete', () => judgeChallenge(c));
  showCode({ label: 'Desafio · beats', notes: ['sua sequência.'], code: challengeCode(c) });
  progress.takes += 1;
  $('ch-result').className = 'ch-result';
  $('ch-result').textContent = sandboxState.motion ? 'Rodando... 🎬' : 'Modo instantâneo: avaliando pelos tempos que você escolheu.';
}

function judgeChallenge(c) {
  const problems = [];
  if (c.hold < 0.5) problems.push(`Hold de ${c.hold}s não dá tempo de respirar. Pelo menos 0.5s.`);
  if (c.hold > 2.5) problems.push(`Hold de ${c.hold}s já virou cochilo. No máximo 2.5s.`);
  if (c.ease1 === 'none' || c.ease2 === 'none') problems.push('Algum movimento está com ease "none": robô detectado. 🤖');
  if (c.dur1 < 1.2 || c.dur2 < 1.2) problems.push('Movimento com menos de 1.2s parece susto, não respiração.');
  const result = $('ch-result');
  if (problems.length) {
    result.className = 'ch-result bad';
    result.textContent = `Corta! ${problems.join(' ')}`;
    return;
  }
  result.className = 'ch-result ok';
  result.textContent = `É take! ${MOVE_LIBRARY[c.move1].label}, respira ${c.hold}s, ${MOVE_LIBRARY[c.move2].label}. Isso tem pulso. 💓`;
  lesson.completeChallenge();
}

function enterChallenge() {
  stopRun();
  if (sandboxState.compareShots) setCompare(null);
  placeHeroOnMark();
  ui.challengeActive = true;
  ui.panelTab = 'challenge';
  sandboxState.tags.A = 'desafio';
  renderControls($('controls'));
  refreshFrameLabels();
  showCode({ label: 'Desafio · beats', notes: ['valores iniciais errados de propósito.'], code: challengeCode(readChallenge()) });
}

function exitChallenge() {
  ui.challengeActive = false;
  sandboxState.tags.A = '';
  if (ui.panelTab === 'challenge') {
    ui.panelTab = 'rhythm';
    renderControls($('controls'));
  }
}

function render(container) {
  container.innerHTML = `
    <div class="hero-title">
      ${slate(5, 'Ritmo')}
      <h1>Ritmo e <em>montagem</em></h1>
      <p class="lede">Você já domina timeline, label e position parameter. Este módulo só dá nome de cinema pro que o GSAP faz: <b>easing é respiração</b>, label é beat, tween vazio é hold.</p>
      <p class="lede-muted">No painel tem a curva do ease com uma bolinha andando nela durante o movimento, e uma barra de beats com playhead quando a demo é uma sequência.</p>
    </div>
    ${lesson.askSection({ number: 1, intro: 'Marque o que já conhece. Easing você conhece de cor, então marca e vem pros termos de montagem.' })}
    ${lesson.termsSection({ number: 2, title: 'Tempo, corte e eixo', intro: 'Aqui a demo é sobre quando e como a câmera muda, não pra onde.' })}
    <section class="section critical" id="critical">
      <span class="eyebrow">3 · Ponto crítico</span>
      <h2>Robô × cinema</h2>
      <p>Easing é o que separa movimento de robô de movimento de cinema. Câmera real tem massa: um operador empurrando um dolly de 200kg não arranca nem para de uma vez.</p>
      <div class="split-table three">
        <div class="neutral"><h4>none</h4><p>Velocidade constante. Começa e para no tranco. Câmera de vigilância.</p></div>
        <div class="pos"><h4>power2.inOut</h4><p>Acelera e freia. Dolly empurrado por gente.</p></div>
        <div class="rot"><h4>expo.out</h4><p>Arranca rápido e pousa devagar. Drone chegando no assunto.</p></div>
      </div>
      <div><button class="btn primary" data-action="compare">▶ Rodar os 3 eases lado a lado</button></div>
      <p>E os labels do GSAP são marcações de beat: <span class="inline-code">tl.addLabel("beat2")</span> é exatamente como um editor anotaria a timeline.</p>
    </section>
    ${lesson.cheatSection(4)}
    ${lesson.quizSection(5)}
    ${lesson.challengeSection({
      number: 6,
      title: 'Dois movimentos e um hold',
      brief: 'Monte uma sequência de 2 movimentos com um hold no meio que respire. Escolha os movimentos, os eases e os tempos.',
      criteria: ['Hold entre 0.5s e 2.5s', 'Nenhum movimento com ease "none"', 'Cada movimento com 1.2s ou mais'],
    })}
    ${lesson.awardSection(7)}`;
}

function easeCurveMarkup() {
  return `<figure class="ease-curve">
    <svg viewBox="-6 -10 172 110" aria-hidden="true">
      <rect x="0" y="0" width="160" height="90" fill="none" stroke="var(--line)"/>
      <path id="ease-path" d="${easeCurvePath(ui.ease)}" fill="none" stroke="var(--tungsten)" stroke-width="2"/>
      <circle id="ease-dot" cx="0" cy="90" r="4.5" fill="var(--daylight)"/>
    </svg>
    <figcaption>tempo → · <b id="ease-label">${ui.ease}</b></figcaption>
  </figure>`;
}

function rhythmPanelMarkup() {
  return `
    <div class="rhythm-top">
      ${easeCurveMarkup()}
      <div class="control-grid">
        ${selectField({ id: 'rh-ease', label: 'Ease', options: EASES.map(e => [e, e]), value: ui.ease })}
        ${rangeField({ id: 'rh-duration', label: 'Duração', min: 0.5, max: 6, step: 0.1, value: ui.duration, format: v => `${Number(v).toFixed(1)} s` })}
        ${rangeField({ id: 'rh-hold', label: 'Hold', min: 0, max: 3, step: 0.1, value: ui.hold, format: v => `${Number(v).toFixed(1)} s` })}
      </div>
    </div>
    <div class="btn-row">
      <button class="btn" data-action="run-push">Push-in com esse ease</button>
      <button class="btn" data-action="run-hold">Push-in + hold + pan</button>
      <button class="btn wide" data-action="compare">3 eases lado a lado</button>
      <button class="btn" data-demo="respect180">180° ok</button>
      <button class="btn" data-demo="cross180">180° cruzado</button>
      <button class="btn" data-demo="matchCut">Match cut</button>
      <button class="btn" data-demo="fade">Fade</button>
    </div>
    <div class="beatbar" id="beatbar" hidden></div>`;
}

function challengePanelMarkup() {
  const c = ui.challenge;
  const moveOptions = CHALLENGE_MOVES.map(key => [key, MOVE_LIBRARY[key].label]);
  const easeOptions = EASES.map(e => [e, e]);
  return `
    <div class="challenge-form three">
      ${selectField({ id: 'ch-move1', label: 'Movimento 1', options: moveOptions, value: c.move1 })}
      ${selectField({ id: 'ch-ease1', label: 'Ease 1', options: easeOptions, value: c.ease1 })}
      ${rangeField({ id: 'ch-dur1', label: 'Duração 1', min: 0.5, max: 5, step: 0.1, value: c.dur1, format: v => `${Number(v).toFixed(1)} s` })}
      ${rangeField({ id: 'ch-hold', label: 'Hold', min: 0, max: 4, step: 0.1, value: c.hold, format: v => `${Number(v).toFixed(1)} s` })}
      ${selectField({ id: 'ch-move2', label: 'Movimento 2', options: moveOptions, value: c.move2 })}
      ${selectField({ id: 'ch-ease2', label: 'Ease 2', options: easeOptions, value: c.ease2 })}
      ${rangeField({ id: 'ch-dur2', label: 'Duração 2', min: 0.5, max: 5, step: 0.1, value: c.dur2, format: v => `${Number(v).toFixed(1)} s` })}
    </div>
    <div class="beatbar" id="beatbar" hidden></div>
    <div class="challenge-actions"><button class="btn primary" data-action="challenge-run">Ação! 🎬</button></div>
    <p class="ch-result" id="ch-result" aria-live="polite">${lesson.state.challenge ? 'Já fechado. Pode montar outras por esporte.' : 'Os valores iniciais estão errados de propósito.'}</p>`;
}

function renderControls(panel) {
  panel.innerHTML = `
    ${panelTabs(ui.panelTab, [['rhythm', 'Ritmo'], ['challenge', 'Desafio']])}
    ${ui.panelTab === 'challenge' ? challengePanelMarkup() : rhythmPanelMarkup()}`;
  if (ui.beats.length) renderBeats(ui.beats);
}

function handleClick(button) {
  if (lesson.handleClick(button)) return;
  const { demo, tab, action } = button.dataset;
  if (demo) {
    DEMOS[demo].run();
    lesson.markSeen(DEMOS[demo].term);
    return;
  }
  if (tab === 'challenge') return enterChallenge();
  if (tab === 'rhythm') return exitChallenge();
  if (action === 'compare') return runEaseComparison();
  if (action === 'open-challenge') return enterChallenge();
  if (action === 'challenge-run') return runChallenge();
  if (action === 'run-push') {
    pushIn(ui.ease, ui.duration);
    lesson.markSeen('easing');
  }
  if (action === 'run-hold') {
    runSequence(beatsWithHold(ui.hold), `hold ${ui.hold.toFixed(1)}s`, `gsap.timeline()\n  .to(camera.position, { z: 4, duration: 2, ease: "power2.inOut" })\n  .to({}, { duration: ${ui.hold.toFixed(1)} })\n  .to(camera.rotation, { y: "-=0.34", duration: 1.6, ease: "power2.inOut" })`);
    lesson.markSeen('hold');
  }
}

function handleInput(event) {
  const { id, value } = event.target;
  if (id === 'rh-ease') {
    ui.ease = value;
    renderEaseCurve();
  } else if (id === 'rh-duration') {
    ui.duration = Number(value);
    $('rh-duration-out').textContent = `${ui.duration.toFixed(1)} s`;
  } else if (id === 'rh-hold') {
    ui.hold = Number(value);
    $('rh-hold-out').textContent = `${ui.hold.toFixed(1)} s`;
  } else if (id.startsWith('ch-')) {
    ui.challenge = readChallenge();
    const out = $(`${id}-out`);
    if (out) out.textContent = `${Number(value).toFixed(1)} s`;
    showCode({ label: 'Desafio · beats', notes: ['sua sequência.'], code: challengeCode(ui.challenge) });
  }
}

export default {
  id: 5,
  title: 'Ritmo e montagem',
  ready: true,
  achievement: ACHIEVEMENT,
  render,
  renderControls,
  handleClick,
  handleInput,
  handleChange: handleInput,
  status: () => lesson.status(extraSteps().map(([done]) => done)),
  refreshProgressUi: () => lesson.refresh(extraSteps()),
  enter() {
    ui.active = true;
    ui.panelTab = 'rhythm';
    ui.beats = [];
  },
  afterReset() {
    stopRun();
    if (ui.challengeActive) exitChallenge();
    ui.beats = [];
    renderBeats([]);
  },
  leave() {
    stopRun();
    if (ui.challengeActive) exitChallenge();
    ui.active = false;
  },
};
