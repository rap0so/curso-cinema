import { HOME, HERO_TOP, camA, camB, hero, syncShot } from '../sandbox/scene.js';
import {
  sandboxState, dur, onFrame, onReset, snapshotBaseline, killShotMotion, placeShotAtHome,
  placeHeroOnMark, setCompare, refreshFrameLabels,
} from '../sandbox/stage.js';
import { dolly, truck, pedestal, pan, tilt, orbitAround, crane, tracking } from '../sandbox/camera-moves.js';
import { showCode } from '../code-panel.js';
import { slate } from '../course-ui.js';
import { progress, announceProgress } from '../progress.js';
import { $, escapeHtml } from '../html.js';

const gsap = window.gsap;
const CHALLENGE_START_Z = 10;
const CHALLENGE_EASES = ['none', 'power1.inOut', 'power2.inOut', 'power3.out', 'sine.inOut', 'expo.out'];

progress.m1 = { known: [], seen: [], compared: false, quiz: {}, challenge: false, ...progress.m1 };
const moduleProgress = progress.m1;

const ui = { panelTab: 'moves', challengeActive: false };
const challengeDraft = { distance: 7.5, duration: 1.5, ease: 'none' };

const TERMS = [
  {
    id: 'dolly', name: 'Dolly in / out', aka: 'push-in / pull-out',
    analogy: 'Andar em direção a alguém numa festa pra puxar papo. Você chega mais perto; seus olhos continuam os mesmos.',
    short: 'andar até alguém pra puxar papo',
    definition: 'A câmera inteira anda pra frente (push-in) ou pra trás (pull-out).',
    screen: 'O herói cresce no quadro. O que está perto cresce mais rápido que o fundo, e caixotes da frente passam por você.',
    code: 'camera.position ao longo da direção do olhar. fov não muda.',
    alt: 'Abre o código do OrbitControls: a roda do mouse chama funções chamadas dollyIn e dollyOut. Você faz dolly há anos e ninguém te contou.',
    demos: [['dollyIn', 'push-in'], ['dollyOut', 'pull-out']],
  },
  {
    id: 'truck', name: 'Truck', aka: 'left / right',
    analogy: 'Andar de lado na calçada olhando uma vitrine. O corpo vai pro lado, a cabeça continua olhando reto.',
    short: 'andar de lado olhando a vitrine',
    definition: 'A câmera desliza pro lado sem girar.',
    screen: 'Paralaxe: o que está perto passa rápido, o fundo quase não se mexe.',
    code: 'camera.position e target somam o mesmo vetor "direita". rotation não muda.',
    alt: 'Olha pela janela de um trem: o poste passa voando, a montanha lá longe quase parada. Isso é um truck com o trem fazendo o trabalho pesado.',
    demos: [['truckLeft', 'truck ←'], ['truckRight', 'truck →']],
  },
  {
    id: 'pedestal', name: 'Pedestal', aka: 'up / down',
    analogy: 'Elevador panorâmico: você sobe olhando sempre reto pra frente.',
    short: 'elevador panorâmico',
    definition: 'A câmera sobe ou desce na vertical, sem inclinar.',
    screen: 'O mundo desliza na vertical, com paralaxe: o chão perto some mais rápido que o fundo.',
    code: 'camera.position.y e target.y juntos.',
    alt: 'Pedestal é agachar pra falar com uma criança: você desce até a altura dela. Tilt seria ficar em pé e só baixar o olhar. O primeiro conversa de igual pra igual, o segundo olha de cima.',
    demos: [['pedestalUp', 'pedestal ↑'], ['pedestalDown', 'pedestal ↓']],
  },
  {
    id: 'pan', name: 'Pan', aka: 'left / right',
    analogy: 'Ver uma partida de tênis da arquibancada: o corpo fica parado, só a cabeça vira de um lado pro outro.',
    short: 'ver tênis da arquibancada',
    definition: 'A câmera gira no próprio eixo vertical, pra esquerda ou pra direita.',
    screen: 'Tudo desliza na mesma velocidade, perto e longe. Zero paralaxe.',
    code: 'camera.rotation.y (ou o target gira em volta da câmera). position fixa.',
    alt: 'Foto panorâmica no celular: você gira parado no lugar. O nome vem daí mesmo: panorama, pan.',
    demos: [['panLeft', 'pan ←'], ['panRight', 'pan →']],
  },
  {
    id: 'tilt', name: 'Tilt', aka: 'up / down',
    analogy: 'Olhar um prédio do pé até o topo sem sair da calçada.',
    short: 'olhar um prédio de baixo pra cima',
    definition: 'A câmera inclina pra cima ou pra baixo, sem sair do lugar.',
    screen: 'O quadro varre na vertical. Nada muda de profundidade.',
    code: 'camera.rotation.x. position fixa.',
    alt: 'Faz agora: olha pro teto sem mexer os pés. Isso foi um tilt up. Seu pescoço é um tripé com cabeça fluida.',
    demos: [['tiltUp', 'tilt ↑'], ['tiltDown', 'tilt ↓']],
  },
  {
    id: 'orbit', name: 'Orbit', aka: 'arc shot',
    analogy: 'Rodear a mesa do bolo de aniversário olhando sempre pro bolo.',
    short: 'rodear a mesa do bolo',
    definition: 'A câmera anda em círculo em volta do herói, sempre mirando nele.',
    screen: 'O herói gira no quadro (vemos o lado, depois as costas) e o fundo corre atrás dele.',
    code: 'position em sin/cos em volta do herói + lookAt(hero). É o que o OrbitControls faz com o mouse.',
    alt: 'Cena de herói depois da vitória em filme de ação: a câmera dá a volta nele em câmera lenta. Clichê? Sim. Funciona? Também.',
    demos: [['orbitLeft', 'orbit ⟲'], ['orbitRight', 'orbit ⟳']],
  },
  {
    id: 'crane', name: 'Crane / Jib', aka: 'braço de grua',
    analogy: 'Ser levantado por um guindaste segurando o celular: você sobe em arco e continua filmando a mesma coisa.',
    short: 'subir num guindaste filmando',
    definition: 'A câmera vai na ponta de um braço que sobe ou desce em arco. Jib é o braço compacto.',
    screen: 'Começa na altura do olho e termina vendo o herói de cima, revelando o espaço em volta.',
    code: 'position.y e position.z em tweens paralelos com eases diferentes (vira arco) + lookAt(target).',
    alt: 'Final clássico de filme: o personagem fica pequenininho na rua enquanto a câmera sobe e mostra a cidade inteira. Isso é crane up. Fecha a história abrindo o espaço.',
    demos: [['craneUp', 'crane ↑'], ['craneDown', 'crane ↓']],
  },
  {
    id: 'tracking', name: 'Tracking shot', aka: 'follow',
    analogy: 'Caminhar do lado de um amigo conversando: vocês vão na mesma velocidade e ele fica sempre do seu lado.',
    short: 'caminhar ao lado de um amigo',
    definition: 'A câmera acompanha o herói enquanto ele se move.',
    screen: 'O herói fica parado no quadro; o mundo passa atrás dele.',
    code: 'o mesmo delta em hero.position e camera.position (+ target), na mesma timeline, ease "none".',
    alt: 'Jogo de plataforma 2D: a câmera segue o personagem e o cenário rola atrás. Todo side-scroller é um tracking shot que nunca acaba.',
    demos: [['tracking', 'tracking']],
  },
];

