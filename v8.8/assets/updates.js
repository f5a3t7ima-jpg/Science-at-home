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
  let game, lastPhase = '', lastRoute = '', lastPopupKey = '', spokenRoute = '';
  const charterItems=[['extended-family','الأسرة الممتدة','Extended family','الهوية الوطنية'],['generosity','الكرم والتواضع','Generosity & humility','الهوية الوطنية'],['teamwork','العمل الجماعي','Teamwork','السمات'],['critical-thinking','التفكير النقدي','Critical thinking','المهارات'],['communication','التواصل الفعال','Communication','المهارات'],['reading-writing','القراءة والكتابة','Reading & writing','المهارات']];

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
          else {pop(name, route());game.voiceEngine?.speak(route(),'Shaheen');}
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
      if(game.S.activeType!=='travel')spokenRoute='';
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
      const key=game.S.scene+':'+worldZone();
      if(spokenRoute!==key&&!game.S.paused&&!game.voiceEngine?.current){spokenRoute=key;game.voiceEngine?.speak(shortRoute(),'Shaheen');}
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

  function worldZone(){return game?.world?.zone??'picture';}
  function shortRoute(){
    const w=game?.world,goal=window.quest?.content.scenes[game?.S.scene];
    if(w?.zone===0)return 'Follow the gold dots to the stairs.';
    if(w?.nav?.cue()?.portal)return w.nav.cue().portal==='out'?'Follow the gold dots to the courtyard.':'Follow the gold dots inside the house.';
    return 'Follow the gold dots to '+(goal?.id==='rust'?'the gate':goal?.id==='soap'?'the bathroom':goal?.zone===2?'the courtyard':'the majlis')+'.';
  }
  function charterPanel(){return `<aside class="charter-panel" aria-label="National Education Charter connections"><div class="charter-heading"><img src="assets/charter/charter-mark.png" alt="الميثاق الوطني للتعليم"><div><h2 lang="ar" dir="rtl">الميثاق الوطني للتعليم</h2><p>Values we practise in our game</p></div></div><div class="charter-items">${charterItems.map(([id,ar,en,category])=>`<div class="charter-item"><div><small lang="ar" dir="rtl">${category}</small><strong lang="ar" dir="rtl">${ar}</strong><span>${en}</span></div><img src="assets/charter/${id}.png" alt="" width="54" height="54"></div>`).join('')}</div><p class="charter-foot">Learn with family. Think together. Share kindly.</p></aside>`;}
  function enhance(){
    const title=document.querySelector('.title-card');
    if(title&&!title.dataset.credited){
      title.dataset.credited='true';
      const layout=document.createElement('div');layout.className='cover-layout';title.before(layout);layout.append(title);layout.insertAdjacentHTML('beforeend',charterPanel());
      title.insertAdjacentHTML('afterbegin','<div class="campaign-line" lang="ar" dir="rtl">بالميثاق نبلغ الآفاق</div>');
      title.querySelector('.hero-picture')?.insertAdjacentHTML('afterend',`<div class="school-credit"><div lang="ar" dir="rtl"><strong>مدرسة أم الفضل بنت الحارث الحلقة 2</strong><span>قسم العلوم</span><span>إعداد المعلمة: فاطمة عبدالرحمن الربيح المصعبي</span></div><div><strong>Um Al Fadhel Bint Al Hareth C2</strong><span>Department of Science</span><span>Teacher: Fatima Al Rubaih</span></div></div>`);
    }
    for(const el of document.querySelectorAll('.question-prompt p,.question-text,.challenge-question,.challenge-panel h2,.challenge-panel .subtext,.practice-q,.modal h2,.modal h3,.modal p')){
      const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),texts=[];let node;
      while(node=walker.nextNode())if(!node.parentElement.closest('button,strong,svg,.science-keyword'))texts.push(node);
      for(const node of texts){
        const regex=/\b(physical|chemical|new matter|same matter|new substance|color|odou?r|temperature|gas|solid|evidence|feel|smell|observe)\b/gi;
        const matches=[...node.textContent.matchAll(regex)];if(!matches.length)continue;
        const fragment=document.createDocumentFragment();let from=0;
        for(const match of matches){fragment.append(document.createTextNode(node.textContent.slice(from,match.index)));const strong=document.createElement('strong');strong.className='science-keyword';strong.textContent=match[0];fragment.append(strong);from=match.index+match[0].length;}
        fragment.append(document.createTextNode(node.textContent.slice(from)));node.replaceWith(fragment);
      }
    }
    for(const name of document.querySelectorAll('.speech-anchor[data-speaker="Me"] .speaker-name'))if(!name.querySelector('.creator-credit'))name.insertAdjacentHTML('beforeend','<small class="creator-credit">Teacher: Fatima Al Rubaih</small>');
  }
  function sharingPanel(speaker,text){
    let panel=document.querySelector('#sharing-dialogue');
    if(!panel){document.querySelector('#overlay').innerHTML=`<section id="sharing-dialogue" class="sharing-dialogue" role="status"><div class="speaker-name"></div><p></p></section>${game?.world?'':'<div class="sharing-picture-mode"><img class="sharing-hessa" src="assets/helpers/hessa.png" alt="Hessa"><span class="shared-treat" aria-label="Marshmallow">▰</span><img src="assets/helpers/hamad.png" alt="Hamad"></div>'}`;panel=document.querySelector('#sharing-dialogue');}
    panel.querySelector('.speaker-name').textContent=label(speaker);panel.querySelector('p').textContent=text;panel.dataset.speaker=speaker;
    document.querySelector('.sharing-picture-mode')?.classList.toggle('given',speaker==='Brother');
  }
  function init(g) {
    game = g;window.ScienceVoice?.install(g.voiceEngine);enhance();
    setInterval(rail, 300);
    const observer=new MutationObserver(()=>enhance());
    for(const id of ['overlay','extra'])observer.observe(document.getElementById(id),{childList:true,subtree:true});
    document.addEventListener('keydown', event => {
      const modal = document.querySelector('#extra .modal') || document.querySelector('.finish-menu');
      if (event.key !== 'Tab' || !modal) return;
      const buttons = [...modal.querySelectorAll('button:not(:disabled),input,select,a[href]')];
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {event.preventDefault();last?.focus();}
      else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {event.preventDefault();first?.focus();}
    });
  }
  window.ScienceUI = {init, portrait, label, feedback, pop, route, finishMenu, enhance, charterPanel, sharingPanel};
})();
