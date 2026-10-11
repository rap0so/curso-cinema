import { camA } from '../sandbox/scene.js';
import { dur, snapshotBaseline, killShotMotion, setExtraReadout, refreshFrameLabels, caption, sandboxState } from '../sandbox/stage.js';
import { placeShot } from '../sandbox/camera-moves.js';
import { composePose } from '../sandbox/framing.js';
import {
  lights, studio, practicalLamp, backdrop, applyLightPreset, updateLight, setSoftness, syncLights,
  contrastRatio, formatRatio, kelvinToColor,
} from '../sandbox/lighting.js';
import { showCode } from '../code-panel.js';
import { slate } from '../course-ui.js';
import { progress } from '../progress.js';
import { createLesson, panelTabs, rangeField } from '../lesson.js';
import { $ } from '../html.js';

const gsap = window.gsap;
const LIGHT_NAMES = { key: 'Key', fill: 'Fill', rim: 'Rim' };

const ui = { active: false, panelTab: 'lights', challengeActive: false, sequence: null };

const ACHIEVEMENT = { id: 'm4', icon: '💡', name: 'Gaffer Honorário', desc: 'Cada luz com seu emprego. Nenhuma de enfeite.' };

const RIG_FIGURE = `
<svg class="diagram" viewBox="0 0 640 220" role="img" aria-label="Vista de cima do three-point lighting: key na frente e de lado, fill do outro lado mais fraca, rim atrás do herói, câmera na frente.">
  <circle cx="320" cy="100" r="16" fill="#f0a640"/>
  <text class="lbl" x="342" y="104">herói</text>
  <rect x="309" y="190" width="22" height="16" rx="2" fill="#2a2f38" stroke="#ece7dd"/>
  <text x="340" y="203">câmera</text>
  <circle cx="440" cy="170" r="10" fill="#ffd9a0"/><line x1="440" y1="170" x2="330" y2="108" stroke="#ffd9a0" stroke-width="2"/>
  <text class="lbl" x="456" y="174">KEY · forma</text>
  <circle cx="190" cy="165" r="8" fill="#cfe0ff" fill-opacity="0.7"/><line x1="190" y1="165" x2="308" y2="108" stroke="#cfe0ff" stroke-opacity="0.6" stroke-dasharray="4 4"/>
  <text class="lbl" x="70" y="169">FILL · suaviza</text>
  <circle cx="260" cy="24" r="9" fill="#ece7dd"/><line x1="260" y1="24" x2="312" y2="88" stroke="#ece7dd" stroke-width="2"/>
  <text class="lbl" x="120" y="28">RIM · separa do fundo</text>
</svg>`;