const QUIZ = [
  {
    id: 'q1',
    text: 'Os caixotes da frente passam voando, os pilares do fundo quase não se mexem. Que movimento é esse?',
    options: ['Pan', 'Truck', 'Tilt', 'Zoom'],
    answer: 1,
    why: [
      'Pan não tem paralaxe: perto e longe deslizam juntos.',
      'Paralaxe é a assinatura de câmera que anda. Andou de lado = truck.',
      'Tilt é vertical e também não tem paralaxe.',
      'Zoom nem é movimento de câmera, é lente. Assunto do Módulo 2.',
    ],
  },
  {
    id: 'q2',
    text: 'No storyboard está escrito "pan right". No three.js, o que muda?',
    options: ['camera.position.x', 'camera.rotation.y', 'camera.fov', 'hero.position.x'],
    answer: 1,
    why: [
      'Mexer em position.x é truck. A câmera andaria.',
      'Pan é girar a cabeça: rotation.y (ou o target girando em volta da câmera).',
      'fov é lente. A câmera nem se mexe.',
      'Aí quem se mexe é o herói, não a câmera.',
    ],
  },
  {
    id: 'q3',
    text: 'Qual movimento deixa o herói parado no quadro enquanto o cenário passa atrás?',
    options: ['Pedestal', 'Dolly out', 'Tracking shot', 'Tilt'],
    answer: 2,
    why: [
      'Pedestal sobe/desce a câmera; o herói desliza no quadro.',
      'Dolly out afasta: o herói encolhe.',
      'Isso. Câmera e herói andam juntos, o mundo corre atrás.',
      'Tilt inclina a câmera; o herói sai do quadro na vertical.',
    ],
  },
];

const PAN_NOTES = ['YXZ: gira no Y antes de inclinar no X, senão o pan entorta.', 'position parada. só a cabeça gira.'];
const ORBIT_NOTES = ['a câmera anda num círculo de raio 7 e nunca tira o olho do herói.'];
const orbitCode = angle => `const arc = { angle: 0 }\ngsap.to(arc, {\n  angle: ${angle}, duration: 2.9, ease: "power2.inOut",\n  onUpdate: () => {\n    camera.position.set(Math.sin(arc.angle) * 7, 1.6, Math.cos(arc.angle) * 7)\n    camera.lookAt(hero.position)\n  },\n})`;

