import { camA, camB, camC } from '../sandbox/scene.js';
import {
  sandboxState, dur, snapshotBaseline, killShotMotion, placeHeroOnMark, setCompare, refreshFrameLabels,
  caption, renderStill,
} from '../sandbox/stage.js';
import { placeShot, MOVE_LIBRARY, playSequence, tweenShotTo, crane } from '../sandbox/camera-moves.js';
import { composePose, FRAMINGS, ANGLES } from '../sandbox/framing.js';
import { applyLightPreset, LIGHT_PRESETS } from '../sandbox/lighting.js';
import { showCode } from '../code-panel.js';
import { slate } from '../course-ui.js';
import { progress, saveProgress } from '../progress.js';
import { createLesson, selectField, rangeField } from '../lesson.js';
import { $, escapeHtml } from '../html.js';

const gsap = window.gsap;
const MAX_SHOTS = 3;
const LENSES = [24, 35, 50, 85];
const SHOT_EASES = ['power2.inOut', 'power1.inOut', 'sine.inOut', 'expo.out', 'power2.out', 'none'];
const STORYBOARD_SIZE = { width: 320, height: 180 };

const ui = { active: false, run: null, playingIndex: -1 };

const ACHIEVEMENT = { id: 'm6', icon: '🏆', name: 'Diretor da Própria Cena', desc: 'Storyboard virou spec, spec virou código.' };

const blankShot = () => ({ text: '', framing: 'medium', angle: 'eye', lens: 35, move: 'pushIn', light: 'threePoint', ease: 'power2.inOut', duration: 3 });

const EXAMPLE_SHOTS = [
  { text: 'SHOT 1: establishing. Wide, high angle, 24mm, crane down revelando o set. Luz natural.', framing: 'wide', angle: 'high', lens: 24, move: 'craneDown', light: 'natural', ease: 'power2.inOut', duration: 4 },
  { text: 'SHOT 2: medium, eye level, 35mm, slow push-in no herói. Three-point.', framing: 'medium', angle: 'eye', lens: 35, move: 'pushIn', light: 'threePoint', ease: 'power2.inOut', duration: 3 },
  { text: 'SHOT 3: close-up, low angle, 85mm, orbit lento. Luar frio.', framing: 'closeUp', angle: 'low', lens: 85, move: 'orbitRight', light: 'moonlight', ease: 'sine.inOut', duration: 4 },
];

const HIERARCHY_FIGURE = `
<svg class="diagram" viewBox="0 0 640 150" role="img" aria-label="Uma sequência contém cenas, e cada cena contém planos.">
  <rect x="10" y="12" width="620" height="126" rx="4" fill="none" stroke="#f0a640"/>
  <text class="lbl" x="22" y="32">SEQUENCE · a perseguição</text>
  <rect x="24" y="44" width="290" height="82" rx="3" fill="none" stroke="#86b8ff"/>
  <text x="34" y="62">SCENE 1 · no galpão</text>
  <rect x="34" y="72" width="80" height="44" fill="#1d222b" stroke="#2c323d"/><text x="44" y="98">shot 1</text>
  <rect x="124" y="72" width="80" height="44" fill="#1d222b" stroke="#2c323d"/><text x="134" y="98">shot 2</text>
  <rect x="214" y="72" width="80" height="44" fill="#1d222b" stroke="#2c323d"/><text x="224" y="98">shot 3</text>
  <rect x="326" y="44" width="290" height="82" rx="3" fill="none" stroke="#86b8ff"/>
  <text x="336" y="62">SCENE 2 · na rua</text>
  <rect x="336" y="72" width="80" height="44" fill="#1d222b" stroke="#2c323d"/><text x="346" y="98">shot 4</text>
  <rect x="426" y="72" width="80" height="44" fill="#1d222b" stroke="#2c323d"/><text x="436" y="98">shot 5</text>
</svg>`;

