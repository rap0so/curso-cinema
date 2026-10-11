import * as THREE from 'three';
import { HOME, camA, camB, crates, hero, fovFromFocal, focalFromFov, setFocal } from '../sandbox/scene.js';
import {
  sandboxState, dur, snapshotBaseline, killShotMotion, setCompare, setDof, setExtraReadout,
  refreshFrameLabels, caption, notify,
} from '../sandbox/stage.js';
import { tweenFocal, tweenShotTo, placeShot, dollyZoom } from '../sandbox/camera-moves.js';
import { measureHeroFraming } from '../sandbox/framing.js';
import { showCode } from '../code-panel.js';
import { slate } from '../course-ui.js';
import { progress } from '../progress.js';
import { createLesson, panelTabs, rangeField } from '../lesson.js';
import { $ } from '../html.js';

const gsap = window.gsap;
const HERO_CHEST = new THREE.Vector3(0, 1.2, 0);
const DOLLY_ZOOM_TRAVEL = 4;

const ui = { active: false, panelTab: 'lens', challengeActive: false, challengeTarget: 0, challengeStart: 7 };

const poseAt = (distance, focal) => ({ pos: new THREE.Vector3(0, 1.6, distance), target: HOME.target.clone(), focal });

const ACHIEVEMENT = { id: 'm2', icon: '🔭', name: 'Fala Fluente de Lente', desc: 'Sabe que dolly não é zoom e tem a fórmula pra provar.' };

const FOV_FIGURE = `
<svg class="diagram" viewBox="0 0 640 170" role="img" aria-label="Sensor de 24mm e duas lentes: com 24mm o ângulo é aberto, com 85mm o ângulo é fechado.">
  <rect x="40" y="55" width="8" height="60" fill="#ece7dd"/>
  <text x="18" y="140">sensor 24mm</text>
  <line x1="48" y1="55" x2="110" y2="85" stroke="#f0a640"/><line x1="48" y1="115" x2="110" y2="85" stroke="#f0a640"/>
  <line x1="110" y1="85" x2="290" y2="-2" stroke="#f0a640" stroke-opacity="0.5"/><line x1="110" y1="85" x2="290" y2="172" stroke="#f0a640" stroke-opacity="0.5"/>
  <circle cx="110" cy="85" r="5" fill="#f0a640"/>
  <text class="lbl" x="130" y="90">24mm · fov 53°</text>
  <rect x="352" y="55" width="8" height="60" fill="#ece7dd"/>
  <line x1="360" y1="55" x2="560" y2="85" stroke="#86b8ff"/><line x1="360" y1="115" x2="560" y2="85" stroke="#86b8ff"/>
  <line x1="560" y1="85" x2="630" y2="74.5" stroke="#86b8ff" stroke-opacity="0.5"/><line x1="560" y1="85" x2="630" y2="95.5" stroke="#86b8ff" stroke-opacity="0.5"/>
  <circle cx="560" cy="85" r="5" fill="#86b8ff"/>
  <text class="lbl" x="440" y="140">85mm · fov 16°</text>
  <text x="96" y="160">lente perto do sensor = ângulo aberto</text>
  <text x="380" y="160">lente longe = ângulo fechado</text>
</svg>`;