const MOVES = {
  dollyIn: {
    label: 'Dolly in', term: 'dolly', run: (s, d) => dolly(s, 1, d),
    notes: ['a câmera anda até o herói. a lente não muda.'],
    code: 'gsap.to(camera.position, { z: 4, duration: 2.2, ease: "power2.inOut" })\ncamera.lookAt(target)',
  },
  dollyOut: {
    label: 'Dolly out', term: 'dolly', run: (s, d) => dolly(s, -1, d),
    notes: ['a câmera recua. o herói encolhe, o mundo aparece.'],
    code: 'gsap.to(camera.position, { z: 10, duration: 2.2, ease: "power2.inOut" })\ncamera.lookAt(target)',
  },
  truckLeft: {
    label: 'Truck ←', term: 'truck', run: (s, d) => truck(s, -1, d),
    notes: ['câmera e alvo andam juntos: a direção do olhar não muda.'],
    code: 'gsap.to([camera.position, target], { x: "-=2.5", duration: 2.2, ease: "power2.inOut" })',
  },
  truckRight: {
    label: 'Truck →', term: 'truck', run: (s, d) => truck(s, 1, d),
    notes: ['câmera e alvo andam juntos: a direção do olhar não muda.'],
    code: 'gsap.to([camera.position, target], { x: "+=2.5", duration: 2.2, ease: "power2.inOut" })',
  },
  pedestalUp: {
    label: 'Pedestal ↑', term: 'pedestal', run: (s, d) => pedestal(s, 1, d),
    notes: ['sobe reto. sem inclinar a cabeça.'],
    code: 'gsap.to([camera.position, target], { y: "+=1.5", duration: 2.2, ease: "power2.inOut" })',
  },
  pedestalDown: {
    label: 'Pedestal ↓', term: 'pedestal', run: (s, d) => pedestal(s, -1, d),
    notes: ['desce reto. sem inclinar a cabeça.'],
    code: 'gsap.to([camera.position, target], { y: "-=1.2", duration: 2.2, ease: "power2.inOut" })',
  },
  panLeft: {
    label: 'Pan ←', term: 'pan', run: (s, d) => pan(s, -1, d),
    notes: PAN_NOTES,
    code: 'camera.rotation.order = "YXZ"\ngsap.to(camera.rotation, { y: "+=0.34", duration: 2.2, ease: "power2.inOut" })',
  },
  panRight: {
    label: 'Pan →', term: 'pan', run: (s, d) => pan(s, 1, d),
    notes: PAN_NOTES,
    code: 'camera.rotation.order = "YXZ"\ngsap.to(camera.rotation, { y: "-=0.34", duration: 2.2, ease: "power2.inOut" })',
  },
  tiltUp: {
    label: 'Tilt ↑', term: 'tilt', run: (s, d) => tilt(s, 1, d),
    notes: ['position parada. a cabeça inclina pra cima.'],
    code: 'camera.rotation.order = "YXZ"\ngsap.to(camera.rotation, { x: "+=0.3", duration: 2.2, ease: "power2.inOut" })',
  },
  tiltDown: {
    label: 'Tilt ↓', term: 'tilt', run: (s, d) => tilt(s, -1, d),
    notes: ['position parada. a cabeça inclina pra baixo.'],
    code: 'camera.rotation.order = "YXZ"\ngsap.to(camera.rotation, { x: "-=0.3", duration: 2.2, ease: "power2.inOut" })',
  },
  orbitLeft: {
    label: 'Orbit ⟲', term: 'orbit', run: (s, d) => orbitAround(s, -1, d),
    notes: ORBIT_NOTES,
    code: orbitCode('-Math.PI / 2'),
  },
  orbitRight: {
    label: 'Orbit ⟳', term: 'orbit', run: (s, d) => orbitAround(s, 1, d),
    notes: ORBIT_NOTES,
    code: orbitCode('Math.PI / 2'),
  },
  craneUp: {
    label: 'Crane ↑', term: 'crane', run: (s, d) => crane(s, 1, d),
    notes: ['dois tweens juntos ("<") com eases diferentes = arco de grua.'],
    code: 'gsap.timeline({ onUpdate: () => camera.lookAt(target) })\n  .to(camera.position, { y: 4.8, duration: 2.2, ease: "power2.inOut" })\n  .to(camera.position, { z: 9, duration: 2.2, ease: "sine.out" }, "<")',
  },
  craneDown: {
    label: 'Crane ↓', term: 'crane', run: (s, d) => crane(s, -1, d),
    notes: ['o mesmo arco ao contrário: desce e se aproxima.'],
    code: 'gsap.timeline({ onUpdate: () => camera.lookAt(target) })\n  .to(camera.position, { y: 1.6, duration: 2.2, ease: "power2.inOut" })\n  .to(camera.position, { z: 7, duration: 2.2, ease: "sine.in" }, "<")',
  },
  tracking: {
    label: 'Tracking', term: 'tracking', run: (s, d) => tracking(s, d * 1.6),
    notes: ['ease "none": câmera e herói no mesmo passo, sem acelerar.'],
    code: 'gsap.timeline({ defaults: { duration: 3.5, ease: "none" } })\n  .to(hero.position, { x: "+=4" })\n  .to([camera.position, target], { x: "+=4" }, "<")',
  },
};