const TERMS = [
  {
    id: 'shot', name: 'Shot', aka: 'plano',
    analogy: 'Uma frase. Começa quando a câmera liga, termina no corte.',
    short: 'uma frase',
    definition: 'Um trecho contínuo de filme, sem corte, com um enquadramento e um movimento.',
    screen: 'Do início ao fim do plano, nada de corte: só a câmera fazendo uma coisa.',
    code: 'Uma pose inicial + um tween. No GSAP: um bloco entre dois labels.',
    alt: 'Plano-sequência é quando o diretor estica um único shot por minutos sem cortar. Se você já viu 1917, viu um filme fingindo ser um shot só.',
    demos: [['oneShot', 'um plano']],
  },
  {
    id: 'scene', name: 'Scene', aka: 'cena',
    analogy: 'Um parágrafo: várias frases sobre a mesma coisa, no mesmo lugar e tempo.',
    short: 'um parágrafo',
    definition: 'Um conjunto de planos no mesmo lugar e tempo, contando um momento.',
    screen: 'Três planos seguidos no mesmo set, cortando entre eles.',
    code: 'Uma timeline com vários shots em sequência.',
    alt: 'Lembra da cena do diálogo do módulo 5? Master, depois o parceiro, depois o herói: três planos, uma cena.',
    demos: [['scene', 'cena de 3 planos']],
  },
  {
    id: 'sequence', name: 'Sequence', aka: 'sequência',
    analogy: 'Um capítulo: vários parágrafos que juntos contam um arco.',
    short: 'um capítulo',
    definition: 'Um grupo de cenas que formam uma unidade de história, mesmo em lugares diferentes.',
    screen: 'Cena no galpão, fade, cena com o parceiro. Uma sequência só.',
    code: 'Uma timeline mestre que encadeia timelines de cena (tl.add(cena1).add(cena2)).',
    alt: 'A sequência do assalto num filme de assalto: entrada no banco, cofre, fuga. Três lugares, uma sequência.',
    figure: HIERARCHY_FIGURE,
    demos: [['sequence', 'sequência de 2 cenas']],
  },
  {
    id: 'storyboard', name: 'Storyboard', aka: 'quadrinho do filme',
    analogy: 'O filme desenhado como história em quadrinhos antes de filmar.',
    short: 'o filme em quadrinhos',
    definition: 'Um desenho por plano mostrando enquadramento e movimento.',
    screen: 'No editor abaixo: cada plano vira um quadro, renderizado do próprio sandbox.',
    code: 'É a spec visual. Cada quadro vira uma pose inicial + movimento no código.',
    alt: 'Wireframe! O storyboard está pro filme como o wireframe está pra interface: ninguém começa pelo pixel final.',
    demos: [['storyboard', 'gerar storyboard do exemplo']],
  },
  {
    id: 'shotList', name: 'Shot list', aka: 'lista de planos',
    analogy: 'A lista de compras do diretor: cada item é um plano que precisa ser filmado.',
    short: 'lista de compras do diretor',
    definition: 'Lista em texto de todos os planos, com enquadramento, ângulo, lente, movimento e luz.',
    screen: 'SHOT 2: medium, eye level, 35mm, slow push-in, three-point.',
    code: 'Literalmente um array de objetos. Cada linha vira { framing, angle, lens, move, light, ease }.',
    alt: 'É um ticket de Jira por plano. Critérios de aceite: "medium, eye level, 35mm". O código é o PR que entrega.',
    demos: [['shotList', 'ver a shot list do exemplo']],
  },
  {
    id: 'notation', name: 'Notação de movimento', aka: 'setas e molduras',
    analogy: 'As setinhas de "vire à direita" do GPS, só que pra câmera.',
    short: 'setas de GPS pra câmera',
    definition: 'Setas e molduras desenhadas no storyboard: moldura de início, moldura de fim e a direção do movimento.',
    screen: 'Push-in: moldura menor tracejada dentro do quadro, setas apontando pra ela. Pan: seta curva pro lado.',
    code: 'A moldura de fim é a pose final do tween. As setas são o caminho entre as duas poses.',
    alt: 'Imagine o diff de um PR: moldura de início é o "antes", moldura de fim é o "depois", e as setas são as linhas verdes.',
    demos: [['notation', 'storyboard com setas']],
  },
  {
    id: 'establishing', name: 'Establishing shot', aka: 'plano de situação',
    analogy: 'O "era uma vez num reino distante" do filme.',
    short: 'era uma vez num reino distante',
    definition: 'Plano aberto no começo da cena que mostra onde tudo acontece.',
    screen: 'Lá de cima, bem aberto, a câmera desce e revela o set antes de chegar no herói.',
    code: 'Wide + high angle + lente curta, normalmente com crane down ou pan lento.',
    alt: 'Toda série de comédia corta pra fachada do prédio antes da cena no apartamento. Aquele plano da fachada é o establishing.',
    demos: [['establishing', 'establishing']],
  },
  {
    id: 'coverage', name: 'Coverage', aka: 'cobertura',
    analogy: 'Tirar a mesma foto de três ângulos pra escolher a melhor depois.',
    short: 'a mesma foto de três ângulos',
    definition: 'Filmar a mesma ação de vários ângulos e enquadramentos pra ter opções na edição.',
    screen: 'Três câmeras ao mesmo tempo: wide, medium e close-up do mesmo momento.',
    code: 'Várias câmeras (aqui A, B e C) renderizando o mesmo instante da cena.',
    alt: 'Igual a ter o mesmo componente em mobile, tablet e desktop: a mesma cena, três "breakpoints" de enquadramento.',
    demos: [['coverage', 'cobertura em 3 câmeras']],
  },
];

