import * as THREE from 'three';
import { camA, camB, camC, hero, leadingLines, HERO_EYE_Y, MONITOR_ASPECT } from '../sandbox/scene.js';
import {
  sandboxState, dur, snapshotBaseline, killShotMotion, placeHeroOnMark, setCompare, setThirds,
  setExtraReadout, refreshFrameLabels, caption,
} from '../sandbox/stage.js';
import { tweenShotTo, placeShot } from '../sandbox/camera-moves.js';
import { composePose, measureHeroFraming, FRAMINGS, ANGLES } from '../sandbox/framing.js';
import { showCode } from '../code-panel.js';
import { slate } from '../course-ui.js';
import { progress } from '../progress.js';
import { createLesson, panelTabs, rangeField } from '../lesson.js';
import { $ } from '../html.js';

const gsap = window.gsap;
const THIRD_SHIFT = 1 / 6;
const POWER_POINT_TOLERANCE = 0.1;

const ui = { active: false, panelTab: 'compose', challengeActive: false, spec: { framing: 'medium', angle: 'eye' }, thirds: false };

const ACHIEVEMENT = { id: 'm3', icon: '📐', name: 'Olho de Terços', desc: 'Tira o herói do meio do quadro sem dó.' };

const THIRDS_FIGURE = `
<svg class="diagram" viewBox="0 0 640 200" role="img" aria-label="Quadro dividido em terços: o herói centralizado à esquerda e no ponto de força à direita.">
  <g>
    <rect x="20" y="20" width="280" height="158" fill="none" stroke="#2c323d"/>
    <circle cx="160" cy="99" r="22" fill="#f0a640"/>
    <text class="lbl" x="20" y="194">lookAt(hero): sempre no meio</text>
  </g>
  <g>
    <rect x="340" y="20" width="280" height="158" fill="none" stroke="#2c323d"/>
    <line x1="433" y1="20" x2="433" y2="178" stroke="#86b8ff" stroke-opacity="0.6"/><line x1="527" y1="20" x2="527" y2="178" stroke="#86b8ff" stroke-opacity="0.6"/>
    <line x1="340" y1="73" x2="620" y2="73" stroke="#86b8ff" stroke-opacity="0.6"/><line x1="340" y1="125" x2="620" y2="125" stroke="#86b8ff" stroke-opacity="0.6"/>
    <circle cx="433" cy="73" r="4" fill="#86b8ff"/><circle cx="527" cy="73" r="4" fill="#86b8ff"/><circle cx="433" cy="125" r="4" fill="#86b8ff"/><circle cx="527" cy="125" r="4" fill="#86b8ff"/>
    <circle cx="433" cy="73" r="22" fill="#f0a640" fill-opacity="0.9"/>
    <text class="lbl" x="340" y="194">herói num ponto de força</text>
  </g>
</svg>`;