const COMPARE_PAN_TRUCK = {
  label: 'Pan × Truck',
  notes: ['A gira, B anda. o herói termina no MESMO lugar do quadro nos dois.', 'olhe os pilares do fundo e os caixotes da frente.'],
  code: '// CAM A · pan\ngsap.to(camA.rotation, { y: "-=0.34" })\n\n// CAM B · truck\ngsap.to([camB.position, targetB], { x: "+=2.5" })',
};

const ACHIEVEMENT = { id: 'm1', icon: '🛤️', name: 'Habilitação de Dolly', desc: 'Separou position de rotation. Nunca mais vai chamar truck de pan.' };

const DIAGRAM_SVG = `
<svg class="diagram" viewBox="0 0 640 210" role="img" aria-label="Vista de cima: no truck a câmera anda de lado e o olhar continua paralelo; no pan a câmera fica no lugar e o olhar gira.">
  <g>
    <text class="lbl" x="20" y="24">TRUCK · a câmera anda</text>
    <circle cx="70" cy="56" r="7" fill="#5c6573"/><circle cx="200" cy="48" r="7" fill="#5c6573"/><circle cx="262" cy="62" r="7" fill="#5c6573"/>
    <text x="214" y="30">fundo</text>
    <circle cx="150" cy="100" r="11" fill="#f0a640"/>
    <text x="166" y="104">herói</text>
    <polygon points="115,170 72,96 158,96" fill="#f0a640" fill-opacity="0.08" stroke="#f0a640" stroke-opacity="0.35"/>
    <polygon points="185,170 142,96 228,96" fill="#f0a640" fill-opacity="0.18" stroke="#f0a640" stroke-opacity="0.8"/>
    <rect x="104" y="168" width="22" height="16" rx="2" fill="#2a2f38" stroke="#f0a640" stroke-opacity="0.5"/>
    <rect x="174" y="168" width="22" height="16" rx="2" fill="#2a2f38" stroke="#f0a640"/>
    <path d="M130 194 L170 194" stroke="#ece7dd" stroke-width="1.5"/><path d="M164 189 L171 194 L164 199" fill="none" stroke="#ece7dd" stroke-width="1.5"/>
    <text x="70" y="204">posição muda, direção igual</text>
  </g>
  <line x1="320" y1="16" x2="320" y2="196" stroke="#2c323d"/>
  <g>
    <text class="lbl" x="340" y="24">PAN · a câmera gira</text>
    <circle cx="410" cy="56" r="7" fill="#5c6573"/><circle cx="540" cy="48" r="7" fill="#5c6573"/><circle cx="602" cy="62" r="7" fill="#5c6573"/>
    <circle cx="490" cy="100" r="11" fill="#86b8ff"/>
    <polygon points="490,170 447,96 533,96" fill="#86b8ff" fill-opacity="0.08" stroke="#86b8ff" stroke-opacity="0.35"/>
    <polygon points="490,170 482,85 563,121" fill="#86b8ff" fill-opacity="0.18" stroke="#86b8ff" stroke-opacity="0.8"/>
    <rect x="479" y="168" width="22" height="16" rx="2" fill="#2a2f38" stroke="#86b8ff"/>
    <path d="M466 160 A 30 30 0 0 1 510 150" fill="none" stroke="#ece7dd" stroke-width="1.5"/><path d="M503 146 L511 150 L505 157" fill="none" stroke="#ece7dd" stroke-width="1.5"/>
    <text x="400" y="204">posição igual, direção muda</text>
  </g>
</svg>`;

function addSeen(...termIds) {
  termIds.forEach(id => { if (!moduleProgress.seen.includes(id)) moduleProgress.seen.push(id); });
  announceProgress();
}

function runMove(key) {
  const move = MOVES[key];
  if (sandboxState.compare) setCompare(false);
  if (ui.challengeActive) exitChallenge();
  killShotMotion(camA);
  snapshotBaseline();
  const tween = move.run(camA, dur(2.2));
  showCode(move);
  if (!tween) return;
  camA.active = tween;
  sandboxState.tags.A = move.label;
  refreshFrameLabels();
  progress.takes += 1;
  addSeen(move.term);
}

