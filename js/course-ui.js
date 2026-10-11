import { $ } from './html.js';
import { progress } from './progress.js';

const formatTake = () => String(progress.takes).padStart(2, '0');

export function slate(sceneNumber, subject) {
  return `<div class="slate">
    <div class="slate-stripes"></div>
    <div class="slate-grid">
      <div><span>Prod.</span><b>Cine p/ Web</b></div>
      <div><span>Cena</span><b>0${sceneNumber}</b></div>
      <div><span>Assunto</span><b>${subject}</b></div>
      <div><span>Take</span><b id="slate-take">${formatTake()}</b></div>
    </div>
  </div>`;
}

export function refreshSlateTake() {
  const take = $('slate-take');
  if (take) take.textContent = formatTake();
}