const QUIZ = [
  {
    id: 'q1',
    text: 'Primeiro plano da cena, bem aberto, mostrando onde tudo acontece. É o:',
    options: ['Close-up', 'Establishing shot', 'Match cut', 'Coverage'],
    answer: 1,
    why: [
      'Close-up é o oposto: fecha no rosto.',
      'Establishing situa o público: onde e quando.',
      'Match cut é um tipo de corte.',
      'Coverage é filmar a mesma ação de vários ângulos.',
    ],
  },
  {
    id: 'q2',
    text: 'Filmar a mesma ação em wide, medium e close-up pra escolher na edição é:',
    options: ['Coverage', 'Pacing', 'Continuity', 'Storyboard'],
    answer: 0,
    why: [
      'Isso. Mais opções na edição.',
      'Pacing é ritmo.',
      'Continuidade é manter coerência entre planos.',
      'Storyboard é o planejamento desenhado.',
    ],
  },
  {
    id: 'q3',
    text: 'No storyboard, uma moldura tracejada menor dentro do quadro, com setas apontando pra ela, indica:',
    options: ['Pan', 'Push-in', 'Tilt', 'Dutch angle'],
    answer: 1,
    why: [
      'Pan seria uma seta curva pro lado.',
      'O quadro final é menor: a câmera se aproxima.',
      'Tilt seria uma seta vertical.',
      'Dutch é o quadro inclinado.',
    ],
  },
];

const lesson = createLesson({ key: 'm6', terms: TERMS, quiz: QUIZ, achievement: ACHIEVEMENT });
lesson.state.shots ??= [blankShot()];
lesson.state.playedExample ??= false;
const shots = lesson.state.shots;

const extraSteps = () => [
  [lesson.state.playedExample, 'Rodar a shot list de exemplo'],
  [lesson.state.challenge, 'Shot list final de 3 planos'],
];

const FRAMING_WORDS = [
  ['extremeCloseUp', ['extreme close', 'ecu', 'plano detalhe']],
  ['closeUp', ['close-up', 'close up', 'closeup', 'close', 'primeiro plano']],
  ['medium', ['medium', 'plano médio', 'médio', 'medio']],
  ['wide', ['wide', 'plano aberto', 'aberto', 'plano geral', 'establishing']],
];
const ANGLE_WORDS = [
  ['high', ['high angle', 'plongée', 'plongee', 'de cima']],
  ['low', ['low angle', 'contra-plongée', 'contra-plongee', 'de baixo']],
  ['dutch', ['dutch', 'inclinad']],
  ['eye', ['eye level', 'altura dos olhos']],
];
const MOVE_WORDS = {
  static: ['static', 'estático', 'estatico', 'fixo', 'parado'],
  pushIn: ['push-in', 'push in', 'dolly in'],
  pullOut: ['pull-out', 'pull out', 'dolly out'],
  truckLeft: ['truck'],
  truckRight: ['truck'],
  panLeft: ['pan '],
  panRight: ['pan '],
  tiltUp: ['tilt'],
  craneUp: ['crane', 'jib'],
  craneDown: ['crane', 'jib'],
  orbitRight: ['orbit', 'arc'],
  tracking: ['tracking', 'follow'],
};

function detect(text, table) {
  const found = table.find(([, words]) => words.some(word => text.includes(word)));
  return found?.[0] ?? null;
}

function reviewShot(shot, index) {
  const text = ` ${shot.text.toLowerCase()} `;
  const issues = [];
  if (shot.text.trim().length < 12) return [`Shot ${index + 1}: escreva o plano em linguagem de cinema antes de montar.`];
  const framing = detect(text, FRAMING_WORDS);
  if (!framing) issues.push(`Shot ${index + 1}: o texto não diz o enquadramento (wide, medium, close-up...).`);
  else if (framing !== shot.framing) issues.push(`Shot ${index + 1}: escreveu "${FRAMINGS[framing].label}" mas montou "${FRAMINGS[shot.framing].label}".`);
  const angle = detect(text, ANGLE_WORDS);
  if (angle && angle !== shot.angle) issues.push(`Shot ${index + 1}: escreveu "${ANGLES[angle].label}" mas montou "${ANGLES[shot.angle].label}".`);
  if (!MOVE_WORDS[shot.move].some(word => text.includes(word))) issues.push(`Shot ${index + 1}: o texto não menciona o movimento "${MOVE_LIBRARY[shot.move].cinema}".`);
  const lensMatch = text.match(/(\d{2,3})\s?mm/);
  if (lensMatch && Number(lensMatch[1]) !== Number(shot.lens)) issues.push(`Shot ${index + 1}: escreveu ${lensMatch[1]}mm mas montou ${shot.lens}mm.`);
  return issues;
}