const TERMS = [
  {
    id: 'threePoint', name: 'Three-point lighting', aka: 'key + fill + rim',
    analogy: 'Selfie boa: a janela de um lado (key), uma parede branca rebatendo do outro (fill) e o pôr do sol atrás de você (rim).',
    short: 'janela, parede branca e pôr do sol',
    definition: 'O esquema base de iluminação: três luzes, cada uma com um trabalho.',
    screen: 'O herói ganha volume, sombra controlada e uma borda que o descola do fundo.',
    code: 'Três SpotLight apontadas pro herói: key forte de lado, fill fraca do outro, rim atrás.',
    alt: 'Todo vídeo de YouTuber bem iluminado usa isso. Repare na próxima vez: um lado do rosto mais claro, sombra suave do outro e um brilho no cabelo vindo de trás.',
    figure: RIG_FIGURE,
    demos: [['threePoint', 'three-point']],
  },
  {
    id: 'key', name: 'Key light', aka: 'luz principal',
    analogy: 'O sol numa tarde: é ele que decide de que lado fica a sombra.',
    short: 'o sol da cena',
    definition: 'A luz mais forte, que define a forma e a direção das sombras.',
    screen: 'Só com ela: volume dramático, um lado claro e o outro mergulhado no escuro.',
    code: 'SpotLight com castShadow, a 45° do eixo da câmera e acima do herói.',
    alt: 'Lanterna embaixo do queixo contando história de terror: é uma key light de baixo pra cima. Mesma pessoa, outra luz principal, outro personagem.',
    demos: [['keyOnly', 'só key']],
  },
  {
    id: 'fill', name: 'Fill light', aka: 'luz de preenchimento',
    analogy: 'Um isopor branco rebatendo luz no lado escuro do rosto.',
    short: 'isopor rebatendo luz',
    definition: 'Luz fraca do lado oposto à key, que abre as sombras sem apagá-las.',
    screen: 'O lado escuro ganha detalhe. Quanto mais fill, menos drama.',
    code: 'SpotLight sem sombra, intensidade bem menor que a key.',
    alt: 'Compare: key sozinha é filme noir. Key + fill forte é comercial de margarina. A fill é o botão de drama da cena.',
    demos: [['keyFill', 'key + fill']],
  },
  {
    id: 'rim', name: 'Rim / back light', aka: 'contraluz',
    analogy: 'Alguém parado na frente de uma janela iluminada: aparece um contorno brilhante em volta da cabeça.',
    short: 'contorno brilhante da janela atrás',
    definition: 'Luz atrás do herói que desenha uma borda e o separa do fundo.',
    screen: 'Um filete de luz no ombro e na cabeça. O herói "descola" do cenário escuro.',
    code: 'SpotLight atrás e acima do herói, apontando pra nuca dele.',
    alt: 'Desliga e liga só a rim no painel olhando o monitor: com fundo escuro, sem rim, o herói vira parte do cenário.',
    demos: [['rimOn', 'liga a rim'], ['rimOnly', 'só rim']],
  },
  {
    id: 'hardSoft', name: 'Hard vs soft light', aka: 'luz dura vs suave',
    analogy: 'Sol do meio-dia (sombra recortada) vs dia nublado (sombra que some aos poucos).',
    short: 'meio-dia vs nublado',
    definition: 'Fonte pequena faz sombra de borda dura. Fonte grande ou difusa faz sombra de borda suave.',
    screen: 'Repare na borda da sombra do herói no chão: faca ou esfumado.',
    code: 'shadow.radius e penumbra: radius 1 + penumbra 0.05 (dura) vs radius 12 + penumbra 0.95 (suave).',
    alt: 'Por isso fotógrafo usa softbox (aquela caixa de pano enorme): ela transforma uma lâmpada pequena numa fonte grande. Fonte grande = sombra suave.',
    demos: [['hard', 'dura'], ['soft', 'suave']],
  },
  {
    id: 'contrast', name: 'Contrast ratio', aka: 'key : fill',
    analogy: 'Volume do microfone principal vs o do retorno: a razão entre eles define o clima.',
    short: 'volume do principal vs retorno',
    definition: 'A razão entre a intensidade da key e da fill. 2:1 é leve, 8:1 é dramático.',
    screen: 'Quanto maior a razão, mais escuro o lado da fill.',
    code: 'fill.intensity = key.intensity / ratio.',
    alt: 'Comédia romântica vive em 2:1. Thriller em 8:1. Se o roteiro é sombrio e a luz é 2:1, alguém errou o tom.',
    demos: [['ratio2', '2:1'], ['ratio4', '4:1'], ['ratio8', '8:1']],
  },
  {
    id: 'temperature', name: 'Color temperature', aka: 'Kelvin · warm / cool',
    analogy: 'Vela e lâmpada amarela são quentes (Kelvin baixo). Céu nublado é frio (Kelvin alto). Sim, o nome é ao contrário do que parece.',
    short: 'vela (quente) vs céu nublado (frio)',
    definition: 'A cor da luz em Kelvin: 2700K é laranja quente, 5600K é luz do dia, 9000K é azulado.',
    screen: 'A mesma cena muda de clima: aconchego, neutro, noite fria.',
    code: 'Converta Kelvin pra RGB e jogue em light.color. Aqui: kelvinToColor(k).',
    alt: 'Modo noturno do celular deixa a tela laranja: ele abaixa a temperatura de cor pra parecer luz de vela à noite.',
    demos: [['warm', '2700K'], ['daylight', '5600K'], ['cool', '9000K']],
  },
  {
    id: 'motivated', name: 'Motivated light', aka: 'luz justificada',
    analogy: 'Se o quarto tem um abajur aceso, a luz no rosto tem que parecer vir dele. Senão o público sente que é mentira.',
    short: 'a luz tem uma desculpa',
    definition: 'Luz que parece vir de uma fonte real da cena (janela, abajur, tela).',
    screen: 'A key vira quente e vem do lado do abajur. A cena fica crível.',
    code: 'Mova key.position pra perto da fonte da cena e copie a cor dela.',
    alt: 'Em filme de assalto, quando a lanterna do ladrão passa, a luz no rosto dele acompanha. Ela está "motivada" pela lanterna, mesmo que no set venha de um refletor fora do quadro.',
    demos: [['motivated', 'motivada pelo abajur']],
  },
  {
    id: 'practical', name: 'Practical light', aka: 'luz prática',
    analogy: 'O abajur que aparece no quadro. É cenário e é luz ao mesmo tempo.',
    short: 'o abajur no quadro',
    definition: 'Uma fonte de luz visível na cena, que faz parte do cenário.',
    screen: 'O abajur aparece aceso no quadro e ilumina o que está perto dele.',
    code: 'Um mesh emissivo + uma PointLight dentro dele.',
    alt: 'Neon de bar em filme noturno: aparece no quadro, deixa a cena colorida e ainda dá desculpa pra luz rosa no rosto do personagem.',
    demos: [['practical', 'acender o abajur']],
  },
  {
    id: 'silhouette', name: 'Silhouette', aka: 'silhueta',
    analogy: 'Alguém na frente de uma janela num dia de sol: você só vê o contorno preto.',
    short: 'contorno preto na janela',
    definition: 'Herói escuro contra um fundo claro. Só a forma, nenhum detalhe.',
    screen: 'Rosto some, a pose fala por ele. Mistério, anonimato, drama.',
    code: 'Desliga key e fill, mantém rim (ou fundo claro). Ambiente quase zero.',
    alt: 'Cartaz de filme de faroeste: cowboy preto contra o pôr do sol. Ninguém precisou ver o rosto pra entender quem manda.',
    demos: [['silhouette', 'silhueta']],
  },
];