const TERMS = [
  {
    id: 'focal', name: 'Focal length', aka: '24 / 35 / 50 / 85mm',
    analogy: 'Seu olho e uma janela: colado no vidro você vê a rua inteira. Dando passos pra trás, a janela recorta só um pedaço.',
    short: 'olho mais perto ou mais longe da janela',
    definition: 'O número em mm que diz quanto da cena a lente pega. Pequeno pega muito, grande pega pouco e aproxima.',
    screen: '24mm abre o quadro; 85mm fecha no herói. A câmera não sai do lugar.',
    code: 'camera.fov = 2·atan(24 / (2·focal)) em graus. 35mm ≈ 37.8°.',
    alt: 'O zoom do celular: "0.5x" é a grande-angular (~13mm), "1x" fica perto de 24mm, "3x" perto de 77mm. O celular só esconde o número em mm de você.',
    figure: FOV_FIGURE,
    demos: [['focal24', '24mm'], ['focal35', '35mm'], ['focal50', '50mm'], ['focal85', '85mm']],
  },
  {
    id: 'fov', name: 'FOV', aka: 'field of view',
    analogy: 'Antolhos de cavalo: quanto mais fechados, menor o pedaço do mundo que ele vê.',
    short: 'antolhos de cavalo',
    definition: 'O ângulo de visão da câmera. No three.js é o ângulo vertical, em graus.',
    screen: 'fov alto = mais mundo no quadro. fov baixo = menos mundo, tudo maior.',
    code: 'camera.fov + camera.updateProjectionMatrix(). É focal length falando em graus.',
    alt: 'Lanterna: com o facho aberto você ilumina a sala toda; fechando o facho, só um círculo. O fov é a abertura do facho, só que pra ver em vez de iluminar.',
    demos: [['fovWide', 'fov 70°'], ['fovNarrow', 'fov 15°']],
  },
  {
    id: 'wideTele', name: 'Wide vs telephoto', aka: 'grande-angular vs tele',
    analogy: 'Wide é o olho mágico da porta: cabe o corredor inteiro, meio esticado. Tele é binóculo: pouca coisa, bem de perto.',
    short: 'olho mágico vs binóculo',
    definition: 'Wide (até uns 35mm) pega muito e exagera a profundidade. Tele (85mm pra cima) pega pouco e achata.',
    screen: 'Mesmo herói do mesmo tamanho: no wide o fundo fica enorme e distante; no tele ele cola no herói.',
    code: 'focal baixo + câmera perto vs focal alto + câmera longe. distance ∝ focal mantém o herói igual.',
    alt: 'Selfie de braço esticado (wide de perto) deixa o nariz enorme. A mesma foto de um amigo lá longe com zoom (tele) deixa o rosto proporcional. Por isso retrato clássico é 85mm.',
    demos: [['wideVsTele', '24mm × 85mm']],
  },
  {
    id: 'compression', name: 'Compressão de perspectiva', aka: 'lens compression',
    analogy: 'Fila de carros na estrada vista de longe com zoom: parece que estão todos colados.',
    short: 'fila de carros vista de longe',
    definition: 'Com tele de longe, objetos em profundidades diferentes parecem mais perto uns dos outros.',
    screen: 'Os pilares atrás do herói "chegam pra frente" e ficam quase do tamanho dele.',
    code: 'Quem comprime é a distância, não a lente. A tele só te obriga a ficar longe.',
    alt: 'Olha só o pilar logo atrás do herói na demo. No 24mm ele é um palito lá atrás. No 100mm ele parece estar encostado no ombro do herói. Ninguém moveu o pilar.',
    demos: [['compression', '24mm perto → 100mm longe']],
  },
  {
    id: 'dollyZoom', name: 'Dolly zoom', aka: 'efeito Vertigo',
    analogy: 'A sensação de "o chão sumiu" quando chega uma notícia bomba: você fica no lugar, mas o mundo atrás estica.',
    short: 'o chão sumindo',
    definition: 'Dolly pra um lado e zoom pro outro ao mesmo tempo: o herói fica do mesmo tamanho e o fundo estica ou encolhe.',
    screen: 'Herói congelado no quadro; o fundo parece respirar.',
    code: 'distance × tan(fov/2) constante: camera.position e camera.fov animados juntos.',
    alt: 'Vertigo (Hitchcock, 1958) inventou; Tubarão (1975) deixou famoso na cena da praia. Procura "Jaws dolly zoom" e você nunca mais desvê.',
    demos: [['dollyZoomOut', 'afasta + zoom in'], ['dollyZoomIn', 'aproxima + zoom out']],
  },
  {
    id: 'dof', name: 'Depth of field', aka: 'profundidade de campo',
    analogy: 'Olhe pro seu dedo bem perto do rosto: o fundo borra. Olhe pro fundo: o dedo borra.',
    short: 'dedo na frente do rosto',
    definition: 'A faixa de distância que fica nítida. O que fica fora dela borra (o famoso bokeh).',
    screen: 'Herói nítido, caixotes da frente e pilares do fundo borrados.',
    code: 'Pós-processamento: BokehPass com focus (distância em metros), aperture e maxblur.',
    alt: 'Modo retrato do celular: ele borra o fundo de propósito com software. O nosso também é de mentira, só que com shader.',
    demos: [['dofOn', 'ligar DOF'], ['dofOff', 'desligar']],
  },
  {
    id: 'focusPull', name: 'Focus pull', aka: 'rack focus',
    analogy: 'Alguém te chama enquanto você olha o celular: seus olhos refocam de perto pra longe.',
    short: 'olhar do celular pra quem chamou',
    definition: 'Mudar o foco de um objeto pra outro durante o plano.',
    screen: 'O caixote da frente estava nítido; o foco viaja e agora o herói fica nítido.',
    code: 'gsap.to(bokehPass.uniforms.focus, { value: distanciaDoHeroi })',
    alt: 'No set existe uma pessoa só pra isso: o focus puller. Gira o anel de foco na mão, guiado por marcas de fita no chão. Profissão de verdade, e das difíceis.',
    demos: [['focusPull', 'caixote → herói'], ['focusPullBack', 'herói → fundo']],
  },
  {
    id: 'clipping', name: 'Near / far clipping', aka: 'planos de corte',
    analogy: 'Uma fatia de pão: só o que está entre as duas faces do corte existe. O resto não borra, some.',
    short: 'fatia de pão',
    definition: 'Planos invisíveis: tudo mais perto que near ou mais longe que far não é desenhado.',
    screen: 'Com near alto o herói é fatiado. Com far baixo o fundo some como um precipício.',
    code: 'camera.near / camera.far + updateProjectionMatrix(). Near baixo demais também causa z-fighting.',
    alt: 'Lembra de jogo antigo em que o cenário aparecia do nada no horizonte? Era o far perto pra economizar GPU. Isso não existe no cinema, é coisa só do 3D. Por isso o termo é técnico, não de set.',
    demos: [['nearClip', 'near = 6.85'], ['farClip', 'far = 9'], ['clipReset', 'voltar ao normal']],
  },
];

