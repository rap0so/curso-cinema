import { $, escapeHtml } from './html.js';
import { progress, announceProgress } from './progress.js';

export function panelTabs(active, tabs) {
  return `<div class="tabs" role="tablist">${tabs.map(([key, label]) =>
    `<button class="tab" role="tab" aria-selected="${key === active}" data-tab="${key}">${label}</button>`).join('')}</div>`;
}

export function rangeField({ id, label, min, max, step, value, format }) {
  return `<div class="field">
    <label for="${id}">${label} <output id="${id}-out">${format(value)}</output></label>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}">
  </div>`;
}

export function selectField({ id, label, options, value }) {
  return `<div class="field">
    <label for="${id}">${label}</label>
    <select id="${id}">${options.map(([optionValue, optionLabel]) =>
      `<option value="${optionValue}" ${optionValue === value ? 'selected' : ''}>${optionLabel}</option>`).join('')}</select>
  </div>`;
}

export function createLesson({ key, terms, quiz, achievement }) {
  progress[key] = { known: [], seen: [], quiz: {}, challenge: false, ...progress[key] };
  const state = progress[key];

  const isCovered = term => state.known.includes(term.id) || state.seen.includes(term.id);

  function markSeen(...termIds) {
    termIds.forEach(id => { if (!state.seen.includes(id)) state.seen.push(id); });
    announceProgress();
  }

  function completeChallenge() {
    if (state.challenge) return;
    state.challenge = true;
    announceProgress();
  }

  function quizStatus() {
    const answered = quiz.filter(q => state.quiz[q.id] !== undefined);
    const correct = answered.filter(q => state.quiz[q.id] === q.answer).length;
    const needed = Math.ceil(quiz.length * 2 / 3);
    return { answered: answered.length, correct, needed, passed: answered.length === quiz.length && correct >= needed };
  }

  function status(extraSteps = []) {
    const covered = terms.filter(isCovered).length;
    const quizInfo = quizStatus();
    const done = covered + Number(quizInfo.passed) + extraSteps.filter(Boolean).length;
    const total = terms.length + 1 + extraSteps.length;
    return { covered, quiz: quizInfo, percent: Math.round((done / total) * 100), complete: done === total };
  }

  function askSection({ number, intro }) {
    return `<section class="section" id="ask">
      <span class="eyebrow">${number} · Antes do primeiro take</span>
      <h2>Quais você já conhece?</h2>
      <p>${intro}</p>
      <div class="chips">${terms.map(t => `<button class="chip" data-known="${t.id}" aria-pressed="${state.known.includes(t.id)}">${t.name}</button>`).join('')}</div>
    </section>`;
  }

  function termCard(term) {
    const demos = term.demos?.length
      ? `<div class="demo-row">${term.demos.map(([demo, label]) => `<button class="btn" data-demo="${demo}">▶ ${label}</button>`).join('')}</div>`
      : '';
    return `<article class="term ${state.known.includes(term.id) ? 'is-known' : ''}" id="term-${term.id}">
      <header class="term-head">
        <h3>${term.name}</h3><span class="aka">${term.aka ?? ''}</span><span class="term-status"></span>
      </header>
      <div class="term-body">
        <p class="analogy">${term.analogy}</p>
        <p class="definition"><b>Em uma frase:</b> ${term.definition}</p>
        <button class="link-btn reopen" data-action="reopen" data-term="${term.id}">Rever mesmo assim</button>
        ${term.figure ?? ''}
        ${demos}
        <details class="more" data-term="${term.id}">
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

  function termsSection({ number, title, intro }) {
    return `<section class="section" id="terms">
      <span class="eyebrow">${number} · Os termos</span>
      <h2>${title}</h2>
      <p>${intro}</p>
      <div class="term-list">${terms.map(termCard).join('')}</div>
    </section>`;
  }

  function cheatSection(number) {
    const rows = terms.map(t => `<tr><td>${t.name}</td><td>${t.short}</td><td>${t.screen}</td><td>${escapeHtml(t.code)}</td></tr>`).join('');
    return `<section class="section" id="cheat">
      <span class="eyebrow">${number} · Cola</span>
      <h2>Tabela pra consultar</h2>
      <div class="table-wrap"><table class="cheat">
        <thead><tr><th>Termo</th><th>Analogia</th><th>O que muda na tela</th><th>O que mexer no código</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </section>`;
  }

  function quizMarkup() {
    const { answered: answeredCount, correct, needed, passed } = quizStatus();
    const questions = quiz.map((q, qi) => {
      const chosen = state.quiz[q.id];
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
    const foot = answeredCount === quiz.length
      ? `<div class="quiz-foot"><span>${correct}/${quiz.length} ${passed ? '· passou ✔' : `· precisa de ${needed}`}</span><button class="btn" data-action="quiz-retry">Refazer</button></div>`
      : '';
    return questions + foot;
  }

  function quizSection(number) {
    return `<section class="section" id="quiz">
      <span class="eyebrow">${number} · Checagem rápida</span>
      <h2>${quiz.length === 2 ? 'Duas' : 'Três'} perguntas</h2>
      <div class="quiz" id="quiz-body">${quizMarkup()}</div>
    </section>`;
  }

  function challengeSection({ number, title, brief, criteria }) {
    return `<section class="section" id="challenge">
      <span class="eyebrow">${number} · Mini-desafio</span>
      <h2>${title}</h2>
      <p>${brief}</p>
      <ul class="criteria">${criteria.map(c => `<li>${c}</li>`).join('')}</ul>
      <div class="challenge-actions">
        <button class="btn primary" data-action="open-challenge">Abrir desafio no sandbox</button>
        <span class="panel-note" id="challenge-status"></span>
      </div>
    </section>`;
  }

  function awardSection(number) {
    return `<section class="section" id="achievement">
      <span class="eyebrow">${number} · Achievement</span>
      <div class="award" id="award">
        <div class="ico" aria-hidden="true">${achievement.icon}</div>
        <div>
          <h3>${achievement.name}</h3>
          <p id="award-state"></p>
          <ul class="criteria" id="award-checklist"></ul>
        </div>
      </div>
    </section>`;
  }

  function refreshTermStatuses() {
    terms.forEach(term => {
      const card = $(`term-${term.id}`);
      if (!card) return;
      const known = state.known.includes(term.id);
      const seen = state.seen.includes(term.id);
      card.classList.toggle('is-known', known);
      const label = card.querySelector('.term-status');
      label.textContent = seen ? '● visto' : known ? 'já conhecia' : '';
      label.classList.toggle('known', known && !seen);
    });
  }

  function refresh(extraSteps = []) {
    refreshTermStatuses();
    const checklist = $('award-checklist');
    if (!checklist) return;
    const current = status(extraSteps.map(([done]) => done));
    const item = (done, text) => `<li class="${done ? 'done' : ''}">${text}</li>`;
    checklist.innerHTML = [
      item(current.covered === terms.length, `Termos vistos ou já conhecidos: ${current.covered}/${terms.length}`),
      ...extraSteps.map(([done, text]) => item(done, text)),
      item(current.quiz.passed, `Checagem: ${current.quiz.correct}/${quiz.length} (precisa de ${current.quiz.needed})`),
    ].join('');
    const unlocked = progress.achievements.includes(achievement.id);
    $('award').classList.toggle('unlocked', unlocked);
    $('award-state').textContent = unlocked ? 'Desbloqueado' : `${current.percent}% da cena filmada`;
    const challengeStatus = $('challenge-status');
    if (challengeStatus) challengeStatus.textContent = state.challenge ? '● Desafio concluído' : '○ Ainda não filmado';
  }

  function toggleKnown(button) {
    const id = button.dataset.known;
    const index = state.known.indexOf(id);
    if (index >= 0) state.known.splice(index, 1);
    else state.known.push(id);
    button.setAttribute('aria-pressed', String(index < 0));
    announceProgress();
  }

  function answerQuiz(button) {
    state.quiz[button.dataset.quiz] = Number(button.dataset.opt);
    $('quiz-body').innerHTML = quizMarkup();
    announceProgress();
  }

  function handleClick(button) {
    const { known, quiz: quizId, action, term } = button.dataset;
    if (known) {
      toggleKnown(button);
      return true;
    }
    if (quizId) {
      answerQuiz(button);
      return true;
    }
    if (action === 'alt') {
      const alt = $(`alt-${term}`);
      alt.hidden = !alt.hidden;
      return true;
    }
    if (action === 'reopen') {
      $(`term-${term}`).classList.add('expanded');
      return true;
    }
    if (action === 'quiz-retry') {
      state.quiz = {};
      $('quiz-body').innerHTML = quizMarkup();
      announceProgress();
      return true;
    }
    return false;
  }

  return {
    state,
    markSeen,
    completeChallenge,
    status,
    refresh,
    handleClick,
    askSection,
    termsSection,
    cheatSection,
    quizSection,
    challengeSection,
    awardSection,
  };
}