const TERMS = [
  {
    id: 'thirds', name: 'Rule of thirds', aka: 'regra dos terços',
    analogy: 'Jogo da velha desenhado por cima do quadro. Os quatro cruzamentos são os lugares nobres da mesa.',
    short: 'jogo da velha no quadro',
    definition: 'Dividir o quadro em 3×3 e colocar o que importa nas linhas ou nos cruzamentos (pontos de força), não no meio.',
    screen: 'O herói sai do centro e o quadro ganha respiro e direção.',
    code: 'camera.setViewOffset desloca o quadro sem girar a câmera. Ou mire num ponto ao lado do herói.',
    alt: 'Abre a câmera do celular e liga a "grade". Aquilo é a regra dos terços. Tira uma foto do seu café no meio e outra no cruzamento: a segunda parece foto de cafeteria cara.',
    figure: THIRDS_FIGURE,
    demos: [['thirds', 'herói no terço']],
  },
  {
    id: 'leading', name: 'Leading lines', aka: 'linhas guia',
    analogy: 'Trilho de trem na foto: seu olho corre por ele até o horizonte, quer você queira, quer não.',
    short: 'trilho de trem levando o olho',
    definition: 'Linhas da cena que levam o olho até o assunto.',
    screen: 'As faixas laranja do chão convergem no herói. O olho escorrega até ele.',
    code: 'Posicione a câmera no eixo das linhas e baixe a altura: camera.position.set(0, 0.9, 10).',
    alt: 'Corredor de hospital em filme de terror: as linhas do teto, do chão e das portas apontam todas pra porta do fundo. Você já sabe que é ali que vai dar ruim.',
    demos: [['leading', 'seguir as linhas']],
  },
  {
    id: 'negative', name: 'Negative space', aka: 'espaço negativo',
    analogy: 'Uma palavra sozinha numa página em branco grita mais alto que um parágrafo inteiro.',
    short: 'palavra sozinha na página',
    definition: 'Espaço vazio de propósito em volta do assunto. O vazio também comunica.',
    screen: 'Herói pequeno num canto, muito chão e céu vazio. Solidão, escala, silêncio.',
    code: 'Plano aberto + setViewOffset empurrando o herói pra um canto.',
    alt: 'Landing page da Apple: um produto e um oceano de branco. O vazio diz "isso aqui é importante" sem escrever nada.',
    demos: [['negative', 'espaço negativo']],
  },
  {
    id: 'headroom', name: 'Headroom', aka: 'espaço acima da cabeça',
    analogy: 'Pendurar um quadro: nem colado no teto, nem lá embaixo perto do rodapé.',
    short: 'quadro pendurado na altura certa',
    definition: 'O espaço entre o topo da cabeça e a borda de cima do quadro.',
    screen: 'Pouco demais aperta, demais deixa o herói afundando. O certo é um respiro curto.',
    code: 'Ajuste o target.y ou o shift vertical: shift.y negativo empurra o herói pra baixo no quadro.',
    alt: 'Videochamada com o colega que deixa a webcam mostrando só a testa e o teto. Isso é headroom demais. E aquele que corta a testa é headroom de menos.',
    demos: [['headroomGood', 'na medida'], ['headroomTooMuch', 'demais'], ['headroomCut', 'cortou']],
  },
  {
    id: 'leadRoom', name: 'Lead room', aka: 'look room',
    analogy: 'Dar espaço na frente de quem anda na calçada. Ninguém gosta de andar com a cara na parede.',
    short: 'espaço na frente de quem anda',
    definition: 'Deixar espaço no quadro do lado pra onde o herói olha ou anda.',
    screen: 'Herói no terço esquerdo olhando pra direita: confortável. No terço direito olhando pra direita: claustrofóbico.',
    code: 'Combine hero.rotation.y com o lado do shift: olha pra +x, desloca o quadro com shift.x positivo.',
    alt: 'Lado a lado: mesmo herói, mesma pose, só trocou de terço. Num ele olha pro mundo, no outro ele olha pra borda da tela como quem perdeu a chave.',
    demos: [['leadRoomGood', 'espaço na frente'], ['leadRoomBad', 'cara na borda']],
  },
  {
    id: 'framing', name: 'Framing', aka: 'wide · medium · close-up · ECU',
    analogy: 'Foto de viagem: a paisagem com você (wide), você da cintura pra cima (medium), seu rosto (close-up), seu olho (extreme close-up).',
    short: 'paisagem → cintura → rosto → olho',
    definition: 'O tamanho do herói no quadro. Cada degrau aproxima a emoção.',
    screen: 'Wide mostra onde; medium mostra o que faz; close-up mostra o que sente; ECU mostra um detalhe.',
    code: 'Distância da câmera (ou focal) + target.y: wide 13m, medium 2.3m, close-up 1.25m, ECU 0.55m (a 35mm).',
    alt: 'Novela: briga começa no medium, e quando alguém fala a frase bombástica a câmera corta pro close-up. A emoção sobe, o plano fecha.',
    demos: [['wide', 'wide'], ['medium', 'medium'], ['closeUp', 'close-up'], ['extremeCloseUp', 'ECU']],
  },
  {
    id: 'eye', name: 'Eye level', aka: 'altura dos olhos',
    analogy: 'Conversa de igual pra igual, sentados na mesma mesa.',
    short: 'conversa na mesma mesa',
    definition: 'Câmera na altura dos olhos do herói. O ângulo neutro.',
    screen: 'Nem poderoso nem frágil. O público fica "do lado" do herói.',
    code: `camera.position.y = ${HERO_EYE_Y} (altura do olho do herói).`,
    alt: 'Telejornal: o apresentador sempre na altura da câmera. Ninguém quer um âncora olhando você de cima.',
    demos: [['eye', 'eye level']],
  },
  {
    id: 'high', name: 'High angle', aka: 'plongée',
    analogy: 'Um adulto olhando uma criança de cima.',
    short: 'adulto olhando criança',
    definition: 'Câmera acima do herói, olhando pra baixo.',
    screen: 'O herói fica menor, mais vulnerável, quase esmagado pelo chão.',
    code: 'camera.position.y bem acima do target.y.',
    alt: 'Cena do personagem derrotado na chuva, câmera lá de cima. Você sente pena dele antes de entender o porquê.',
    demos: [['high', 'high angle']],
  },
  {
    id: 'low', name: 'Low angle', aka: 'contra-plongée',
    analogy: 'Uma criança olhando um adulto de baixo.',
    short: 'criança olhando adulto',
    definition: 'Câmera abaixo do herói, olhando pra cima.',
    screen: 'O herói fica grande, imponente, com o céu atrás.',
    code: 'camera.position.y baixo (0.2 a 1m) com target no peito ou rosto.',
    alt: 'Todo pôster de super-herói: câmera no chão, herói contra o céu. Ninguém faz pôster de herói visto de cima.',
    demos: [['low', 'low angle']],
  },
  {
    id: 'dutch', name: 'Dutch angle', aka: 'câmera inclinada',
    analogy: 'O mundo depois de três voltas na cadeira giratória.',
    short: 'depois de girar na cadeira',
    definition: 'Câmera girada no próprio eixo, com o horizonte torto.',
    screen: 'Tudo fica instável: tensão, loucura, algo errado.',
    code: 'Depois do lookAt: camera.rotateZ(0.35). Aparece em rotation.z.',
    alt: 'Filmes do Batman dos anos 60 usavam dutch angle em toda cena de vilão. Torto = gente do mal. Até hoje funciona.',
    demos: [['dutch', 'dutch 20°']],
  },
  {
    id: 'symmetry', name: 'Symmetry', aka: 'simetria',
    analogy: 'Corredor de palácio: tudo espelhado, você no meio.',
    short: 'corredor de palácio',
    definition: 'Assunto no centro exato, com a cena espelhada dos dois lados. A exceção que quebra a regra dos terços.',
    screen: 'Ordem, controle, às vezes estranheza. As linhas guia formam um V perfeito no herói.',
    code: 'lookAt no herói, câmera em x = 0 no eixo da cena, sem shift e sem roll.',
    alt: 'Wes Anderson e Kubrick: quase todo plano é simétrico. Quando o diretor centraliza de propósito, ele quer que você sinta o controle (ou o desconforto).',
    demos: [['symmetry', 'simetria']],
  },
];