const QUIZ = [
  {
    id: 'q1',
    text: 'O herói se mistura com o fundo escuro. Qual luz resolve?',
    options: ['Key', 'Fill', 'Rim', 'Practical'],
    answer: 2,
    why: [
      'A key dá forma, mas não separa o contorno do fundo.',
      'Fill abre sombra na frente. O fundo continua grudado.',
      'A rim desenha uma borda e descola o herói do fundo.',
      'O abajur ilumina o entorno dele, não o contorno do herói.',
    ],
  },
  {
    id: 'q2',
    text: 'Key com intensidade 4 e fill com 1. Qual o contrast ratio?',
    options: ['1:4', '4:1', '5:1', '2:1'],
    answer: 1,
    why: [
      'A ordem é sempre key : fill.',
      'Key / fill = 4 / 1 = 4:1. Drama moderado.',
      'Não se soma, se divide.',
      'Seria key 2, fill 1.',
    ],
  },
  {
    id: 'q3',
    text: 'Um abajur aceso aparece no quadro e a key vem do lado dele, quente. Isso é:',
    options: ['Silhouette', 'Luz motivada', 'Hard light', 'Contrast ratio'],
    answer: 1,
    why: [
      'Silhueta é herói escuro contra fundo claro.',
      'A key tem uma desculpa visível na cena: o abajur.',
      'Hard light fala da borda da sombra, não de onde a luz vem.',
      'Contrast ratio é a razão key:fill.',
    ],
  },
];

const lesson = createLesson({ key: 'm4', terms: TERMS, quiz: QUIZ, achievement: ACHIEVEMENT });
lesson.state.sequence ??= false;

const extraSteps = () => [
  [lesson.state.sequence, 'Ligar as luzes uma por uma'],
  [lesson.state.challenge, 'Silhueta só com rim'],
];

