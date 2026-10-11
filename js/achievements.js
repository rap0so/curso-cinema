import { $ } from './html.js';
import { progress, saveProgress } from './progress.js';

export const STAGEHAND = { id: 'stagehand', icon: '🧹', name: 'Contrarregra de Plantão', desc: 'Resetou o set 10 vezes. O set agradece.', secret: true };

export function renderShelf(achievements) {
  const unlocked = progress.achievements;
  $('shelf').innerHTML = achievements.filter(a => !a.secret || unlocked.includes(a.id)).map(a => {
    const has = unlocked.includes(a.id);
    const caption = has ? a.desc : a.sceneLabel ?? '';
    return `<div class="badge ${has ? '' : 'locked'}"><span class="ico" aria-hidden="true">${a.icon}</span><span><div class="name">${a.name}</div><div class="desc">${caption}</div></span></div>`;
  }).join('');
  $('trophy-count').textContent = `${unlocked.length}/${achievements.length}`;
}

export function unlock(achievement, { animate }) {
  if (progress.achievements.includes(achievement.id)) return false;
  progress.achievements.push(achievement.id);
  saveProgress();
  showAchievementModal(achievement, animate);
  return true;
}

function showAchievementModal(achievement, animate) {
  const root = $('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal ${animate ? 'pop' : ''}">
        <div class="slate-stripes"></div>
        <div class="modal-body">
          <div class="ico" aria-hidden="true">${achievement.icon}</div>
          <div class="kicker">Achievement desbloqueado</div>
          <h2 id="modal-title">${achievement.name}</h2>
          <p>${achievement.desc}</p>
          <button class="btn primary" id="modal-close">Valeu! Próxima cena</button>
        </div>
      </div>
    </div>`;
  const close = () => { root.innerHTML = ''; };
  $('modal-close').addEventListener('click', close);
  $('modal-close').focus();
  root.querySelector('.modal-backdrop').addEventListener('click', e => { if (e.target === e.currentTarget) close(); });
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') $('modal-root').innerHTML = '';
});