function runPanTruckComparison() {
  if (ui.challengeActive) exitChallenge();
  setCompare(true);
  [camA, camB].forEach(placeShotAtHome);
  placeHeroOnMark();
  snapshotBaseline();
  const lateral = 2.5;
  const matchingAngle = Math.atan2(lateral, HOME.pos.z - HOME.target.z);
  camA.active = gsap.to({}, { duration: dur(0.6), onComplete: () => { camA.active = pan(camA, 1, dur(2.6), matchingAngle); } });
  camB.active = gsap.to({}, { duration: dur(0.6), onComplete: () => { camB.active = truck(camB, 1, dur(2.6), lateral); } });
  sandboxState.tags.A = 'pan →';
  sandboxState.tags.B = 'truck →';
  refreshFrameLabels();
  showCode(COMPARE_PAN_TRUCK);
  progress.takes += 1;
  moduleProgress.compared = true;
  addSeen('pan', 'truck');
}

function measureHeroFraming(shot) {
  syncShot(shot);
  const top = hero.position.clone().setY(HERO_TOP).project(shot.cam);
  const feet = hero.position.clone().setY(0).project(shot.cam);
  return {
    share: (top.y - feet.y) / 2,
    headInFrame: top.y <= 0.98 && Math.abs(top.x) <= 1,
  };
}

function updateChallengeHud() {
  const hud = document.querySelector('#frame-a .frame-hud');
  if (!ui.challengeActive) {
    hud.hidden = true;
    return;
  }
  const framing = measureHeroFraming(camA);
  hud.hidden = false;
  const headNote = framing.headInFrame ? 'cabeça ok' : 'cabeça cortada';
  hud.textContent = `herói: ${Math.round(framing.share * 100)}% da altura · ${headNote}`;
}

function enterChallenge() {
  if (sandboxState.compare) setCompare(false);
  killShotMotion(camA);
  placeHeroOnMark();
  ui.challengeActive = true;
  ui.panelTab = 'challenge';
  sandboxState.tags.A = 'desafio';
  camA.rig.target.copy(HOME.target);
  camA.active = gsap.to(camA.rig.pos, { x: 0, y: HOME.pos.y, z: CHALLENGE_START_Z, duration: dur(0.6), ease: 'power1.inOut' });
  sandboxState.baseline = null;
  renderControls($('controls'));
  refreshFrameLabels();
}

function exitChallenge() {
  ui.challengeActive = false;
  sandboxState.tags.A = '';
  if (ui.panelTab === 'challenge') {
    ui.panelTab = 'moves';
    renderControls($('controls'));
  }
}

function readChallengeInputs() {
  return {
    distance: Number($('ch-dist').value),
    duration: Number($('ch-dur').value),
    ease: $('ch-ease').value,
  };
}

function showChallengeCode() {
  const { distance, duration, ease } = challengeDraft;
  showCode({
    label: 'Desafio · push-in',
    notes: ['sua versão. mexa nos controles e o código acompanha.'],
    code: `camera.position.set(0, 1.6, ${CHALLENGE_START_Z})\ngsap.to(camera.position, { z: ${distance.toFixed(1)}, duration: ${duration}, ease: "${ease}" })\ncamera.lookAt(target)`,
  });
}

function runChallenge() {
  const { distance, duration, ease } = readChallengeInputs();
  killShotMotion(camA);
  camA.rig.pos.set(0, HOME.pos.y, CHALLENGE_START_Z);
  camA.rig.target.copy(HOME.target);
  snapshotBaseline();
  showChallengeCode();
  $('ch-result').className = 'ch-result';
  $('ch-result').textContent = sandboxState.motion ? 'Rodando... 🎬' : 'Modo instantâneo: avaliando pela duração que você escolheu.';
  progress.takes += 1;
  announceProgress();
  camA.active = gsap.to(camA.rig.pos, {
    z: distance,
    duration: dur(duration),
    ease,
    onComplete: () => judgeChallenge(duration, ease),
  });
}

function judgeChallenge(duration, ease) {
  const framing = measureHeroFraming(camA);
  const percent = Math.round(framing.share * 100);
  const problems = [];
  if (duration < 3) problems.push(`Rápido demais: ${duration}s é push-in de quem tomou três cafés. Lento aqui é 3s ou mais.`);
  if (!framing.headInFrame) problems.push('Perto demais: a cabeça do herói saiu do quadro. Ficou sem testa, coitado.');
  else if (framing.share < 0.5) problems.push(`Ainda longe: o herói ocupa ${percent}% da altura do quadro. Precisa de pelo menos 50%.`);
  const result = $('ch-result');
  if (problems.length) {
    result.className = 'ch-result bad';
    result.textContent = `Corta! ${problems.join(' ')}`;
    return;
  }
  const easeNote = ease === 'none'
    ? ' Dica de bônus: com ease "none" ele começa e para de supetão. No Módulo 5 a gente resolve isso.'
    : '';
  result.className = 'ch-result ok';
  result.textContent = `Valeu, é take! Push-in de ${duration}s, herói em ${percent}% do quadro.${easeNote}`;
  if (!moduleProgress.challenge) {
    moduleProgress.challenge = true;
    announceProgress();
  }
}