function shotLine(shot, index) {
  return `SHOT ${index + 1}: ${FRAMINGS[shot.framing].label.toUpperCase()} · ${ANGLES[shot.angle].label.toUpperCase()} · ${shot.lens}mm · ${MOVE_LIBRARY[shot.move].cinema.toUpperCase()} · ${LIGHT_PRESETS[shot.light].label.toUpperCase()} · ${shot.ease} · ${shot.duration}s`;
}

function shotCode(list) {
  return `const shotList = [\n${list.map(s => `  { framing: "${s.framing}", angle: "${s.angle}", lens: ${s.lens}, move: "${s.move}", light: "${s.light}", ease: "${s.ease}", duration: ${s.duration} },`).join('\n')}\n]\n\nconst film = gsap.timeline()\nshotList.forEach((shot, i) => {\n  film.addLabel(\`shot\${i + 1}\`)\n  film.call(() => cutTo(shot))      // pose inicial + luz\n  film.add(move(shot), "<")         // movimento com ease\n})`;
}

function stopRun() {
  ui.run?.kill();
  ui.run = null;
  ui.playingIndex = -1;
  highlightStoryboard(-1);
}

function startShot(shot) {
  placeHeroOnMark();
  applyLightPreset(shot.light);
  placeShot(camA, composePose({ framing: shot.framing, angle: shot.angle, focal: Number(shot.lens) }));
  return MOVE_LIBRARY[shot.move].run(camA, dur(Number(shot.duration)), shot.ease);
}

function playShots(list, { label, onComplete } = {}) {
  stopRun();
  if (sandboxState.compareShots) setCompare(null);
  killShotMotion(camA);
  snapshotBaseline();
  ui.run = playSequence(list.map((shot, i) => ({
    label: `shot${i + 1}`,
    seconds: dur(Number(shot.duration)),
    start: () => {
      ui.playingIndex = i;
      highlightStoryboard(i);
      caption(shotLine(shot, i));
      sandboxState.tags.A = `shot ${i + 1}`;
      refreshFrameLabels();
      return startShot(shot);
    },
  })));
  ui.run.timeline.eventCallback('onComplete', () => {
    caption('');
    highlightStoryboard(-1);
    onComplete?.();
  });
  showCode({ label: label ?? 'Shot list', notes: ['cada shot vira uma pose + um tween, marcados por label.'], code: shotCode(list) });
  progress.takes += 1;
}

function drawArrow(context, fromX, fromY, toX, toY) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();
  context.beginPath();
  context.moveTo(toX, toY);
  context.lineTo(toX - 10 * Math.cos(angle - 0.45), toY - 10 * Math.sin(angle - 0.45));
  context.lineTo(toX - 10 * Math.cos(angle + 0.45), toY - 10 * Math.sin(angle + 0.45));
  context.closePath();
  context.fill();
}