const QUIZ = [
  {
    id: 'q1',
    text: 'Você quer o herói do mesmo tamanho, mas com o fundo bem colado nele. O que faz?',
    options: ['24mm de perto', '85mm de longe', 'Dolly in', 'Aumentar o far'],
    answer: 1,
    why: [
      'Wide de perto faz o contrário: o fundo foge pra longe.',
      'Tele de longe comprime: o fundo parece encostar no herói.',
      'Dolly in muda o tamanho do herói, e o fundo continua longe.',
      'far só decide até onde desenhar. Não aproxima nada.',
    ],
  },
  {
    id: 'q2',
    text: 'Dolly in e zoom in deixam o herói maior. O que denuncia qual foi usado?',
    options: ['A cor da cena', 'O fundo: no dolly a perspectiva muda, no zoom tudo só amplia', 'O tamanho final do herói', 'Nada, são iguais'],
    answer: 1,
    why: [
      'Cor não tem nada a ver com isso.',
      'Zoom amplia a imagem inteira por igual. Dolly muda a relação entre perto e longe.',
      'Dá pra deixar o herói do mesmo tamanho nos dois. É isso que torna a confusão possível.',
      'Se fossem iguais, o Hitchcock não teria inventado o dolly zoom.',
    ],
  },
  {
    id: 'q3',
    text: 'No three.js, trocar de 35mm pra 85mm significa:',
    options: ['Aumentar camera.fov', 'Diminuir camera.fov', 'Mover camera.position.z', 'Mudar camera.near'],
    answer: 1,
    why: [
      'fov maior é lente mais curta (mais wide).',
      'Focal maior = ângulo menor. 35mm ≈ 37.8°, 85mm ≈ 16°.',
      'Isso seria dolly. A lente não anda.',
      'near é corte, não lente.',
    ],
  },
];

const lensCode = mm => `const lens = { focal: camera.userData.focal }\ngsap.to(lens, {\n  focal: ${Math.round(mm)}, duration: 1.4, ease: "power2.inOut",\n  onUpdate: () => {\n    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(24 / (2 * lens.focal)))\n    camera.updateProjectionMatrix()\n  },\n})`;

const lesson = createLesson({ key: 'm2', terms: TERMS, quiz: QUIZ, achievement: ACHIEVEMENT });
lesson.state.compared ??= false;

