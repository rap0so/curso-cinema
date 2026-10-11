import { MODULES } from './modules/index.js';
import { startSandbox, onFrame, onReset, onUserReset, resetScene, sandboxState } from './sandbox/stage.js';
import { renderShelf, unlock, STAGEHAND } from './achievements.js';
import { refreshSlateTake } from './course-ui.js';
import { progress, saveProgress } from './progress.js';
import { $ } from './html.js';

const ACHIEVEMENTS = [
  ...MODULES.map(m => ({ ...m.achievement, sceneLabel: `Cena 0${m.id}` })),
  STAGEHAND,
];

let activeModule = null;

function renderNav() {
  $('module-nav').innerHTML = MODULES.map(m => `
    <button class="mod-btn ${m.ready ? '' : 'locked'}" data-module="${m.id}" aria-current="${m === activeModule}">
      <span class="num">CENA 0${m.id}</span><span class="t">${m.title}</span><span class="bar"><i style="width:${m.status().percent}%"></i></span>
    </button>`).join('');
}

function refreshProgress() {
  const overall = Math.round(MODULES.reduce((sum, m) => sum + m.status().percent, 0) / MODULES.length);
  $('overall-label').textContent = `curso ${overall}%`;
  renderNav();
  refreshSlateTake();
  activeModule?.refreshProgressUi?.();
}

function checkAchievements() {
  const earned = MODULES.filter(m => m.status().complete).map(m => m.achievement);
  if (progress.resets >= 10) earned.push(STAGEHAND);
  const newlyUnlocked = earned.filter(a => unlock(a, { animate: sandboxState.motion }));
  if (newlyUnlocked.length) renderShelf(ACHIEVEMENTS);
}

function setModule(id) {
  activeModule?.leave?.();
  activeModule = MODULES.find(m => m.id === id);
  resetScene();
  activeModule.render($('module-content'));
  activeModule.renderControls($('controls'));
  activeModule.enter?.();
  refreshProgress();
  window.scrollTo({ top: 0, behavior: sandboxState.motion ? 'smooth' : 'auto' });
}

function toggleShelf() {
  const shelf = $('shelf');
  shelf.hidden = !shelf.hidden;
  $('trophy-btn').setAttribute('aria-expanded', String(!shelf.hidden));
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.id === 'trophy-btn') return toggleShelf();
  if (button.dataset.module) return setModule(Number(button.dataset.module));
  activeModule.handleClick?.(button);
});

document.addEventListener('input', event => activeModule.handleInput?.(event));
document.addEventListener('change', event => activeModule.handleChange?.(event));

document.addEventListener('course:progress', () => {
  checkAchievements();
  refreshProgress();
});

onReset(() => activeModule?.afterReset?.());
onFrame(() => activeModule?.frame?.());

onUserReset(() => {
  progress.resets += 1;
  saveProgress();
  checkAchievements();
});

startSandbox();
renderShelf(ACHIEVEMENTS);
setModule(1);
