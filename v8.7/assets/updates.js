/* Classroom helpers and feedback. V8.6's lesson content stays in game.js. */
(() => {
  const info = {
    shaheen: ['Shaheen', 'Where do we go?'],
    fahem: ['Fahem', 'Help us think'],
    maha: ['Maha', 'Our group paper']
  };
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const portrait = (name, cls = '') => `<img class="helper-portrait ${cls}" src="assets/helpers/${name}.png" alt="${info[name][0]}" draggable="false">`;
  const label = name => ({Me:'Hessa', Brother:'Hamad', Sister:'Hamad', Dad:'Khalid · Dad', Mom:'Mom', Saqr:'Fahem'})[name] || name;
  let game, lastPhase = '', lastRoute = '', lastPopupKey = '';

  function feedback(button, correct) {
    if (!button) return;
    for (const other of button.closest('.choices')?.querySelectorAll('button') || []) {
      other.classList.remove('incorrect', 'answer-selected');
      other.removeAttribute('aria-pressed');
    }
    button.classList.toggle('incorrect', !correct);
    button.classList.toggle('correct', correct);
    button.classList.add('answer-selected');
    button.setAttribute('aria-pressed', 'true');
  }

  function pop(name, text, key = text) {
    if (key === lastPopupKey && document.querySelector('#helper-message')) return;
    lastPopupKey = key;
    document.querySelector('#helper-message')?.remove();
    const panel = document.createElement('aside');
    panel.id = 'helper-message'; panel.className = `helper-message ${name}`;
    panel.setAttribute('role', 'status');
    panel.innerHTML = `${portrait(name)}<div><strong>${info[name][0]}</strong><p>${escape(text)}</p></div><button class="helper-dismiss" aria-label="Close helper message">×</button>`;
    panel.querySelector('button').onclick = () => panel.remove();
    document.body.append(panel);
    clearTimeout(pop.timer);
    pop.timer = setTimeout(() => { panel.remove(); lastPopupKey = ''; }, name === 'maha' ? 10000 : 8500);
  }

  function route() {
    const world = game?.world, state = game?.S;
    if (!world || !state) return 'Follow the gold dots. Work together.';
    if (state.phase === 'explore') return 'You found all five signs! Choose an activity in the middle of the screen.';
    const cue = world.nav?.cue(), goal = window.quest?.content.scenes[state.scene];
    if (!cue || !goal) return 'Click the floor to walk. Follow the gold dots.';
    const destination = cue.portal ? cue.label : `${label(goal.family)} · ${goal.id === 'rust' ? 'the gate' : goal.id === 'soap' ? 'the bathroom' : goal.zone === 2 ? 'the courtyard' : 'the majlis'}`;
    const screen = world.project(new world.player.position.constructor(cue.x, world.zone === 0 ? 5 : 0, cue.z));
    const direction = screen && Number.isFinite(screen.x) ? screen.x < innerWidth * .4 ? 'left' : screen.x > innerWidth * .6 ? 'right' : 'ahead' : 'ahead';
    return `Go ${direction} to ${destination}. Follow the gold dots.`;
  }

  function rail() {
    if (!game?.S.started || ['title','ready','final','points','reflection'].includes(game.S.phase)) {
      document.querySelector('#helper-rail')?.remove();
      document.querySelector('#helper-message')?.remove();
      return;
    }
    let el = document.querySelector('#helper-rail');
    if (!el) {
      el = document.createElement('nav'); el.id = 'helper-rail'; el.setAttribute('aria-label','Our helpers');
      el.innerHTML = Object.entries(info).map(([key, [name, title]]) => `<button data-helper="${key}" title="${title}" aria-label="${name}: ${title}">${portrait(key)}<span>${name}</span></button>`).join('');
      document.body.append(el);
      el.addEventListener('click', event => {
        const name = event.target.closest('[data-helper]')?.dataset.helper;
        if (!name) return;
        if (name === 'shaheen') {
          if (game.S.phase === 'explore') game.openExploreMenu();
          else pop(name, route());
        } else if (name === 'fahem') {
          if (game.Q && !game.Q.lock && game.S.phase !== 'challenge') game.requestHint();
          else pop(name, 'Look closely. What changed? Tell your group what you noticed.');
        } else pop(name, game.S.activeType === 'notebook' ? 'Now it is time to write on your group paper. Recorder, write. Team, help!' : 'Keep your group paper ready. I will remind you when it is time to write.');
      });
    }
    el.hidden = !!document.querySelector('#extra .modal');
    const phase = `${game.S.phase}:${game.S.scene}:${game.S.activeType}`;
    if (phase !== lastPhase) {
      lastPhase = phase; document.querySelector('#helper-message')?.remove();
    }
    const travel = document.querySelector('.with-travel-help');
    if (travel && !travel.querySelector('.helper-portrait')) {
      travel.insertAdjacentHTML('afterbegin', portrait('shaheen'));
      travel.classList.add('shaheen-route');
    }
    if (travel) {
      const text = route(), target = travel.querySelector('#route-label');
      if (target && target.textContent !== text) target.textContent = text;
      lastRoute = text;
    }
  }

  function finishMenu(countdown) {
    return `<div class="finish-backdrop"><section class="finish-menu" role="dialog" aria-modal="true" aria-labelledby="finish-title">
      <div class="finish-heading">${portrait('shaheen')}<div><p class="eyebrow">All five places explored</p><h2 id="finish-title">Explore the house! Check your paper.</h2></div></div>
      <p class="finish-instruction">Choose what your team would like to do next.</p>
      <div class="finish-choices">
        <button class="primary" data-action="practice"><span aria-hidden="true">★</span><strong>Practice</strong><small>Try more questions</small></button>
        <button data-action="discoveries"><span aria-hidden="true">⌕</span><strong>Discover more</strong><small>Find new examples</small></button>
        <button data-action="gallery"><span aria-hidden="true">↺</span><strong>Look again</strong><small>Review the five signs</small></button>
      </div>
      <p id="explore-countdown">${escape(countdown || '')}</p>
      <button class="small explore-walk" data-action="keep-exploring">Walk around the house</button>
    </section></div>`;
  }

  function init(g) {
    game = g;
    setInterval(rail, 200);
    document.addEventListener('keydown', event => {
      const modal = document.querySelector('#extra .modal') || document.querySelector('.finish-menu');
      if (event.key !== 'Tab' || !modal) return;
      const buttons = [...modal.querySelectorAll('button:not(:disabled),input,select,a[href]')];
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {event.preventDefault();last?.focus();}
      else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {event.preventDefault();first?.focus();}
    });
  }
  window.ScienceUI = {init, portrait, label, feedback, pop, route, finishMenu};
})();