const extraSteps = () => [
  [lesson.state.compared, 'Dolly × zoom lado a lado'],
  [lesson.state.challenge, 'Dolly zoom na mão'],
];

function prepareSingleShot(tag) {
  if (sandboxState.compareShots) setCompare(null);
  if (ui.challengeActive) exitChallenge();
  killShotMotion(camA);
  snapshotBaseline();
  sandboxState.tags.A = tag;
  refreshFrameLabels();
  progress.takes += 1;
}

const heroDistance = shot => shot.rig.pos.distanceTo(hero.position.clone().add(HERO_CHEST));

function animateFocus(from, to, seconds) {
  setDof({ enabled: true, focus: from });
  const focus = { value: from };
  return gsap.to(focus, { value: to, duration: seconds, ease: 'power2.inOut', onUpdate: () => setDof({ focus: focus.value }) });
}

function setClipping(near, far) {
  camA.cam.near = near;
  camA.cam.far = far;
  camA.showClipping = near > 0.1 || far < 140;
  syncControls();
}

const DEMOS = {
  focal24: { term: 'focal', run: () => focalDemo(24) },
  focal35: { term: 'focal', run: () => focalDemo(35) },
  focal50: { term: 'focal', run: () => focalDemo(50) },
  focal85: { term: 'focal', run: () => focalDemo(85) },
  fovWide: { term: 'fov', run: () => focalDemo(focalFromFov(70), 'fov 70°') },
  fovNarrow: { term: 'fov', run: () => focalDemo(focalFromFov(15), 'fov 15°') },
  wideVsTele: {
    term: 'wideTele',
    run: () => {
      if (ui.challengeActive) exitChallenge();
      setCompare([camA, camB]);
      [camA, camB].forEach(killShotMotion);
      snapshotBaseline();
      camA.active = tweenShotTo(camA, poseAt(7 * 24 / 35, 24), dur(1.6));
      camB.active = tweenShotTo(camB, poseAt(7 * 85 / 35, 85), dur(1.6));
      Object.assign(sandboxState.tags, { A: 'wide 24mm', B: 'tele 85mm' });
      refreshFrameLabels();
      progress.takes += 1;
      showCode({
        label: '24mm × 85mm',
        notes: ['herói do mesmo tamanho nos dois. o fundo conta a história.', 'distance ∝ focal: 4.8m no 24mm, 17m no 85mm.'],
        code: 'camA.position.z = 4.8; setFocal(camA, 24)\ncamB.position.z = 17;  setFocal(camB, 85)',
      });
    },
  },
  compression: {
    term: 'compression',
    run: () => {
      prepareSingleShot('compressão');
      camA.active = gsap.timeline()
        .add(tweenShotTo(camA, poseAt(4.8, 24), dur(1.2)))
        .call(() => caption('24mm de perto: o pilar lá atrás é um palito'))
        .add(tweenShotTo(camA, poseAt(20, 100), dur(3.2)), `+=${dur(1)}`)
        .call(() => caption('100mm de longe: o pilar colou no herói'));
      showCode({
        label: 'Compressão',
        notes: ['câmera recua e a lente fecha na mesma proporção.'],
        code: 'gsap.timeline()\n  .to(camera.position, { z: 4.8 })   // + focal 24\n  .to(camera.position, { z: 20 }, "+=1") // + focal 100',
      });
    },
  },
  dollyZoomOut: { term: 'dollyZoom', run: () => vertigo(3.5, 14) },
  dollyZoomIn: { term: 'dollyZoom', run: () => vertigo(14, 3.5) },
  dofOn: {
    term: 'dof',
    run: () => {
      prepareSingleShot('DOF');
      setDof({ enabled: true, focus: heroDistance(camA), aperture: 0.004 });
      syncControls();
      showCode({
        label: 'Depth of field',
        notes: ['focus em metros: a distância da câmera até o que deve ficar nítido.'],
        code: `const bokeh = new BokehPass(scene, camera, {\n  focus: ${heroDistance(camA).toFixed(1)}, aperture: 0.004, maxblur: 0.012,\n})\ncomposer.addPass(bokeh)`,
      });
    },
  },
  dofOff: {
    term: 'dof',
    run: () => {
      setDof({ enabled: false });
      syncControls();
    },
  },
  focusPull: {
    term: 'focusPull',
    run: () => {
      prepareSingleShot('rack focus');
      placeShot(camA, poseAt(7, 50));
      const crateDistance = camA.rig.pos.distanceTo(crates[0].position);
      camA.active = gsap.timeline()
        .add(animateFocus(crateDistance, crateDistance, 0))
        .add(animateFocus(crateDistance, heroDistance(camA), dur(1.8)), `+=${dur(0.8)}`);
      setDof({ aperture: 0.006 });
      syncControls();
      showCode({
        label: 'Focus pull',
        notes: ['o foco viaja do caixote (perto) pro herói.'],
        code: `gsap.to(bokeh.uniforms.focus, {\n  value: ${heroDistance(camA).toFixed(1)}, duration: 1.8, ease: "power2.inOut",\n})`,
      });
    },
  },
  focusPullBack: {
    term: 'focusPull',
    run: () => {
      prepareSingleShot('rack focus');
      placeShot(camA, poseAt(7, 50));
      camA.active = animateFocus(heroDistance(camA), 13, dur(1.8));
      setDof({ aperture: 0.006 });
      syncControls();
      showCode({
        label: 'Focus pull',
        notes: ['do herói pro fundo: agora quem borra é o herói.'],
        code: 'gsap.to(bokeh.uniforms.focus, { value: 13, duration: 1.8 })',
      });
    },
  },
  nearClip: {
    term: 'clipping',
    run: () => {
      prepareSingleShot('near');
      placeShot(camA, poseAt(7, 35));
      setClipping(6.85, 140);
      showCode({ label: 'Near', notes: ['tudo a menos de 6.85m da câmera deixa de existir.'], code: 'camera.near = 6.85\ncamera.updateProjectionMatrix()' });
    },
  },
  farClip: {
    term: 'clipping',
    run: () => {
      prepareSingleShot('far');
      placeShot(camA, poseAt(7, 35));
      setClipping(0.1, 9);
      showCode({ label: 'Far', notes: ['nada além de 9m é desenhado. o fundo vira precipício.'], code: 'camera.far = 9\ncamera.updateProjectionMatrix()' });
    },
  },
  clipReset: {
    term: 'clipping',
    run: () => {
      setClipping(0.1, 140);
      showCode({ label: 'Near / far', notes: ['valores de volta ao padrão.'], code: 'camera.near = 0.1\ncamera.far = 140\ncamera.updateProjectionMatrix()' });
    },
  },
};

