'use strict';
(() => {
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Local events only. A CTA click is not a registration or an activation.
  window.TEZERI_EVENTS = [];
  const track = (name, detail = {}) => {
    const event = { name, ...detail, page: location.pathname, time: Date.now() };
    window.TEZERI_EVENTS.push(event);
    if (window.TEZERI_EVENTS.length > 100) window.TEZERI_EVENTS.shift();
    window.dispatchEvent(new CustomEvent('tezeri:event', { detail: event }));
  };
  const menu = $('.menu-toggle'), nav = $('.main-nav');
  function closeMenu(focus = false) {
    nav?.classList.remove('open'); menu?.setAttribute('aria-expanded', 'false');
    menu?.setAttribute('aria-label', 'Открыть меню');
    if (focus) menu?.focus();
  }
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    nav.classList.toggle('open', open);
  });
  nav?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
    const a = event.target.closest('a');
    if (a?.getAttribute('href') === 'probnyy-period.html') track('trial_information_open', { source:a.textContent.trim() });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  const current = location.pathname.split('/').pop() || 'index.html';
  $$('.main-nav a').forEach(a => { if (a.getAttribute('href') === current) a.setAttribute('aria-current','page'); });

  const viewer = $('.image-dialog'), viewerImage = $('.viewer-image');
  const viewerScroll = $('.viewer-scroll'), sizeButton = $('.viewer-size');
  let origin = null;
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-image]');
    if (!button || !viewer) return;
    origin = button;
    viewerImage.src = button.dataset.image;
    viewerImage.alt = button.dataset.alt || 'Экран программы';
    $('#image-dialog-title').textContent = viewerImage.alt;
    viewerScroll.classList.remove('actual');
    sizeButton.setAttribute('aria-pressed','false'); sizeButton.textContent = 'Масштаб 100%';
    viewer.showModal(); $('.viewer-close').focus();
    track('screen_expand', { screen:button.dataset.image });
  });
  $('.viewer-close')?.addEventListener('click', () => viewer.close());
  viewer?.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
  viewer?.addEventListener('close', () => origin?.focus());
  sizeButton?.addEventListener('click', () => {
    const actual = viewerScroll.classList.toggle('actual');
    sizeButton.setAttribute('aria-pressed',String(actual));
    sizeButton.textContent = actual ? 'Вписать в окно' : 'Масштаб 100%';
  });

  const screens = window.TEZERI_SCREENS || [];
  const tabs = $$('.program-tabs [role=tab]'), selector = $('#program-select');
  let screenIndex = 1, alternate = false;
  const alternateButton = $('.program-alternate');
  const screenImage = $('#program-image');
  let screenStatus = null;
  if (screenImage) {
    screenStatus = document.createElement('p');
    screenStatus.className = 'program-message'; screenStatus.hidden = true;
    screenStatus.setAttribute('role','status');
    $('#program-panel').append(screenStatus);
    screenImage.addEventListener('load', () => {
      screenStatus.hidden = true;
      $('.program-image').classList.remove('is-loading');
      $('.program-image').disabled = false;
      $('#program-panel').removeAttribute('aria-busy');
    });
    screenImage.addEventListener('error', () => {
      screenStatus.hidden = false;
      screenStatus.textContent = 'Экран не загрузился. Выберите другой раздел или откройте подробное описание ниже.';
      $('.program-image').disabled = true;
      $('#program-panel').removeAttribute('aria-busy');
    });
  }
  function chooseScreen(index, focus = false) {
    const item = screens[index];
    if (!item || !$('#program-panel')) return;
    screenIndex = index; alternate = false;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1;
    });
    selector.value = String(index);
    $('#program-panel').setAttribute('aria-labelledby', `program-tab-${item.id}`);
    $('#program-section-name').textContent = item.label;
    $('#program-title').textContent = item.title;
    $('#program-description').textContent = item.text;
    const link = $('#program-detail');
    link.href = item.link; link.querySelector('span').textContent = item.linkLabel;
    $('.program-image').dataset.format = item.format;
    alternateButton.hidden = !item.second;
    alternateButton.setAttribute('aria-pressed', 'false');
    alternateButton.textContent = item.id === 'project' ? 'Другой ракурс' : 'Связанный экран';
    setImage(item.image, item.alt, item.width, item.height);
    if (focus) tabs[index].focus();
    track('screen_select', { screen:item.id });
  }
  function setImage(file, alt, width, height) {
    const img = $('#program-image'), button = $('.program-image');
    screenStatus.textContent = 'Загружаем экран…'; screenStatus.hidden = false;
    button.classList.add('is-loading'); button.disabled = true;
    $('#program-panel').setAttribute('aria-busy','true');
    img.removeAttribute('srcset'); img.src = `assets/media/${file}`;
    img.alt = alt; img.width = width; img.height = height;
    button.dataset.image = img.getAttribute('src'); button.dataset.alt = alt;
    button.setAttribute('aria-label', `Увеличить: ${alt}`);
  }
  tabs.forEach((tab, index) => tab.addEventListener('click', () => chooseScreen(index)));
  selector?.addEventListener('change', () => chooseScreen(Number(selector.value)));
  $('.program-tabs')?.addEventListener('keydown', event => {
    let next = screenIndex;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (next + 1) % screens.length;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (next - 1 + screens.length) % screens.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = screens.length - 1;
    else return;
    event.preventDefault(); chooseScreen(next, true);
  });
  alternateButton?.addEventListener('click', () => {
    const item = screens[screenIndex];
    if (!item.second) return;
    alternate = !alternate;
    alternateButton.setAttribute('aria-pressed', String(alternate));
    alternateButton.textContent = alternate ? 'Основной экран' : (item.id === 'project' ? 'Другой ракурс' : 'Связанный экран');
    const alt = alternate ? `Дополнительный экран: ${item.label.toLowerCase()}` : item.alt;
    setImage(alternate ? item.second : item.image, alt, item.width, item.height);
    track('screen_variant', { screen:item.id, alternate });
  });

  const merge = $('.unify-section'), stage = $('.unify-stage'), result = $('.unify-result');
  const toggle = $('.unify-toggle'), clamp = n => Math.max(0, Math.min(1,n));
  let manual = null, manualY = 0, pending = false, mergeSeen = false;
  function applyMerge(progress, animated) {
    const gather = clamp(progress / .60), fade = clamp((progress - .34) / .25);
    const reveal = clamp((progress - .58) / .31);
    stage.style.setProperty('--g', gather.toFixed(4));
    stage.style.setProperty('--fade', fade.toFixed(4));
    stage.style.setProperty('--reveal', reveal.toFixed(4));
    stage.style.setProperty('--fold', (clamp((progress - .34)/.20)*(1-clamp((progress-.62)/.15))).toFixed(4));
    result.inert = animated && reveal < .7;
    if (result.inert) result.setAttribute('aria-hidden','true'); else result.removeAttribute('aria-hidden');
    const expanded = progress > .75;
    toggle?.setAttribute('aria-pressed',String(expanded));
    if (toggle) toggle.firstChild.textContent = expanded ? 'Показать четыре инструмента ' : 'Показать объединение ';
    if (reveal === 1 && !mergeSeen) { mergeSeen = true; track('workflow_merge_view'); }
  }
  function updateMerge() {
    pending = false;
    if (!merge) return;
    const animated = !reduced.matches && innerWidth > 900;
    if (manual !== null && Math.abs(scrollY-manualY) > 100) manual = null;
    const top = merge.getBoundingClientRect().top;
    const distance = Math.max(1, merge.offsetHeight - innerHeight + 100);
    applyMerge(animated ? (manual ?? clamp((-top + 72)/distance)) : 1, animated);
  }
  const requestMerge = () => { if (!pending) { pending = true; requestAnimationFrame(updateMerge); } };
  toggle?.addEventListener('click', () => {
    manual = toggle.getAttribute('aria-pressed') === 'true' ? 0 : 1; manualY = scrollY; updateMerge();
  });
  addEventListener('scroll',requestMerge,{passive:true});
  addEventListener('resize',requestMerge,{passive:true});
  reduced.addEventListener('change',updateMerge);

  const search = $('#journal-search'), filterButtons = $$('[data-journal-filter]');
  const articles = $$('.journal-grid .journal-card');
  let activeCategory = 'Все';
  function filterArticles() {
    const term = (search?.value || '').toLocaleLowerCase('ru').trim();
    let count = 0;
    articles.forEach(card => {
      const match = (activeCategory === 'Все' || card.dataset.category === activeCategory)
        && card.textContent.toLocaleLowerCase('ru').includes(term);
      card.hidden = !match; if (match) count++;
    });
    const empty = $('.journal-empty'); if (empty) empty.hidden = count > 0;
    const countLabel = $('.journal-result-count'); if (countLabel) countLabel.textContent = `Показано материалов: ${count}`;
  }
  filterButtons.forEach(button => button.addEventListener('click', () => {
    activeCategory = button.dataset.journalFilter;
    filterButtons.forEach(b => b.setAttribute('aria-pressed',String(b === button)));
    filterArticles();
  }));
  search?.addEventListener('input',filterArticles);
  $('#journal-reset')?.addEventListener('click', () => {
    search.value=''; activeCategory='Все';
    filterButtons.forEach(b => b.setAttribute('aria-pressed',String(b.dataset.journalFilter === 'Все')));
    filterArticles(); search.focus();
  });
  document.body.classList.add('js');
  updateMerge();
})();