const QUIZ = [
  {
    id: 'q1',
    text: 'Herói olhando pra direita, no terço direito do quadro. O que está errado?',
    options: ['Headroom', 'Lead room', 'Symmetry', 'Nada'],
    answer: 1,
    why: [
      'Headroom é o espaço acima da cabeça. O problema aqui é na frente dele.',
      'Ele está olhando pra borda. Falta espaço na direção do olhar.',
      'Simetria nem entra na conversa: ele já está fora do centro.',
      'Funciona só se a intenção for claustrofobia.',
    ],
  },
  {
    id: 'q2',
    text: 'Você usa camera.lookAt(hero) e quer o herói no terço esquerdo sem girar a câmera. Usa:',
    options: ['camera.fov', 'camera.setViewOffset', 'camera.near', 'hero.scale'],
    answer: 1,
    why: [
      'fov muda o quanto você vê, não onde o herói fica.',
      'setViewOffset desloca a janela da projeção. A câmera continua apontada pro herói.',
      'near é plano de corte.',
      'Mudar o tamanho do herói não muda onde ele está no quadro.',
    ],
  },
  {
    id: 'q3',
    text: 'Câmera abaixo dos olhos do herói, olhando pra cima. Que ângulo é e o que costuma comunicar?',
    options: ['High angle, fragilidade', 'Low angle, poder', 'Dutch angle, tensão', 'Eye level, neutralidade'],
    answer: 1,
    why: [
      'High angle é de cima pra baixo.',
      'Low angle faz o herói crescer no quadro.',
      'Dutch é inclinar o horizonte, não mudar a altura.',
      'Eye level é na altura dos olhos.',
    ],
  },
];