function focalDemo(mm, tag = `${Math.round(mm)}mm`) {
  prepareSingleShot(tag);
  camA.active = gsap.timeline({ onUpdate: syncControls }).add(tweenFocal(camA, mm, dur(1.4)));
  showCode({
    label: `Focal ${Math.round(mm)}mm`,
    notes: [`a câmera não se mexe. só o ângulo muda: ${fovFromFocal(mm).toFixed(1)}°.`],
    code: lensCode(mm),
  });
}

function vertigo(fromDistance, toDistance) {
  prepareSingleShot('dolly zoom');
  placeShot(camA, poseAt(fromDistance, 35 * fromDistance / 7));
  camA.active = dollyZoom(camA, toDistance, dur(3.6));
  showCode({
    label: 'Dolly zoom',
    notes: ['tamanho do herói na tela ∝ 1 / (distância · tan(fov/2)).', 'segura esse produto constante e o herói congela.'],
    code: `const k = camera.position.z * Math.tan(fovRad / 2)\nconst move = { z: ${fromDistance} }\ngsap.to(move, {\n  z: ${toDistance}, duration: 3.6, ease: "power1.inOut",\n  onUpdate: () => {\n    camera.position.z = move.z\n    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(k / move.z))\n    camera.updateProjectionMatrix()\n  },\n})`,
  });
}

