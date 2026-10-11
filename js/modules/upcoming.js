import { slate } from '../course-ui.js';

export function createUpcomingModule({ id, title, terms, achievement }) {
  return {
    id,
    title,
    ready: false,
    achievement,
    status: () => ({ percent: 0, complete: false }),
    render(container) {
      container.innerHTML = `
        <div class="hero-title">
          ${slate(id, title)}
          <h1>${title}</h1>
          <p class="lede">Em pré-produção. Esta cena sai depois do seu feedback no Módulo 1, e o formato pode mudar com o que você disser.</p>
        </div>
        <section class="section">
          <span class="eyebrow">No roteiro</span>
          <h2>Termos que vêm aí</h2>
          <div class="placeholder-terms">${terms.map(term => `<span class="chip static">${term}</span>`).join('')}</div>
        </section>
        <section class="section">
          <span class="eyebrow">Achievement</span>
          <div class="award"><div class="ico" aria-hidden="true">${achievement.icon}</div><div><h3>${achievement.name}</h3><p>Bloqueado até a cena ser filmada.</p></div></div>
        </section>`;
    },
    renderControls(panel) {
      panel.innerHTML = `<p class="panel-note">Os controles da Cena 0${id} chegam junto com ela. Por enquanto o set é seu: arraste a visão de set à vontade.</p>`;
    },
  };
}