const lesson = createLesson({ key: 'm3', terms: TERMS, quiz: QUIZ, achievement: ACHIEVEMENT });
lesson.state.compared ??= false;

const extraSteps = () => [
  [lesson.state.compared, 'lookAt × setViewOffset × mirar ao lado'],
  [lesson.state.challenge, 'Ponto de força em low angle'],
];

function prepare(tag) {
  if (sandboxState.compareShots) setCompare(null);
  if (ui.challengeActive) exitChallenge();
  killShotMotion(camA);
  placeHeroOnMark();
  snapshotBaseline();
  caption('');
  sandboxState.tags.A = tag;
  refreshFrameLabels();
  progress.takes += 1;
}

function compose(spec, tag, { codeNote, heroTurn = 0 } = {}) {
  prepare(tag);
  ui.spec = { framing: spec.framing ?? 'medium', angle: spec.angle ?? 'eye' };
  hero.rotation.y = heroTurn;
  const pose = composePose({ ...ui.spec, shift: spec.shift ?? { x: 0, y: 0 } });
  camA.active = tweenShotTo(camA, pose, dur(1.5));
  camA.active.eventCallback('onComplete', syncControls);
  showCode({
    label: tag,
    notes: [codeNote],
    code: poseCode(pose, heroTurn),
  });
}

function poseCode(pose, heroTurn) {
  const lines = [
    `camera.position.set(${pose.pos.x.toFixed(2)}, ${pose.pos.y.toFixed(2)}, ${pose.pos.z.toFixed(2)})`,
    `camera.lookAt(0, ${pose.target.y.toFixed(2)}, 0)`,
  ];
  if (pose.roll) lines.push(`camera.rotateZ(${pose.roll.toFixed(2)})`);
  if (pose.shift.x || pose.shift.y) lines.push(`camera.setViewOffset(1, 1, ${pose.shift.x.toFixed(3)}, ${pose.shift.y.toFixed(3)}, 1, 1)`);
  if (heroTurn) lines.push(`hero.rotation.y = ${heroTurn.toFixed(2)}`);
  return lines.join('\n');
}

function showThirds(on) {
  ui.thirds = on;
  setThirds(on);
  const toggle = $('thirds-toggle');
  if (toggle) toggle.setAttribute('aria-pressed', String(on));
}

function pulseLeadingLines() {
  const materials = leadingLines.map(line => line.material);
  gsap.killTweensOf(materials);
  gsap.fromTo(materials, { opacity: 0.75 }, { opacity: 1, duration: dur(0.35), repeat: 5, yoyo: true, onComplete: () => materials.forEach(m => { m.opacity = 0.75; }) });
}