function drawNotation(context, move) {
  const { width: w, height: h } = STORYBOARD_SIZE;
  context.strokeStyle = '#f0a640';
  context.fillStyle = '#f0a640';
  context.lineWidth = 3;
  const inner = { x: w * 0.25, y: h * 0.22, w: w * 0.5, h: h * 0.5 };
  const corners = [[0, 0], [w, 0], [0, h], [w, h]];
  const innerCorners = [[inner.x, inner.y], [inner.x + inner.w, inner.y], [inner.x, inner.y + inner.h], [inner.x + inner.w, inner.y + inner.h]];
  if (move === 'pushIn' || move === 'pullOut') {
    context.setLineDash([7, 5]);
    context.strokeRect(inner.x, inner.y, inner.w, inner.h);
    context.setLineDash([]);
    corners.forEach(([x, y], i) => {
      const [ix, iy] = innerCorners[i];
      const from = move === 'pushIn' ? [x + (ix - x) * 0.15, y + (iy - y) * 0.15] : [ix + (x - ix) * 0.1, iy + (y - iy) * 0.1];
      const to = move === 'pushIn' ? [x + (ix - x) * 0.85, y + (iy - y) * 0.85] : [ix + (x - ix) * 0.75, iy + (y - iy) * 0.75];
      drawArrow(context, from[0], from[1], to[0], to[1]);
    });
  } else if (move.startsWith('truck')) {
    const dir = move === 'truckRight' ? 1 : -1;
    drawArrow(context, w / 2 - dir * 70, h * 0.82, w / 2 + dir * 70, h * 0.82);
    drawArrow(context, w / 2 - dir * 70, h * 0.88, w / 2 + dir * 70, h * 0.88);
  } else if (move.startsWith('pan')) {
    const dir = move === 'panRight' ? 1 : -1;
    context.beginPath();
    context.ellipse(w / 2, h * 0.95, 90, 30, 0, Math.PI * 1.15, Math.PI * 1.85);
    context.stroke();
    const tipX = w / 2 + dir * 90 * Math.cos(Math.PI * 0.15);
    drawArrow(context, tipX - dir * 12, h * 0.95 - 22, tipX + dir * 2, h * 0.95 - 14);
  } else if (move === 'tiltUp' || move === 'craneUp' || move === 'craneDown') {
    const up = move !== 'craneDown';
    drawArrow(context, w * 0.88, up ? h * 0.75 : h * 0.25, w * 0.88, up ? h * 0.25 : h * 0.75);
    if (move.startsWith('crane')) drawArrow(context, w * 0.82, up ? h * 0.75 : h * 0.25, w * 0.82, up ? h * 0.25 : h * 0.75);
  } else if (move === 'orbitRight') {
    context.beginPath();
    context.ellipse(w / 2, h * 0.55, w * 0.32, h * 0.2, 0, 0.2, Math.PI - 0.2);
    context.stroke();
    drawArrow(context, w / 2 - w * 0.29, h * 0.62, w / 2 - w * 0.31, h * 0.58);
  } else if (move === 'tracking') {
    drawArrow(context, w * 0.35, h * 0.86, w * 0.65, h * 0.86);
  }
}

function drawLabelBand(context, shot, index) {
  const { width: w, height: h } = STORYBOARD_SIZE;
  context.fillStyle = 'rgba(15, 17, 21, 0.82)';
  context.fillRect(0, 0, w, 22);
  context.fillStyle = '#ece7dd';
  context.font = '500 11px "IBM Plex Mono", monospace';
  context.fillText(`SHOT ${index + 1} · ${FRAMINGS[shot.framing].label.toUpperCase()} · ${shot.lens}mm · ${MOVE_LIBRARY[shot.move].cinema.toUpperCase()}`, 8, 15);
  context.strokeStyle = '#2c323d';
  context.lineWidth = 1;
  context.strokeRect(0.5, 0.5, w - 1, h - 1);
}

function generateStoryboard(list, containerId = 'storyboard') {
  const container = $(containerId);
  if (!container) return;
  stopRun();
  if (sandboxState.compareShots) setCompare(null);
  killShotMotion(camA);
  container.innerHTML = list.map((shot, i) => `<figure class="board-frame" data-board="${i}">
    <canvas width="${STORYBOARD_SIZE.width}" height="${STORYBOARD_SIZE.height}" id="${containerId}-${i}" aria-label="${escapeHtml(shotLine(shot, i))}"></canvas>
    <figcaption>${escapeHtml(shot.text || shotLine(shot, i))}</figcaption>
  </figure>`).join('');
  list.forEach((shot, i) => {
    placeHeroOnMark();
    applyLightPreset(shot.light);
    placeShot(camA, composePose({ framing: shot.framing, angle: shot.angle, focal: Number(shot.lens) }));
    const canvas = $(`${containerId}-${i}`);
    renderStill(camA, canvas);
    const context = canvas.getContext('2d');
    drawNotation(context, shot.move);
    drawLabelBand(context, shot, i);
  });
  applyLightPreset(list[0].light);
  placeShot(camA, composePose({ framing: list[0].framing, angle: list[0].angle, focal: Number(list[0].lens) }));
}

function highlightStoryboard(index) {
  document.querySelectorAll('.board-frame').forEach(frame => {
    frame.classList.toggle('is-playing', Number(frame.dataset.board) === index);
  });
}