function quizStatus() {
  const answered = QUIZ.filter(q => moduleProgress.quiz[q.id] !== undefined);
  const correct = answered.filter(q => moduleProgress.quiz[q.id] === q.answer).length;
  return { answered: answered.length, correct, passed: answered.length === QUIZ.length && correct >= 2 };
}

function status() {
  const covered = TERMS.filter(t => moduleProgress.known.includes(t.id) || moduleProgress.seen.includes(t.id)).length;
  const quiz = quizStatus();
  const done = covered + Number(moduleProgress.compared) + Number(quiz.passed) + Number(moduleProgress.challenge);
  const total = TERMS.length + 3;
  return { covered, quiz, percent: Math.round((done / total) * 100), complete: done === total };
}

function termCard(term) {
  const known = moduleProgress.known.includes(term.id);
  return `<article class="term ${known ? 'is-known' : ''}" id="term-${term.id}">
    <header class="term-head">
      <h3>${term.name}</h3><span class="aka">${term.aka}</span><span class="term-status"></span>
    </header>
    <div class="term-body">
      <p class="analogy">${term.analogy}</p>
      <p class="definition"><b>Em uma frase:</b> ${term.definition}</p>
      <button class="link-btn reopen" data-action="reopen" data-term="${term.id}">Rever mesmo assim</button>
      <div class="demo-row">${term.demos.map(([key, label]) => `<button class="btn" data-move="${key}">▶ ${label}</button>`).join('')}</div>
      <details class="more">
        <summary>Detalhes</summary>
        <dl>
          <dt>Na tela</dt><dd>${term.screen}</dd>
          <dt>No código</dt><dd>${term.code}</dd>
        </dl>
      </details>
      <button class="link-btn" data-action="alt" data-term="${term.id}">Não colou? Tenta de outro jeito</button>
      <p class="alt" id="alt-${term.id}" hidden>${term.alt}</p>
    </div>
  </article>`;
}

function refreshTermStatuses() {
  TERMS.forEach(term => {
    const card = $(`term-${term.id}`);
    if (!card) return;
    const known = moduleProgress.known.includes(term.id);
    const seen = moduleProgress.seen.includes(term.id);
    card.classList.toggle('is-known', known);
    const label = card.querySelector('.term-status');
    label.textContent = seen ? '● filmado' : known ? 'já conhecia' : '';
    label.classList.toggle('known', known && !seen);
  });
}

function quizMarkup() {
  const { answered: answeredCount, correct, passed } = quizStatus();
  const questions = QUIZ.map((q, qi) => {
    const chosen = moduleProgress.quiz[q.id];
    const answered = chosen !== undefined;
    const options = q.options.map((option, oi) => {
      let cls = '';
      if (answered && oi === q.answer) cls = 'right';
      else if (answered && oi === chosen) cls = 'wrong';
      return `<button class="opt ${cls}" data-quiz="${q.id}" data-opt="${oi}" ${answered ? 'disabled' : ''}>${escapeHtml(option)}</button>`;
    }).join('');
    const isRight = chosen === q.answer;
    const feedback = answered
      ? `<p class="q-feedback ${isRight ? 'right' : 'wrong'}"><b>${isRight ? 'Isso!' : 'Quase.'}</b> ${q.why[chosen]}${isRight ? '' : ` A resposta é <b>${escapeHtml(q.options[q.answer])}</b>: ${q.why[q.answer]}`}</p>`
      : '';
    return `<fieldset class="q"><legend>${qi + 1}. ${escapeHtml(q.text)}</legend><div class="opts">${options}</div>${feedback}</fieldset>`;
  }).join('');
  const foot = answeredCount === QUIZ.length
    ? `<div class="quiz-foot"><span>${correct}/${QUIZ.length} ${passed ? '· passou ✔' : '· precisa de 2'}</span><button class="btn" data-action="quiz-retry">Refazer</button></div>`
    : '';
  return questions + foot;
}

function awardChecklistItems(current) {
  const item = (done, text) => `<li class="${done ? 'done' : ''}">${text}</li>`;
  return [
    item(current.covered === TERMS.length, `Termos vistos ou já conhecidos: ${current.covered}/${TERMS.length}`),
    item(moduleProgress.compared, 'Pan × truck lado a lado'),
    item(current.quiz.passed, `Checagem: ${current.quiz.correct}/${QUIZ.length} (precisa de 2)`),
    item(moduleProgress.challenge, 'Mini-desafio do push-in'),
  ].join('');
}