function runDollyVsZoom() {
  if (ui.challengeActive) exitChallenge();
  setCompare([camA, camB]);
  [camA, camB].forEach(shot => {
    killShotMotion(shot);
    placeShot(shot, poseAt(7, 35));
  });
  snapshotBaseline();
  const dollyDistance = 4;
  const zoomFocal = 35 * 7 / dollyDistance;
  camA.active = tweenShotTo(camA, poseAt(dollyDistance, 35), dur(2.6));
  camB.active = tweenFocal(camB, zoomFocal, dur(2.6));
  Object.assign(sandboxState.tags, { A: 'dolly in', B: 'zoom in' });
  refreshFrameLabels();
  showCode({
    label: 'Dolly × Zoom',
    notes: ['A anda até 4m. B fica em 7m e fecha a lente pra 61mm.', 'herói igual nos dois. compare caixotes e pilares.'],
    code: `gsap.to(camA.position, { z: ${dollyDistance} })\ngsap.to(lensB, { focal: ${zoomFocal.toFixed(1)}, onUpdate: applyFovB })`,
  });
  progress.takes += 1;
  lesson.state.compared = true;
  lesson.markSeen('dollyZoom');
}

function updateChallengeStatus() {
  const framing = measureHeroFraming(camA);
  const travel = Math.abs(camA.rig.pos.z - ui.challengeStart);
  const drift = Math.abs(framing.share - ui.challengeTarget) / ui.challengeTarget;
  const hud = document.querySelector('#frame-a .frame-hud');
  hud.hidden = false;
  hud.textContent = `herói ${Math.round(framing.share * 100)}% (alvo ${Math.round(ui.challengeTarget * 100)}%) · andou ${travel.toFixed(1)} m`;
  const result = $('ch-result');
  if (!result) return;
  if (travel >= DOLLY_ZOOM_TRAVEL && drift <= 0.08) {
    result.className = 'ch-result ok';
    result.textContent = `É take! Andou ${travel.toFixed(1)}m e o herói ficou do mesmo tamanho. Hitchcock mandou um joinha. 👍`;
    lesson.completeChallenge();
  } else if (travel >= DOLLY_ZOOM_TRAVEL) {
    result.className = 'ch-result bad';
    result.textContent = `Já andou ${travel.toFixed(1)}m. Agora ajusta a lente até o herói voltar pra ${Math.round(ui.challengeTarget * 100)}%.`;
  } else {
    result.className = 'ch-result';
    result.textContent = `Ande pelo menos ${DOLLY_ZOOM_TRAVEL}m com a câmera e compense na lente.`;
  }
}

function enterChallenge() {
  if (sandboxState.compareShots) setCompare(null);
  setDof({ enabled: false });
  killShotMotion(camA);
  placeShot(camA, poseAt(7, 35));
  ui.challengeActive = true;
  ui.panelTab = 'challenge';
  ui.challengeStart = 7;
  ui.challengeTarget = measureHeroFraming(camA).share;
  sandboxState.tags.A = 'desafio';
  snapshotBaseline();
  renderControls($('controls'));
  refreshFrameLabels();
  updateChallengeStatus();
  showCode({
    label: 'Desafio · dolly zoom',
    notes: ['dois sliders, um efeito. a fórmula está no Ponto crítico, mas dá pra fazer no olho.'],
    code: 'camera.position.z = distancia\ncamera.fov = fovFromFocal(focal)\ncamera.updateProjectionMatrix()',
  });
}