const DEMOS = {
  oneShot: { term: 'shot', run: () => playShots([EXAMPLE_SHOTS[1]], { label: 'Um shot' }) },
  scene: { term: 'scene', run: () => playExample() },
  sequence: {
    term: 'sequence',
    run: () => {
      playShots(EXAMPLE_SHOTS.slice(0, 2), { label: 'Sequência', onComplete: () => caption('fim da cena 1 → próxima cena (num filme, viria um fade e outro lugar)') });
    },
  },
  storyboard: { term: 'storyboard', run: () => showExampleBoard() },
  shotList: {
    term: 'shotList',
    run: () => {
      $('example-list').hidden = false;
      $('example-list').scrollIntoView({ behavior: sandboxState.motion ? 'smooth' : 'auto', block: 'center' });
      showCode({ label: 'Shot list', notes: ['a lista em texto é a spec. o array é a implementação.'], code: shotCode(EXAMPLE_SHOTS) });
    },
  },
  notation: { term: 'notation', run: () => showExampleBoard() },
  establishing: {
    term: 'establishing',
    run: () => {
      stopRun();
      if (sandboxState.compareShots) setCompare(null);
      placeHeroOnMark();
      applyLightPreset('natural');
      killShotMotion(camA);
      placeShot(camA, composePose({ framing: 'wide', angle: 'high', focal: 24 }));
      snapshotBaseline();
      camA.active = gsap.timeline()
        .add(crane(camA, -1, dur(3.5), 'power2.inOut'))
        .add(tweenShotTo(camA, composePose({ framing: 'medium', focal: 35 }), dur(2.2)), `+=${dur(0.6)}`);
      sandboxState.tags.A = 'establishing';
      refreshFrameLabels();
      showCode({ label: 'Establishing', notes: ['começa alto e aberto, desce e entra na cena.'], code: 'gsap.timeline()\n  .add(craneDown({ duration: 3.5 }))\n  .add(moveTo(mediumShot), "+=0.6")' });
    },
  },
  coverage: {
    term: 'coverage',
    run: () => {
      stopRun();
      placeHeroOnMark();
      applyLightPreset('threePoint');
      setCompare([camA, camB, camC]);
      placeShot(camA, composePose({ framing: 'wide' }));
      placeShot(camB, composePose({ framing: 'medium', azimuth: 0.6 }));
      placeShot(camC, composePose({ framing: 'closeUp', azimuth: -0.45, focal: 50 }));
      snapshotBaseline();
      Object.assign(sandboxState.tags, { A: 'wide', B: 'medium', C: 'close-up' });
      refreshFrameLabels();
      showCode({ label: 'Coverage', notes: ['mesmo instante, três câmeras. a edição escolhe depois.'], code: 'camA: wide · 35mm\ncamB: medium · 35mm · lateral\ncamC: close-up · 50mm · outro lado' });
    },
  },
};

function showExampleBoard() {
  $('example-board-wrap').hidden = false;
  generateStoryboard(EXAMPLE_SHOTS, 'example-board');
  $('example-board-wrap').scrollIntoView({ behavior: sandboxState.motion ? 'smooth' : 'auto', block: 'center' });
}

function playExample() {
  playShots(EXAMPLE_SHOTS, { label: 'Exemplo', onComplete: () => caption('fim da shot list de exemplo') });
  lesson.state.playedExample = true;
  lesson.markSeen('scene', 'shotList');
}

function shotCardMarkup(shot, index) {
  const field = (key, label, options) => selectField({ id: `shot-${index}-${key}`, label, options, value: shot[key] });
  return `<article class="shot-card" data-shot="${index}">
    <header class="shot-head">
      <b>SHOT ${index + 1}</b>
      <span class="shot-actions">
        <button class="btn" data-action="shot-preview" data-index="${index}">▶ ver</button>
        ${shots.length > 1 ? `<button class="btn" data-action="shot-remove" data-index="${index}" aria-label="Remover shot ${index + 1}">✕</button>` : ''}
      </span>
    </header>
    <div class="field">
      <label for="shot-${index}-text">Em linguagem de cinema</label>
      <textarea id="shot-${index}-text" rows="2" placeholder="ex.: medium, eye level, 35mm, slow push-in, three-point">${escapeHtml(shot.text)}</textarea>
    </div>
    <div class="shot-fields">
      ${field('framing', 'Framing', Object.entries(FRAMINGS).map(([k, f]) => [k, f.label]))}
      ${field('angle', 'Ângulo', Object.entries(ANGLES).map(([k, a]) => [k, a.label]))}
      ${selectField({ id: `shot-${index}-lens`, label: 'Lente', options: LENSES.map(mm => [String(mm), `${mm}mm`]), value: String(shot.lens) })}
      ${field('move', 'Movimento', Object.entries(MOVE_LIBRARY).map(([k, m]) => [k, m.label]))}
      ${field('light', 'Luz', Object.entries(LIGHT_PRESETS).map(([k, l]) => [k, l.label]))}
      ${field('ease', 'Easing', SHOT_EASES.map(e => [e, e]))}
      ${rangeField({ id: `shot-${index}-duration`, label: 'Duração', min: 1.5, max: 6, step: 0.5, value: shot.duration, format: v => `${v} s` })}
    </div>
  </article>`;
}