function lightCode(name) {
  const entry = lights[name];
  const p = entry.light.position;
  return `const ${name} = new THREE.SpotLight(color, ${entry.intensity.toFixed(1)})\n${name}.position.set(${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})\n${name}.target = hero\n${name}.visible = ${entry.on}`;
}

function preset(name, tag, notes, code) {
  stopSequence();
  snapshotBaseline();
  applyLightPreset(name);
  sandboxState.tags.A = tag;
  refreshFrameLabels();
  progress.takes += 1;
  caption('');
  syncControls();
  showCode({ label: tag, notes, code });
}

function setRatio(ratio) {
  preset('keyOnly', `${ratio}:1`, [`fill = key / ${ratio}.`], `fill.intensity = key.intensity / ${ratio} // ${(lights.key.intensity / ratio).toFixed(2)}`);
  updateLight('fill', { on: true, intensity: lights.key.intensity / ratio });
  syncControls();
}

function setKeyTemperature(kelvin, tag) {
  preset('threePoint', tag, [`${kelvin}K na key. Kelvin baixo = quente, alto = frio.`], `key.color.copy(kelvinToColor(${kelvin}))`);
  updateLight('key', { kelvin, gel: null });
  syncControls();
}

const DEMOS = {
  threePoint: { term: 'threePoint', run: () => preset('threePoint', 'three-point', ['cada luz com um trabalho.'], [lightCode('key'), lightCode('fill'), lightCode('rim')].join('\n\n')) },
  keyOnly: { term: 'key', run: () => preset('keyOnly', 'só key', ['a key decide a forma e a sombra.'], lightCode('key')) },
  keyFill: {
    term: 'fill',
    run: () => {
      preset('keyOnly', 'key + fill', ['fill do outro lado, bem mais fraca que a key (3).'], 'fill.visible = true\nfill.intensity = 1');
      updateLight('fill', { on: true });
      syncControls();
    },
  },
  rimOn: { term: 'rim', run: () => preset('threePoint', 'com rim', ['a borda brilhante descola o herói do fundo.'], lightCode('rim')) },
  rimOnly: {
    term: 'rim',
    run: () => {
      preset('silhouette', 'só rim', ['sem key, sem fill: sobra o contorno.'], 'key.visible = false\nfill.visible = false\nrim.intensity = 6');
      backdrop.visible = false;
    },
  },
  hard: { term: 'hardSoft', run: () => presetWithSoftness(false) },
  soft: { term: 'hardSoft', run: () => presetWithSoftness(true) },
  ratio2: { term: 'contrast', run: () => setRatio(2) },
  ratio4: { term: 'contrast', run: () => setRatio(4) },
  ratio8: { term: 'contrast', run: () => setRatio(8) },
  warm: { term: 'temperature', run: () => setKeyTemperature(2700, '2700K') },
  daylight: { term: 'temperature', run: () => setKeyTemperature(5600, '5600K') },
  cool: { term: 'temperature', run: () => setKeyTemperature(9000, '9000K') },
  motivated: { term: 'motivated', run: () => preset('motivated', 'motivada', ['key quente vindo do lado do abajur.'], 'key.position.copy(lamp.position).add(offset)\nkey.color.copy(kelvinToColor(2700))') },
  practical: {
    term: 'practical',
    run: () => {
      preset('keyOnly', 'abajur', ['o abajur é cenário e é luz.'], 'const bulb = new THREE.PointLight(0xffb867, 2.2, 7)\nlamp.add(bulb)');
      showPracticalOnly();
    },
  },
  silhouette: { term: 'silhouette', run: () => preset('silhouette', 'silhueta', ['fundo claro, herói sem luz na frente.'], 'key.visible = false\nfill.visible = false\nbackdrop.visible = true') },
};

function presetWithSoftness(soft) {
  const [tag, note, radius, penumbra] = soft ? ['luz suave', 'fonte grande: sombra esfumada.', 12, 0.95] : ['luz dura', 'fonte pequena: sombra recortada.', 1, 0.05];
  preset('keyOnly', tag, [note], `key.penumbra = ${penumbra}\nkey.shadow.radius = ${radius}`);
  setSoftness(soft);
  syncControls();
}