function refreshProgressUi() {
  const current = status();
  refreshTermStatuses();
  const checklist = $('award-checklist');
  if (!checklist) return;
  checklist.innerHTML = awardChecklistItems(current);
  const unlocked = progress.achievements.includes(ACHIEVEMENT.id);
  $('award').classList.toggle('unlocked', unlocked);
  $('award-state').textContent = unlocked ? 'Desbloqueado' : `${current.percent}% da cena filmada`;
  $('challenge-status').textContent = moduleProgress.challenge ? '● Desafio concluído' : '○ Ainda não filmado';
}

function render(container) {
  const knownSet = new Set(moduleProgress.known);
  const cheatRows = TERMS.map(t => `<tr><td>${t.name}</td><td>${t.short}</td><td>${t.screen}</td><td>${escapeHtml(t.code)}</td></tr>`).join('');
  container.innerHTML = `
    <div class="hero-title">
      ${slate(1, 'Movimento')}
      <h1>A câmera <em>se move</em></h1>
      <p class="lede">Oito movimentos, uma ideia: ou a câmera <b>anda</b> (position), ou ela <b>gira a cabeça</b> (rotation). Quem separa os dois já fala a língua do set.</p>
      <p class="lede-muted">O sandbox ao lado está em <b>visão de set</b>: a câmera laranja é a câmera da cena, a caixinha no canto é o que ela filma. Arraste a vista para girar o set.</p>
    </div>

    <section class="section" id="ask">
      <span class="eyebrow">1 · Antes do primeiro take</span>
      <h2>Quais você já conhece?</h2>
      <p>Marque os que já são de casa. Eles ficam resumidos e contam como vistos. Spoiler: o OrbitControls já te apresentou uns dois.</p>
      <div class="chips">${TERMS.map(t => `<button class="chip" data-known="${t.id}" aria-pressed="${knownSet.has(t.id)}">${t.name}</button>`).join('')}</div>
    </section>

    <section class="section" id="terms">
      <span class="eyebrow">2 · Os movimentos</span>
      <h2>Analogia, frase, demo</h2>
      <p>Cada termo começa com algo do mundo real. Aperte ▶ e veja no sandbox o que mudou no código.</p>
      <div class="term-list">${TERMS.map(termCard).join('')}</div>
    </section>

    <section class="section critical" id="critical">
      <span class="eyebrow">3 · Ponto crítico</span>
      <h2>Andar ≠ girar a cabeça</h2>
      <p>Pan e truck "vão pro lado" e confundem todo mundo no começo. A diferença está no fundo: quem anda tem <b>paralaxe</b>, quem gira não tem.</p>
      <div class="split-table">
        <div class="pos"><h4>Mexe em position</h4><p>dolly, truck, pedestal, crane, tracking. A câmera sai do lugar. Perto e longe se movem em velocidades diferentes.</p></div>
        <div class="rot"><h4>Mexe em rotation</h4><p>pan, tilt. A câmera fica no lugar e só aponta pra outro lado. Tudo desliza junto.</p></div>
      </div>
      ${DIAGRAM_SVG}
      <p>O orbit é o híbrido: anda em círculo (position) e gira pra continuar mirando (rotation via lookAt).</p>
      <div><button class="btn primary" data-action="compare">▶ Rodar pan × truck lado a lado</button></div>
    </section>

    <section class="section" id="cheat">
      <span class="eyebrow">4 · Cola</span>
      <h2>Tabela pra consultar</h2>
      <div class="table-wrap"><table class="cheat">
        <thead><tr><th>Termo</th><th>Analogia</th><th>O que muda na tela</th><th>O que mexer no código</th></tr></thead>
        <tbody>${cheatRows}</tbody>
      </table></div>
    </section>

    <section class="section" id="quiz">
      <span class="eyebrow">5 · Checagem rápida</span>
      <h2>Três perguntas</h2>
      <div class="quiz" id="quiz-body">${quizMarkup()}</div>
    </section>

    <section class="section" id="challenge">
      <span class="eyebrow">6 · Mini-desafio</span>
      <h2>O push-in lento</h2>
      <p>O diretor pediu: <i>"slow push-in, terminando enquadrado no herói"</i>. A câmera começa a ${CHALLENGE_START_Z}m dele. Você escolhe onde ela para, quanto tempo leva e o ease.</p>
      <ul class="criteria">
        <li>Lento: 3 segundos ou mais</li>
        <li>No fim, a cabeça do herói inteira no quadro</li>
        <li>O herói ocupando pelo menos metade da altura do quadro</li>
      </ul>
      <div class="challenge-actions">
        <button class="btn primary" data-action="open-challenge">Abrir desafio no sandbox</button>
        <span class="panel-note" id="challenge-status"></span>
      </div>
    </section>

    <section class="section" id="achievement">
      <span class="eyebrow">7 · Achievement</span>
      <div class="award" id="award">
        <div class="ico" aria-hidden="true">${ACHIEVEMENT.icon}</div>
        <div>
          <h3>${ACHIEVEMENT.name}</h3>
          <p id="award-state"></p>
          <ul class="criteria" id="award-checklist"></ul>
        </div>
      </div>
    </section>`;
}