function renderEditor() {
  const editor = $('shot-editor');
  if (!editor) return;
  editor.innerHTML = shots.map(shotCardMarkup).join('');
  $('add-shot').disabled = shots.length >= MAX_SHOTS;
  renderShotListOutput();
}

function renderShotListOutput() {
  const output = $('shot-list-output');
  if (output) output.textContent = shots.map(shotLine).join('\n');
}

function judgeChallenge() {
  const issues = [];
  if (shots.length < MAX_SHOTS) issues.push(`A shot list precisa de ${MAX_SHOTS} planos (tem ${shots.length}).`);
  shots.forEach((shot, i) => issues.push(...reviewShot(shot, i)));
  const sameAsExample = shots.every((shot, i) => shot.text.trim() === EXAMPLE_SHOTS[i]?.text);
  if (sameAsExample) issues.push('Copiar o exemplo não vale. Escreve a sua!');
  const result = $('editor-result');
  if (issues.length) {
    result.className = 'ch-result bad';
    result.innerHTML = `Corta! <ul>${issues.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
    return;
  }
  result.className = 'ch-result ok';
  result.textContent = 'Texto e montagem batem. Rodando o seu filme... 🎬';
  playShots(shots, {
    label: 'Sua shot list',
    onComplete: () => {
      result.textContent = 'É take! Shot list escrita, montada e rodada. A spec virou código. 🏆';
      lesson.completeChallenge();
    },
  });
}

function render(container) {
  container.innerHTML = `
    <div class="hero-title">
      ${slate(6, 'Storyboard')}
      <h1>Storyboard e <em>shot list</em></h1>
      <p class="lede">O módulo que junta tudo. O storyboard é a <b>especificação</b>, o código é a <b>implementação</b>. Você vai escrever planos em linguagem de cinema e ver cada um virar pose, lente, luz e ease.</p>
      <p class="lede-muted">O editor de shot list fica mais abaixo. Ele usa as peças de todos os módulos: framing e ângulo (3), lente (2), movimento (1), luz (4) e easing (5).</p>
    </div>
    ${lesson.askSection({ number: 1, intro: 'Marque o que já conhece. Se você já escreveu ticket com critério de aceite, shot list vai parecer familiar.' })}
    ${lesson.termsSection({ number: 2, title: 'Do papel pro set', intro: 'Analogia, frase, demo. As demos tocam planos montados com as peças dos módulos anteriores.' })}
    <section class="section critical" id="critical">
      <span class="eyebrow">3 · Ponto crítico</span>
      <h2>Storyboard = spec</h2>
      <p>Cada linha da shot list tem uma tradução direta pro código. Se a linha é ambígua ("câmera mexe um pouco"), o código vai ser chute. Se é precisa ("medium, eye level, 35mm, slow push-in"), o código praticamente se escreve.</p>
      <div class="table-wrap"><table class="cheat">
        <thead><tr><th>Na shot list</th><th>No código</th></tr></thead>
        <tbody>
          <tr><td>Medium, eye level</td><td>composePose({ framing: "medium", angle: "eye" })</td></tr>
          <tr><td>35mm</td><td>camera.fov = fovFromFocal(35)</td></tr>
          <tr><td>Slow push-in</td><td>gsap.to(camera.position, { z: "-=3", duration: 3 })</td></tr>
          <tr><td>Three-point</td><td>key + fill + rim ligadas</td></tr>
          <tr><td>power2.inOut</td><td>ease: "power2.inOut"</td></tr>
          <tr><td>Corte pro shot 2</td><td>tl.addLabel("shot2") + pose nova no mesmo frame</td></tr>
        </tbody>
      </table></div>
      <pre class="formula" id="example-list" hidden>${EXAMPLE_SHOTS.map(s => escapeHtml(s.text)).join('\n')}</pre>
      <div class="btn-row">
        <button class="btn primary" data-action="play-example">▶ Rodar a shot list de exemplo</button>
        <button class="btn" data-demo="storyboard">Ver o storyboard dela</button>
      </div>
      <div id="example-board-wrap" hidden><div class="storyboard" id="example-board"></div></div>
    </section>
    <section class="section" id="editor">
      <span class="eyebrow">4 · Editor de shot list</span>
      <h2>Sua shot list</h2>
      <p>Até ${MAX_SHOTS} planos. Escreva cada um em linguagem de cinema e monte com os seletores. O editor confere se o texto e a montagem dizem a mesma coisa.</p>
      <div class="shot-editor" id="shot-editor"></div>
      <div class="btn-row">
        <button class="btn" id="add-shot" data-action="shot-add">+ plano</button>
        <button class="btn" data-action="board">Gerar storyboard</button>
        <button class="btn primary" data-action="play-mine">▶ Rodar</button>
        <button class="btn" data-action="judge">Avaliar shot list</button>
      </div>
      <pre class="formula" id="shot-list-output" aria-label="Shot list gerada"></pre>
      <div class="storyboard" id="storyboard"><p class="panel-note">O storyboard aparece aqui quando você clicar em "Gerar storyboard". Cada quadro é renderizado do sandbox, com setas e molduras do movimento.</p></div>
      <div class="ch-result" id="editor-result" aria-live="polite"></div>
    </section>
    ${lesson.cheatSection(5)}
    ${lesson.quizSection(6)}
    <section class="section" id="challenge">
      <span class="eyebrow">7 · Mini-desafio final</span>
      <h2>A sua cena</h2>
      <p>Escreva uma shot list de 3 planos em linguagem de cinema e monte no editor acima. Quando texto e montagem baterem, o filme roda e o troféu é seu.</p>
      <ul class="criteria">
        <li>3 planos</li>
        <li>Cada texto diz o enquadramento e o movimento</li>
        <li>Texto e seletores sem contradição (ângulo, lente, framing)</li>
      </ul>
      <div class="challenge-actions">
        <button class="btn primary" data-action="judge">Avaliar shot list</button>
        <span class="panel-note" id="challenge-status"></span>
      </div>
    </section>
    ${lesson.awardSection(8)}`;
  renderEditor();
}

function renderControls(panel) {
  panel.innerHTML = `
    <div class="btn-row">
      <button class="btn primary" data-action="play-mine">▶ Rodar minha shot list</button>
      <button class="btn" data-action="stop">■ Parar</button>
      <button class="btn" data-action="board">Gerar storyboard</button>
    </div>
    <div class="btn-row">
      <button class="btn" data-action="play-example">Exemplo</button>
      <button class="btn" data-demo="establishing">Establishing</button>
      <button class="btn" data-demo="coverage">Coverage</button>
      <button class="btn" data-action="judge">Avaliar</button>
    </div>
    <p class="panel-note">O editor fica no conteúdo, seção 4. Aqui você roda, para e gera o storyboard.</p>`;
}

function handleClick(button) {
  if (lesson.handleClick(button)) return;
  const { demo, action, index } = button.dataset;
  if (demo) {
    DEMOS[demo].run();
    lesson.markSeen(DEMOS[demo].term);
    return;
  }
  switch (action) {
    case 'play-example':
      playExample();
      break;
    case 'play-mine':
      playShots(shots, { label: 'Sua shot list' });
      break;
    case 'stop':
      stopRun();
      caption('');
      break;
    case 'board':
      generateStoryboard(shots);
      lesson.markSeen('storyboard', 'notation');
      break;
    case 'judge':
      $('editor').scrollIntoView({ behavior: sandboxState.motion ? 'smooth' : 'auto', block: 'start' });
      judgeChallenge();
      break;
    case 'shot-add':
      if (shots.length >= MAX_SHOTS) return;
      shots.push(blankShot());
      saveProgress();
      renderEditor();
      break;
    case 'shot-remove':
      shots.splice(Number(index), 1);
      saveProgress();
      renderEditor();
      break;
    case 'shot-preview': {
      const shot = shots[Number(index)];
      playShots([shot], { label: `Shot ${Number(index) + 1}` });
      break;
    }
  }
}

function handleInput(event) {
  const match = event.target.id.match(/^shot-(\d)-(\w+)$/);
  if (!match) return;
  const [, index, key] = match;
  const shot = shots[Number(index)];
  if (!shot) return;
  const { value } = event.target;
  shot[key] = key === 'lens' || key === 'duration' ? Number(value) : value;
  if (key === 'duration') $(`shot-${index}-duration-out`).textContent = `${value} s`;
  saveProgress();
  renderShotListOutput();
}

export default {
  id: 6,
  title: 'Storyboard e shot list',
  ready: true,
  achievement: ACHIEVEMENT,
  render,
  renderControls,
  handleClick,
  handleInput,
  status: () => lesson.status(extraSteps().map(([done]) => done)),
  refreshProgressUi: () => lesson.refresh(extraSteps()),
  enter() {
    ui.active = true;
  },
  afterReset() {
    stopRun();
  },
  leave() {
    stopRun();
    if (!ui.active) return;
    ui.active = false;
    if (sandboxState.compareShots) setCompare(null);
  },
};