const DEMOS = {
  thirds: {
    term: 'thirds',
    run: () => {
      showThirds(true);
      compose({ framing: 'medium', shift: { x: THIRD_SHIFT, y: 0 } }, 'terços', { codeNote: 'shift.x = 1/6 do quadro empurra o herói do centro (1/2) pro terço (1/3).' });
    },
  },
  leading: {
    term: 'leading',
    run: () => {
      showThirds(false);
      prepare('linhas guia');
      const pose = { pos: new THREE.Vector3(0, 0.9, 10.5), target: new THREE.Vector3(0, 1.1, 0), roll: 0, focal: 35, shift: { x: 0, y: 0 } };
      camA.active = tweenShotTo(camA, pose, dur(1.5));
      pulseLeadingLines();
      showCode({ label: 'Leading lines', notes: ['câmera no eixo das faixas e mais baixa: elas convergem no herói.'], code: poseCode(pose, 0) });
    },
  },
  negative: {
    term: 'negative',
    run: () => {
      showThirds(true);
      compose({ framing: 'wide', shift: { x: -0.22, y: -0.18 } }, 'espaço negativo', { codeNote: 'plano aberto e o herói empurrado pro canto: o vazio vira assunto.' });
    },
  },
  headroomGood: { term: 'headroom', run: () => compose({ framing: 'closeUp' }, 'headroom ok', { codeNote: 'um respiro curto acima da cabeça.' }) },
  headroomTooMuch: { term: 'headroom', run: () => compose({ framing: 'closeUp', shift: { x: 0, y: -0.22 } }, 'headroom demais', { codeNote: 'shift.y negativo: o herói afunda no quadro.' }) },
  headroomCut: { term: 'headroom', run: () => compose({ framing: 'closeUp', shift: { x: 0, y: 0.16 } }, 'cortou a cabeça', { codeNote: 'shift.y positivo: a testa foi embora.' }) },
  leadRoomGood: {
    term: 'leadRoom',
    run: () => {
      showThirds(true);
      compose({ framing: 'medium', shift: { x: THIRD_SHIFT, y: 0 } }, 'lead room', { heroTurn: Math.PI / 2, codeNote: 'herói olha pra direita, então fica no terço esquerdo.' });
    },
  },
  leadRoomBad: {
    term: 'leadRoom',
    run: () => {
      showThirds(true);
      compose({ framing: 'medium', shift: { x: -THIRD_SHIFT, y: 0 } }, 'cara na borda', { heroTurn: Math.PI / 2, codeNote: 'mesmo olhar, terço errado: ele encara a borda do quadro.' });
    },
  },
  wide: { term: 'framing', run: () => compose({ framing: 'wide' }, 'wide', { codeNote: 'wide: mostra onde a cena acontece.' }) },
  medium: { term: 'framing', run: () => compose({ framing: 'medium' }, 'medium', { codeNote: 'medium: da cintura pra cima. mostra o que o herói faz.' }) },
  closeUp: { term: 'framing', run: () => compose({ framing: 'closeUp' }, 'close-up', { codeNote: 'close-up: rosto e ombros. mostra o que ele sente.' }) },
  extremeCloseUp: { term: 'framing', run: () => compose({ framing: 'extremeCloseUp' }, 'ECU', { codeNote: 'extreme close-up: um detalhe. aqui, o visor.' }) },
  eye: { term: 'eye', run: () => compose({ framing: ui.spec.framing, angle: 'eye' }, 'eye level', { codeNote: 'câmera na altura do olho do herói.' }) },
  high: { term: 'high', run: () => compose({ framing: ui.spec.framing, angle: 'high' }, 'high angle', { codeNote: 'câmera acima, olhando pra baixo.' }) },
  low: { term: 'low', run: () => compose({ framing: ui.spec.framing, angle: 'low' }, 'low angle', { codeNote: 'câmera abaixo, olhando pra cima.' }) },
  dutch: { term: 'dutch', run: () => compose({ framing: ui.spec.framing, angle: 'dutch' }, 'dutch', { codeNote: 'rotateZ depois do lookAt inclina o horizonte.' }) },
  symmetry: {
    term: 'symmetry',
    run: () => {
      showThirds(false);
      prepare('simetria');
      const pose = { pos: new THREE.Vector3(0, 1.84, 11), target: new THREE.Vector3(0, 1.4, 0), roll: 0, focal: 35, shift: { x: 0, y: 0 } };
      camA.active = tweenShotTo(camA, pose, dur(1.5));
      caption('herói no eixo, linhas em V');
      showCode({ label: 'Symmetry', notes: ['x = 0, sem shift, sem roll. o centro vira o assunto.'], code: poseCode(pose, 0) });
    },
  },
};

function aimBesideTarget(distance) {
  const halfWidth = Math.tan(THREE.MathUtils.degToRad(camC.cam.fov) / 2) * MONITOR_ASPECT;
  return halfWidth * distance / 3;
}