function challengeFormMarkup() {
  return `
    <div class="challenge-form">
      <div class="field">
        <label for="ch-dist">Para a <output id="ch-dist-out">${challengeDraft.distance.toFixed(1)} m</output></label>
        <input type="range" id="ch-dist" min="1.5" max="9.5" step="0.1" value="${challengeDraft.distance}">
      </div>
      <div class="field">
        <label for="ch-dur">Duração <output id="ch-dur-out">${challengeDraft.duration} s</output></label>
        <input type="range" id="ch-dur" min="0.5" max="8" step="0.5" value="${challengeDraft.duration}">
      </div>
      <div class="field">
        <label for="ch-ease">Ease</label>
        <select id="ch-ease">${CHALLENGE_EASES.map(e => `<option value="${e}" ${e === challengeDraft.ease ? 'selected' : ''}>${e}</option>`).join('')}</select>
      </div>
    </div>
    <div class="challenge-actions">
      <button class="btn primary" data-action="challenge-run">Ação! 🎬</button>
      <button class="btn" data-action="open-challenge">Voltar pra marca</button>
    </div>
    <p class="ch-result" id="ch-result" aria-live="polite">${moduleProgress.challenge ? 'Você já fechou esse desafio. Pode filmar de novo por esporte.' : 'Os valores iniciais estão errados de propósito. Ajuste e grite ação.'}</p>`;
}

function renderControls(panel) {
  const isChallenge = ui.panelTab === 'challenge';
  const moveButtons = Object.entries(MOVES).map(([key, move]) => `<button class="btn" data-move="${key}">${move.label}</button>`).join('');
  panel.innerHTML = `
    <div class="tabs" role="tablist">
      <button class="tab" role="tab" aria-selected="${!isChallenge}" data-tab="moves">Movimentos</button>
      <button class="tab" role="tab" aria-selected="${isChallenge}" data-tab="challenge">Desafio</button>
    </div>
    ${isChallenge ? challengeFormMarkup() : `<div class="moves-grid">${moveButtons}<button class="btn wide" data-action="compare">Pan × Truck lado a lado</button></div>`}`;
  if (isChallenge) showChallengeCode();
}

function toggleKnown(button) {
  const id = button.dataset.known;
  const index = moduleProgress.known.indexOf(id);
  if (index >= 0) moduleProgress.known.splice(index, 1);
  else moduleProgress.known.push(id);
  button.setAttribute('aria-pressed', String(index < 0));
  announceProgress();
}

function answerQuiz(button) {
  moduleProgress.quiz[button.dataset.quiz] = Number(button.dataset.opt);
  $('quiz-body').innerHTML = quizMarkup();
  announceProgress();
}

function handleClick(button) {
  const { move, tab, known, quiz, action, term } = button.dataset;
  if (move) return runMove(move);
  if (known) return toggleKnown(button);
  if (quiz) return answerQuiz(button);
  if (tab === 'challenge') return enterChallenge();
  if (tab === 'moves') return exitChallenge();

  switch (action) {
    case 'alt': {
      const alt = $(`alt-${term}`);
      alt.hidden = !alt.hidden;
      break;
    }
    case 'reopen':
      $(`term-${term}`).classList.add('expanded');
      break;
    case 'compare':
      runPanTruckComparison();
      break;
    case 'quiz-retry':
      moduleProgress.quiz = {};
      $('quiz-body').innerHTML = quizMarkup();
      announceProgress();
      break;
    case 'open-challenge':
      enterChallenge();
      break;
    case 'challenge-run':
      runChallenge();
      break;
  }
}

function handleInput(event) {
  if (!event.target.id.startsWith('ch-')) return;
  Object.assign(challengeDraft, readChallengeInputs());
  $('ch-dist-out').textContent = `${challengeDraft.distance.toFixed(1)} m`;
  $('ch-dur-out').textContent = `${challengeDraft.duration} s`;
  showChallengeCode();
}

function leave() {
  if (ui.challengeActive) exitChallenge();
}

onFrame(updateChallengeHud);
onReset(leave);

export default {
  id: 1,
  title: 'A câmera se move',
  ready: true,
  achievement: ACHIEVEMENT,
  render,
  renderControls,
  handleClick,
  handleInput,
  status,
  refreshProgressUi,
  leave,
};