function exitChallenge() {
  ui.challengeActive = false;
  sandboxState.tags.A = '';
  document.querySelector('#frame-a .frame-hud').hidden = true;
  if (ui.panelTab === 'challenge') {
    ui.panelTab = 'lens';
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
  set('lens-focal', camA.focal, `${Math.round(camA.focal)}mm · ${camA.cam.fov.toFixed(1)}°`);
  set('lens-near', camA.cam.near, `${camA.cam.near.toFixed(2)} m`);
  set('lens-far', camA.cam.far, `${Math.round(camA.cam.far)} m`);
  set('dof-focus', sandboxState.dof.focus, `${sandboxState.dof.focus.toFixed(1)} m`);
  set('dof-aperture', sandboxState.dof.aperture * 1000, (sandboxState.dof.aperture * 1000).toFixed(1));
  const dofToggle = $('dof-toggle');
  if (dofToggle) dofToggle.setAttribute('aria-pressed', String(sandboxState.dof.enabled));
}

function render(container) {
  container.innerHTML = `
    <div class="hero-title">
      ${slate(2, 'Lente')}
      <h1>A <em>lente</em></h1>
      <p class="lede">No Módulo 1 a câmera andava. Agora ela fica parada e quem trabalha é o vidro. Spoiler: a lente muda o <b>quanto</b> você vê, a distância muda o <b>como</b>.</p>
      <p class="lede-muted">O slider de focal está no painel do sandbox, com o fov calculado ao lado. O DOF liga um pós-processamento de verdade (BokehPass) no monitor da Cam A.</p>
    </div>
    ${lesson.askSection({ number: 1, intro: 'Marque o que já é de casa. Spoiler: fov você já mexeu em todo projeto three.js, só não chamava de lente.' })}
    ${lesson.termsSection({ number: 2, title: 'Vidro, ângulo e foco', intro: 'Analogia primeiro, depois a demo. Repare no readout: quase tudo aqui mexe em fov, não em position.' })}
    <section class="section critical" id="critical">
      <span class="eyebrow">3 · Ponto crítico</span>
      <h2>Dolly ≠ zoom</h2>
      <p>Os dois deixam o herói maior. Mas o <b>dolly</b> leva a câmera até ele (a perspectiva muda: o que está perto cresce mais rápido que o fundo) e o <b>zoom</b> só amplia o centro da imagem (tudo cresce junto, como dar zoom numa foto).</p>
      <div class="split-table">
        <div class="pos"><h4>Dolly in · position</h4><p>Caixotes passam pela câmera, pilares ficam pequenos lá atrás. Sensação de entrar na cena.</p></div>
        <div class="rot"><h4>Zoom in · fov</h4><p>Nada passa pela câmera. O fundo cresce junto com o herói e fica "colado". Sensação de olhar de longe.</p></div>
      </div>
      <div><button class="btn primary" data-action="compare">▶ Rodar dolly × zoom lado a lado</button></div>
      <h3 class="sub">Bônus técnico: mm → fov</h3>
      <p>Analogia antes da fórmula: o sensor é uma janelinha de 24mm de altura. A lente é o seu olho, a <i>focal</i> milímetros dessa janela. O fov é o ângulo do seu olho até as bordas da janela. Olho perto da janela, ângulo grande. Olho longe, ângulo pequeno.</p>
      <pre class="formula">fov = 2 · atan( sensorHeight / (2 · focalLength) )

const fov = THREE.MathUtils.radToDeg(2 * Math.atan(24 / (2 * focal)))
// 24mm → 53.1°   35mm → 37.8°   50mm → 27.0°   85mm → 16.1°</pre>
      <p class="lede-muted">Por que 24? É a altura do sensor full frame (36×24mm). Se o projeto simular outra câmera, troca o 24 pela altura do sensor dela.</p>
    </section>
    ${lesson.cheatSection(4)}
    ${lesson.quizSection(5)}
    ${lesson.challengeSection({
      number: 6,
      title: 'Dolly zoom na mão',
      brief: 'Sem fórmula pronta: dois sliders, um pra distância da câmera e outro pra focal. Faça o fundo esticar sem o herói mudar de tamanho.',
      criteria: ['A câmera anda pelo menos 4m (pra frente ou pra trás)', 'No fim, o herói com o mesmo tamanho do começo (±8%)'],
    })}
    ${lesson.awardSection(7)}`;
}

function lensPanelMarkup() {
  return `
    <div class="control-grid">
      ${rangeField({ id: 'lens-focal', label: 'Focal', min: 12, max: 200, step: 1, value: camA.focal, format: v => `${Math.round(v)}mm · ${fovFromFocal(v).toFixed(1)}°` })}
      <div class="btn-row">
        ${[24, 35, 50, 85].map(mm => `<button class="btn" data-demo="focal${mm}">${mm}mm</button>`).join('')}
      </div>
    </div>
    <div class="btn-row">
      <button class="btn wide" data-action="compare">Dolly × Zoom</button>
      <button class="btn" data-demo="wideVsTele">24 × 85</button>
      <button class="btn" data-demo="dollyZoomOut">Vertigo</button>
      <button class="btn" data-demo="focusPull">Focus pull</button>
    </div>
    <div class="control-grid">
      <div class="field"><label>Depth of field</label><button class="btn" id="dof-toggle" data-action="dof-toggle" aria-pressed="${sandboxState.dof.enabled}">DOF</button></div>
      ${rangeField({ id: 'dof-focus', label: 'Foco', min: 0.5, max: 25, step: 0.1, value: sandboxState.dof.focus, format: v => `${Number(v).toFixed(1)} m` })}
      ${rangeField({ id: 'dof-aperture', label: 'Abertura', min: 0.5, max: 10, step: 0.5, value: sandboxState.dof.aperture * 1000, format: v => Number(v).toFixed(1) })}
      ${rangeField({ id: 'lens-near', label: 'Near', min: 0.1, max: 8, step: 0.05, value: camA.cam.near, format: v => `${Number(v).toFixed(2)} m` })}
      ${rangeField({ id: 'lens-far', label: 'Far', min: 3, max: 140, step: 1, value: camA.cam.far, format: v => `${Math.round(v)} m` })}
    </div>`;
}

function challengePanelMarkup() {
  return `
    <div class="challenge-form two">
      ${rangeField({ id: 'ch-dist', label: 'Distância', min: 2, max: 16, step: 0.1, value: camA.rig.pos.z, format: v => `${Number(v).toFixed(1)} m` })}
      ${rangeField({ id: 'ch-focal', label: 'Focal', min: 12, max: 160, step: 1, value: camA.focal, format: v => `${Math.round(v)}mm` })}
    </div>
    <div class="challenge-actions"><button class="btn" data-action="open-challenge">Recomeçar do 35mm a 7m</button></div>
    <p class="ch-result" id="ch-result" aria-live="polite"></p>`;
}

function renderControls(panel) {
  panel.innerHTML = `
    ${panelTabs(ui.panelTab, [['lens', 'Lente'], ['challenge', 'Desafio']])}
    ${ui.panelTab === 'challenge' ? challengePanelMarkup() : lensPanelMarkup()}`;
  if (ui.panelTab === 'challenge') updateChallengeStatus();
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
  if (tab === 'lens') return exitChallenge();
  if (action === 'compare') return runDollyVsZoom();
  if (action === 'open-challenge') return enterChallenge();
  if (action === 'dof-toggle') {
    if (!sandboxState.dof.enabled) setDof({ enabled: true, focus: heroDistance(camA) });
    else setDof({ enabled: false });
    if (sandboxState.dof.enabled && sandboxState.compareShots) notify('O DOF aparece só no monitor da Cam A.');
    syncControls();
  }
}

function handleInput(event) {
  const { id, value } = event.target;
  const number = Number(value);
  if (id === 'lens-focal') {
    killShotMotion(camA);
    setFocal(camA, number);
    refreshFrameLabels();
  } else if (id === 'lens-near') setClipping(number, camA.cam.far);
  else if (id === 'lens-far') setClipping(camA.cam.near, number);
  else if (id === 'dof-focus') setDof({ enabled: true, focus: number });
  else if (id === 'dof-aperture') setDof({ enabled: true, aperture: number / 1000 });
  else if (id === 'ch-dist') camA.rig.pos.z = number;
  else if (id === 'ch-focal') {
    setFocal(camA, number);
    refreshFrameLabels();
  } else return;
  syncControls();
  const out = $(`${id}-out`);
  if (id === 'ch-dist') out.textContent = `${number.toFixed(1)} m`;
  if (id === 'ch-focal') out.textContent = `${Math.round(number)}mm`;
  if (id.startsWith('ch-')) updateChallengeStatus();
}

function extraReadoutRows() {
  const rows = [
    { name: 'camera.near', value: camA.cam.near, text: camA.cam.near.toFixed(2) },
    { name: 'camera.far', value: camA.cam.far, text: camA.cam.far.toFixed(0) },
  ];
  if (sandboxState.dof.enabled) {
    rows.push({ name: 'bokeh.focus', value: sandboxState.dof.focus, text: `${sandboxState.dof.focus.toFixed(1)} m` });
  }
  return rows;
}

export default {
  id: 2,
  title: 'A lente',
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
    ui.panelTab = 'lens';
    setExtraReadout(extraReadoutRows);
  },
  afterReset() {
    if (ui.challengeActive) exitChallenge();
    syncControls();
  },
  leave() {
    if (ui.challengeActive) exitChallenge();
    setExtraReadout(null);
    ui.active = false;
  },
};