function runCenteringComparison() {
  if (ui.challengeActive) exitChallenge();
  placeHeroOnMark();
  setCompare([camA, camB, camC]);
  showThirds(true);
  const base = composePose({ framing: 'medium' });
  const distance = base.pos.distanceTo(base.target);
  [camA, camB, camC].forEach(shot => {
    killShotMotion(shot);
    placeShot(shot, base);
  });
  snapshotBaseline();
  camB.active = gsap.to(camB.shift, { x: THIRD_SHIFT, duration: dur(1.4), ease: 'power2.inOut' });
  camC.active = gsap.to(camC.rig.target, { x: aimBesideTarget(distance), duration: dur(1.4), ease: 'power2.inOut' });
  Object.assign(sandboxState.tags, { A: 'lookAt(hero)', B: 'setViewOffset', C: 'mira ao lado' });
  refreshFrameLabels();
  showCode({
    label: 'Tirar do centro',
    notes: ['A: lookAt sempre centraliza.', 'B: desloca a janela; a câmera continua apontada pro herói.', 'C: aponta pra um ponto ao lado; vira um pan, e a perspectiva gira junto.'],
    code: `camA.lookAt(hero.position)\n\ncamB.lookAt(hero.position)\ncamB.setViewOffset(1, 1, ${THIRD_SHIFT.toFixed(3)}, 0, 1, 1)\n\ncamC.lookAt(hero.position.x + ${aimBesideTarget(distance).toFixed(2)}, 1.45, 0)`,
  });
  progress.takes += 1;
  lesson.state.compared = true;
  lesson.markSeen('thirds');
}

function nearestPowerPoint() {
  const { eye, headInFrame } = measureHeroFraming(camA);
  const points = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([x, y]) => ({ x: x / 3, y: y / 3 }));
  const distances = points.map(p => Math.hypot(eye.x - p.x, eye.y - p.y));
  const best = Math.min(...distances);
  return { distance: best, headInFrame };
}

function isLowAngle() {
  return camA.rig.pos.y < HERO_EYE_Y - 0.5 && camA.rig.target.y > camA.rig.pos.y;
}

function updateChallengeHud() {
  if (!ui.challengeActive) return;
  const { distance } = nearestPowerPoint();
  const hud = document.querySelector('#frame-a .frame-hud');
  hud.hidden = false;
  hud.textContent = `olho → ponto de força: ${distance.toFixed(2)} · ${isLowAngle() ? 'low angle ✔' : 'não é low angle'}`;
}

function judgeChallenge() {
  const { distance, headInFrame } = nearestPowerPoint();
  const result = $('ch-result');
  const problems = [];
  if (!isLowAngle()) problems.push('Ainda não é low angle: a câmera precisa ficar bem abaixo dos olhos do herói, olhando pra cima.');
  if (!headInFrame) problems.push('A cabeça do herói saiu do quadro.');
  if (distance > POWER_POINT_TOLERANCE) problems.push(`O olho dele está a ${distance.toFixed(2)} do ponto de força mais perto. Precisa ficar abaixo de ${POWER_POINT_TOLERANCE}.`);
  if (problems.length) {
    result.className = 'ch-result bad';
    result.textContent = `Corta! ${problems.join(' ')}`;
    return;
  }
  result.className = 'ch-result ok';
  result.textContent = 'É take! Low angle, olho no ponto de força. Isso dava pôster. 🖼️';
  lesson.completeChallenge();
}

function enterChallenge() {
  if (sandboxState.compareShots) setCompare(null);
  killShotMotion(camA);
  placeHeroOnMark();
  placeShot(camA, composePose({ framing: 'medium' }));
  showThirds(true);
  ui.challengeActive = true;
  ui.panelTab = 'challenge';
  sandboxState.tags.A = 'desafio';
  snapshotBaseline();
  renderControls($('controls'));
  refreshFrameLabels();
  showCode({
    label: 'Desafio · terços em low angle',
    notes: ['abaixe a câmera e desloque o quadro até o olho cair num cruzamento.'],
    code: 'camera.position.y = altura\ncamera.setViewOffset(1, 1, shiftX, shiftY, 1, 1)',
  });
}

function exitChallenge() {
  ui.challengeActive = false;
  sandboxState.tags.A = '';
  document.querySelector('#frame-a .frame-hud').hidden = true;
  if (ui.panelTab === 'challenge') {
    ui.panelTab = 'compose';
    renderControls($('controls'));
  }
}