function showPracticalOnly() {
  lights.key.on = false;
  lights.fill.on = true;
  lights.fill.intensity = 0.3;
  practicalLamp.visible = true;
  syncLights();
  syncControls();
}

function stopSequence() {
  ui.sequence?.kill();
  ui.sequence = null;
}

function runOneByOne() {
  stopSequence();
  if (ui.challengeActive) exitChallenge();
  snapshotBaseline();
  applyLightPreset('keyOnly');
  lights.key.on = false;
  syncLights();
  syncControls();
  const step = dur(1.8);
  const turnOn = (name, text) => () => {
    updateLight(name, { on: true });
    caption(text);
    syncControls();
  };
  caption('tudo apagado');
  ui.sequence = gsap.timeline()
    .call(turnOn('key', 'KEY: dá forma e decide a sombra'), [], step * 0.6)
    .call(turnOn('fill', 'FILL: abre a sombra do outro lado'), [], `+=${step}`)
    .call(turnOn('rim', 'RIM: separa o herói do fundo'), [], `+=${step}`)
    .call(() => caption('three-point completo'), [], `+=${step}`);
  showCode({
    label: 'Uma por uma',
    notes: ['labels na timeline marcam cada luz entrando.'],
    code: 'gsap.timeline()\n  .call(() => key.visible = true, [], 1)\n  .call(() => fill.visible = true, [], "+=1.8")\n  .call(() => rim.visible = true, [], "+=1.8")',
  });
  progress.takes += 1;
  lesson.state.sequence = true;
  lesson.markSeen('threePoint', 'key', 'fill', 'rim');
}

function judgeChallenge() {
  const { key, fill, rim } = lights;
  const problems = [];
  const isLit = entry => entry.on && entry.intensity > 0.15;
  if (!studio.on) problems.push('Ligue o modo estúdio (qualquer preset de luz).');
  if (isLit(key)) problems.push('A key ainda está acesa: ela ilumina o rosto e mata a silhueta.');
  if (isLit(fill)) problems.push('A fill ainda está acesa.');
  if (practicalLamp.visible) problems.push('O abajur está aceso e ilumina o herói.');
  if (!rim.on) problems.push('Sem a rim não sobra nem o contorno.');
  else if (rim.intensity < 3) problems.push(`A rim está fraca (${rim.intensity.toFixed(1)}). Dramática pede 3 ou mais.`);
  const result = $('ch-result');
  if (problems.length) {
    result.className = 'ch-result bad';
    result.textContent = `Corta! ${problems.join(' ')}`;
    return;
  }
  result.className = 'ch-result ok';
  result.textContent = 'É take! Só contorno, nenhum detalhe. Dava capa de disco. 🎸';
  lesson.completeChallenge();
}

function enterChallenge() {
  stopSequence();
  applyLightPreset('threePoint');
  ui.challengeActive = true;
  ui.panelTab = 'challenge';
  sandboxState.tags.A = 'desafio';
  snapshotBaseline();
  renderControls($('controls'));
  refreshFrameLabels();
  showCode({ label: 'Desafio · silhueta', notes: ['comece do three-point e vá apagando o que sobra.'], code: 'key.visible = ?\nfill.visible = ?\nrim.intensity = ?' });
}

function exitChallenge() {
  ui.challengeActive = false;
  sandboxState.tags.A = '';
  if (ui.panelTab === 'challenge') {
    ui.panelTab = 'lights';
    renderControls($('controls'));
  }
}

function lightRowMarkup(name) {
  const entry = lights[name];
  return `<div class="light-row">
    <button class="btn light-toggle" data-light="${name}" aria-pressed="${entry.on && studio.on}">${LIGHT_NAMES[name]}</button>
    ${rangeField({ id: `light-${name}-intensity`, label: 'Intensidade', min: 0, max: 8, step: 0.1, value: entry.intensity, format: v => Number(v).toFixed(1) })}
    <div class="field"><label for="light-${name}-color">Cor</label><input type="color" id="light-${name}-color" value="#${kelvinToColor(entry.kelvin).getHexString()}"></div>
  </div>`;
}