function syncControls() {
  const set = (id, value, text) => {
    const input = $(id);
    if (!input) return;
    input.value = value;
    $(`${id}-out`).textContent = text;
  };
  set('comp-height', camA.rig.pos.y, `${camA.rig.pos.y.toFixed(2)} m`);
  set('comp-distance', camA.rig.pos.distanceTo(camA.rig.target), `${camA.rig.pos.distanceTo(camA.rig.target).toFixed(1)} m`);
  set('comp-shift-x', camA.shift.x, camA.shift.x.toFixed(2));
  set('comp-shift-y', camA.shift.y, camA.shift.y.toFixed(2));
  set('comp-roll', THREE.MathUtils.radToDeg(camA.rig.roll), `${Math.round(THREE.MathUtils.radToDeg(camA.rig.roll))}°`);
}

function render(container) {
  container.innerHTML = `
    <div class="hero-title">
      ${slate(3, 'Composição')}
      <h1>Compo<em>sição</em></h1>
      <p class="lede">Até aqui a pergunta era "onde está a câmera?". Agora é "onde o herói aparece <b>no quadro</b>?". Mesma cena, mesma câmera, outra história dependendo de onde ele cai.</p>
      <p class="lede-muted">Liga a grade de terços no painel. Os sliders mexem em altura, distância, shift (setViewOffset) e roll da Cam A.</p>
    </div>
    ${lesson.askSection({ number: 1, intro: 'Marque o que já conhece. Se você já ligou a grade da câmera do celular, a regra dos terços está meio caminho andado.' })}
    ${lesson.termsSection({ number: 2, title: 'Onde cada coisa cai', intro: 'Analogia, frase, demo. Repare que vários termos mudam só shift e roll, não a posição.' })}
    <section class="section critical" id="critical">
      <span class="eyebrow">3 · Ponto crítico</span>
      <h2>Quadro ≠ mundo</h2>
      <p>Composição é onde o herói fica <b>no quadro</b>, não no mundo. E o vício do three.js é <span class="inline-code">camera.lookAt(hero)</span>: ele sempre deixa o herói no meio. Pra tirar do centro tem dois caminhos:</p>
      <div class="split-table">
        <div class="pos"><h4>setViewOffset · shift</h4><p>Desloca a janela da projeção. A câmera continua apontada pro herói e as linhas verticais continuam retas. É a lente shift de arquitetura.</p></div>
        <div class="rot"><h4>Mirar ao lado</h4><p>lookAt num ponto do lado do herói. A câmera gira (um pan disfarçado) e a perspectiva gira junto. Mais natural, menos preciso.</p></div>
      </div>
      <div><button class="btn primary" data-action="compare">▶ Rodar lookAt × setViewOffset × mirar ao lado</button></div>
    </section>
    ${lesson.cheatSection(4)}
    ${lesson.quizSection(5)}
    ${lesson.challengeSection({
      number: 6,
      title: 'Ponto de força em low angle',
      brief: 'Enquadre o herói com o olho num dos quatro cruzamentos da grade, com a câmera abaixo dele olhando pra cima.',
      criteria: ['Low angle: câmera bem abaixo dos olhos do herói', 'Cabeça inteira no quadro', 'Olho do herói a menos de 0.1 de um ponto de força'],
    })}
    ${lesson.awardSection(7)}`;
}

function slidersMarkup() {
  return `
    ${rangeField({ id: 'comp-height', label: 'Altura', min: 0.15, max: 8, step: 0.05, value: camA.rig.pos.y, format: v => `${Number(v).toFixed(2)} m` })}
    ${rangeField({ id: 'comp-distance', label: 'Distância', min: 0.6, max: 16, step: 0.1, value: camA.rig.pos.distanceTo(camA.rig.target), format: v => `${Number(v).toFixed(1)} m` })}
    ${rangeField({ id: 'comp-shift-x', label: 'Shift X', min: -0.4, max: 0.4, step: 0.01, value: camA.shift.x, format: v => Number(v).toFixed(2) })}
    ${rangeField({ id: 'comp-shift-y', label: 'Shift Y', min: -0.4, max: 0.4, step: 0.01, value: camA.shift.y, format: v => Number(v).toFixed(2) })}`;
}

function composePanelMarkup() {
  const framingButtons = Object.entries(FRAMINGS).map(([key, f]) => `<button class="btn" data-demo="${key}">${f.label}</button>`).join('');
  const angleButtons = Object.entries(ANGLES).map(([key, a]) => `<button class="btn" data-demo="${key}">${a.label}</button>`).join('');
  return `
    <div class="btn-row">${framingButtons}</div>
    <div class="btn-row">${angleButtons}<button class="btn" id="thirds-toggle" data-action="thirds" aria-pressed="${ui.thirds}">Grade de terços</button></div>
    <div class="control-grid">
      ${slidersMarkup()}
      ${rangeField({ id: 'comp-roll', label: 'Roll (dutch)', min: -35, max: 35, step: 1, value: THREE.MathUtils.radToDeg(camA.rig.roll), format: v => `${Math.round(v)}°` })}
    </div>
    <div class="btn-row"><button class="btn wide" data-action="compare">lookAt × shift × mirar ao lado</button></div>`;
}

function challengePanelMarkup() {
  return `
    <div class="control-grid">${slidersMarkup()}</div>
    <div class="challenge-actions">
      <button class="btn primary" data-action="challenge-judge">Avaliar enquadramento</button>
      <button class="btn" data-action="open-challenge">Recomeçar</button>
    </div>
    <p class="ch-result" id="ch-result" aria-live="polite">${lesson.state.challenge ? 'Já fechado. Pode enquadrar de novo por esporte.' : 'Comece baixando a altura. Depois o shift leva o olho até o cruzamento.'}</p>`;
}

function renderControls(panel) {
  panel.innerHTML = `
    ${panelTabs(ui.panelTab, [['compose', 'Composição'], ['challenge', 'Desafio']])}
    ${ui.panelTab === 'challenge' ? challengePanelMarkup() : composePanelMarkup()}`;
}

function setDistance(distance) {
  const direction = camA.rig.pos.clone().sub(camA.rig.target).normalize();
  camA.rig.pos.copy(camA.rig.target).addScaledVector(direction, distance);
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
  if (tab === 'compose') return exitChallenge();
  if (action === 'compare') return runCenteringComparison();
  if (action === 'thirds') return showThirds(!ui.thirds);
  if (action === 'open-challenge') return enterChallenge();
  if (action === 'challenge-judge') return judgeChallenge();
}

function handleInput(event) {
  const { id, value } = event.target;
  const number = Number(value);
  if (!id.startsWith('comp-')) return;
  killShotMotion(camA);
  if (id === 'comp-height') camA.rig.pos.y = number;
  if (id === 'comp-distance') setDistance(number);
  if (id === 'comp-shift-x') camA.shift.x = number;
  if (id === 'comp-shift-y') camA.shift.y = number;
  if (id === 'comp-roll') camA.rig.roll = THREE.MathUtils.degToRad(number);
  syncControls();
}

function extraReadoutRows() {
  return [
    { name: 'view.offsetX', value: camA.shift.x, text: camA.shift.x.toFixed(3) },
    { name: 'view.offsetY', value: camA.shift.y, text: camA.shift.y.toFixed(3) },
  ];
}

export default {
  id: 3,
  title: 'Composição',
  ready: true,
  achievement: ACHIEVEMENT,
  render,
  renderControls,
  handleClick,
  handleInput,
  status: () => lesson.status(extraSteps().map(([done]) => done)),
  refreshProgressUi: () => lesson.refresh(extraSteps()),
  frame: updateChallengeHud,
  enter() {
    ui.active = true;
    ui.panelTab = 'compose';
    ui.spec = { framing: 'medium', angle: 'eye' };
    setExtraReadout(extraReadoutRows);
  },
  afterReset() {
    if (ui.challengeActive) exitChallenge();
    ui.thirds = false;
    syncControls();
  },
  leave() {
    if (ui.challengeActive) exitChallenge();
    setExtraReadout(null);
    ui.active = false;
  },
};