function lightsMarkup() {
  return `
    <div class="light-rows">${Object.keys(LIGHT_NAMES).map(lightRowMarkup).join('')}</div>
    <div class="control-grid">
      ${rangeField({ id: 'light-kelvin', label: 'Temperatura da key', min: 2000, max: 10000, step: 100, value: lights.key.kelvin, format: v => `${v}K` })}
      <div class="field"><label>Ratio key:fill</label><output id="light-ratio" class="big-out">${formatRatio(contrastRatio())}</output></div>
    </div>`;
}

function renderControls(panel) {
  const isChallenge = ui.panelTab === 'challenge';
  panel.innerHTML = `
    ${panelTabs(ui.panelTab, [['lights', 'Luzes'], ['challenge', 'Desafio']])}
    ${lightsMarkup()}
    ${isChallenge ? `
      <div class="btn-row"><button class="btn" data-action="backdrop" aria-pressed="${backdrop.visible}">Fundo claro</button></div>
      <div class="challenge-actions">
        <button class="btn primary" data-action="challenge-judge">Avaliar silhueta</button>
        <button class="btn" data-action="open-challenge">Recomeçar</button>
      </div>
      <p class="ch-result" id="ch-result" aria-live="polite">${lesson.state.challenge ? 'Já fechado. Pode brincar de gaffer à vontade.' : 'Só a rim pode ficar acesa. O fundo claro é opcional.'}</p>`
    : `
      <div class="btn-row">
        <button class="btn" data-demo="threePoint">Three-point</button>
        <button class="btn" data-demo="silhouette">Silhueta</button>
        <button class="btn" data-action="soft" aria-pressed="${studio.soft}">Luz suave</button>
        <button class="btn" data-demo="practical">Abajur</button>
        <button class="btn" data-demo="motivated">Motivada</button>
        <button class="btn wide" data-action="one-by-one">Ligar uma por uma</button>
      </div>`}`;
}

function syncControls() {
  Object.keys(LIGHT_NAMES).forEach(name => {
    const entry = lights[name];
    const toggle = document.querySelector(`[data-light="${name}"]`);
    if (!toggle) return;
    toggle.setAttribute('aria-pressed', String(entry.on && studio.on));
    $(`light-${name}-intensity`).value = entry.intensity;
    $(`light-${name}-intensity-out`).textContent = entry.intensity.toFixed(1);
    $(`light-${name}-color`).value = `#${entry.light.color.getHexString()}`;
  });
  const kelvin = $('light-kelvin');
  if (kelvin) {
    kelvin.value = lights.key.kelvin;
    $('light-kelvin-out').textContent = `${lights.key.kelvin}K`;
  }
  const ratio = $('light-ratio');
  if (ratio) ratio.textContent = formatRatio(contrastRatio());
  document.querySelectorAll('[data-action="soft"]').forEach(b => b.setAttribute('aria-pressed', String(studio.soft)));
  document.querySelectorAll('[data-action="backdrop"]').forEach(b => b.setAttribute('aria-pressed', String(backdrop.visible)));
}

function ensureStudio() {
  if (!studio.on) applyLightPreset('keyOnly');
}

function render(container) {
  container.innerHTML = `
    <div class="hero-title">
      ${slate(4, 'Luz')}
      <h1><em>Luz</em></h1>
      <p class="lede">Câmera e lente decidem o que você vê. A luz decide como você <b>se sente</b> vendo. E no three.js luz é só mais um objeto: dá pra ligar, mover e trocar a cor.</p>
      <p class="lede-muted">No sandbox, a visão de set mostra cada luz como uma bolinha com uma linha até o herói. O painel liga, desliga, muda intensidade e cor de cada uma.</p>
    </div>
    ${lesson.askSection({ number: 1, intro: 'Marque o que já conhece. Se você já reclamou que um render "parecia chapado", você já sentiu falta de uma key light.' })}
    ${lesson.termsSection({ number: 2, title: 'Cada luz com um emprego', intro: 'Analogia, frase, demo. O readout embaixo do código mostra intensidade, Kelvin e ratio mudando.' })}
    <section class="section critical" id="critical">
      <span class="eyebrow">3 · Ponto crítico</span>
      <h2>Cada luz tem um trabalho</h2>
      <p>Luz não é "mais claro ou mais escuro". Cada uma resolve um problema. Se você não sabe dizer qual problema uma luz resolve, ela está sobrando.</p>
      <div class="split-table three">
        <div class="pos"><h4>Key · forma</h4><p>Dá volume e decide de que lado cai a sombra.</p></div>
        <div class="rot"><h4>Fill · suaviza</h4><p>Abre a sombra da key sem apagar o volume.</p></div>
        <div class="neutral"><h4>Rim · separa</h4><p>Desenha a borda e descola o herói do fundo.</p></div>
      </div>
      <div><button class="btn primary" data-action="one-by-one">▶ Ligar uma por uma</button></div>
    </section>
    ${lesson.cheatSection(4)}
    ${lesson.quizSection(5)}
    ${lesson.challengeSection({
      number: 6,
      title: 'Silhueta só com rim',
      brief: 'Monte uma silhueta dramática usando só a rim light. Nada de key, nada de fill, nada de abajur.',
      criteria: ['Key e fill apagadas', 'Abajur apagado', 'Rim acesa com intensidade 3 ou mais'],
    })}
    ${lesson.awardSection(7)}`;
}

function handleClick(button) {
  if (lesson.handleClick(button)) return;
  const { demo, tab, action, light } = button.dataset;
  if (demo) {
    DEMOS[demo].run();
    lesson.markSeen(DEMOS[demo].term);
    return;
  }
  if (light) {
    ensureStudio();
    updateLight(light, { on: !lights[light].on });
    syncControls();
    return;
  }
  if (tab === 'challenge') return enterChallenge();
  if (tab === 'lights') return exitChallenge();
  if (action === 'one-by-one') return runOneByOne();
  if (action === 'open-challenge') return enterChallenge();
  if (action === 'challenge-judge') return judgeChallenge();
  if (action === 'soft') {
    setSoftness(!studio.soft);
    syncControls();
  }
  if (action === 'backdrop') {
    backdrop.visible = !backdrop.visible;
    syncControls();
  }
}

function handleInput(event) {
  const { id, value } = event.target;
  const match = id.match(/^light-(key|fill|rim)-(intensity|color)$/);
  if (match) {
    ensureStudio();
    const [, name, field] = match;
    if (field === 'intensity') updateLight(name, { intensity: Number(value), on: true });
    else updateLight(name, { gel: value, on: true });
    syncControls();
    return;
  }
  if (id === 'light-kelvin') {
    ensureStudio();
    updateLight('key', { kelvin: Number(value), gel: null });
    syncControls();
  }
}

function extraReadoutRows() {
  const row = name => ({ name: `${name}.intensity`, value: lights[name].on && studio.on ? lights[name].intensity : 0, text: lights[name].on && studio.on ? lights[name].intensity.toFixed(1) : 'off' });
  const ratio = contrastRatio();
  return [
    row('key'), row('fill'), row('rim'),
    { name: 'key.kelvin', value: lights.key.kelvin, text: lights.key.gel ? `gel ${lights.key.gel}` : `${lights.key.kelvin}K` },
    { name: 'ratio key:fill', value: ratio === null ? -1 : Math.min(ratio, 99), text: formatRatio(ratio) },
  ];
}

function setupStage() {
  killShotMotion(camA);
  placeShot(camA, composePose({ framing: 'medium', azimuth: 0.35 }));
  applyLightPreset('threePoint');
  snapshotBaseline();
  syncControls();
}

export default {
  id: 4,
  title: 'Luz',
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
    ui.panelTab = 'lights';
    setExtraReadout(extraReadoutRows);
    setupStage();
  },
  afterReset() {
    stopSequence();
    if (!ui.active) return;
    if (ui.challengeActive) exitChallenge();
    setupStage();
  },
  leave() {
    stopSequence();
    if (ui.challengeActive) exitChallenge();
    setExtraReadout(null);
    ui.active = false;
  },
};
