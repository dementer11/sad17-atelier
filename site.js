(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels = {classic:'Яблочная классика',berries:'Ягодные акценты','no-sugar':'Без добавления сахара',other:'Другие сладости',gifts:'Подарочные наборы',seasonal:'Сезонная коллекция'};
  const title = p => p.name.replace(/ без добавления сахара$/, '');
  const noAddedSugar = p => p.category === 'no-sugar' || p.noAddedSugar === true || /без добавления сахара/i.test(`${p.name} ${p.ingredients}`);
  let products = [], category = 'all', query = '', sort = 'collection', visibleCount = 12;
  let selected = new Set(), comparing = new Set(), activeProduct = null;
  try { const saved = JSON.parse(localStorage.getItem('sad17-choice') || '[]'); if (Array.isArray(saved)) selected = new Set(saved.filter(x => typeof x === 'string')); } catch {}
  function notify(message) {
    const toast = $('#toast'); toast.textContent = message; toast.classList.add('visible');
    clearTimeout(notify.timer); notify.timer = setTimeout(() => toast.classList.remove('visible'), 3000);
  }
  const get = id => products.find(p => p.id === id);
  function saveChoice() { try { localStorage.setItem('sad17-choice', JSON.stringify([...selected])); } catch {} $('#selection-count').textContent = selected.size; renderSelection(); }
  function choose(id, ensure = false) {
    if (!get(id)) return;
    if (ensure) selected.add(id); else if (selected.has(id)) selected.delete(id); else selected.add(id);
    saveChoice(); render(); notify(selected.has(id) ? 'Вкус добавлен в подборку' : 'Вкус удалён из подборки');
    document.dispatchEvent(new CustomEvent('sad17:choicechange', {detail:[...selected]}));
  }
  function matches(p) {
    const allowed = category === 'all' || p.category === category || (category === 'no-sugar' && noAddedSugar(p)) || (category === 'berries' && /вишн|ягод|клюкв|смородин|брусник/.test(p.ingredients));
    return allowed && `${p.name} ${p.ingredients} ${p.taste || ''} ${p.pairing || ''}`.toLocaleLowerCase('ru').includes(query);
  }
  function render() {
    const list = products.filter(matches);
    if (sort === 'name') list.sort((a,b) => a.name.localeCompare(b.name, 'ru'));
    if (sort === 'weight-asc') list.sort((a,b) => parseInt(a.weight) - parseInt(b.weight));
    if (sort === 'weight-desc') list.sort((a,b) => parseInt(b.weight) - parseInt(a.weight));
    $('#products').innerHTML = list.slice(0,visibleCount).map(p => `<article class="product-card"><button class="product-add ${selected.has(p.id)?'selected':''}" type="button" data-add="${escape(p.id)}" aria-label="${selected.has(p.id)?'Убрать':'Добавить'} ${escape(p.name)} ${selected.has(p.id)?'из подборки':'в подборку'}" aria-pressed="${selected.has(p.id)}">${selected.has(p.id)?'✓':'+'}</button><button class="product-image" type="button" data-detail="${escape(p.id)}" aria-label="Подробнее: ${escape(p.name)}"><img src="${escape(p.image)}" alt="${escape(p.name)} — концепция упаковки" loading="lazy" decoding="async" width="1000" height="1000"></button><p class="product-meta">${escape(labels[p.category])}</p><button class="product-title" type="button" data-detail="${escape(p.id)}">${escape(title(p))}</button><p class="product-taste">${escape(p.taste || p.description)}</p><div class="product-bottom"><span>${escape(p.weight)}</span><button class="product-more" type="button" data-detail="${escape(p.id)}">Подробнее ›</button></div><button class="product-compare" type="button" data-compare="${escape(p.id)}" aria-pressed="${comparing.has(p.id)}">${comparing.has(p.id)?'✓ В сравнении':'＋ Сравнить'}</button></article>`).join('');
    $('#result-count').textContent = `Найдено: ${list.length} из ${products.length}`;
    $('#empty').hidden = list.length > 0;
    $('#load-more').hidden = list.length <= visibleCount;
    $('#load-more').textContent = `Показать ещё ${Math.min(12,Math.max(0,list.length-visibleCount))} вкусов`;
    $('#catalog-progress').textContent = list.length ? `На экране ${Math.min(visibleCount,list.length)} из ${list.length}` : '';
    $('#compare-bar').hidden = comparing.size === 0;
    $('#compare-count').textContent = `В сравнении: ${comparing.size} из 3`;
    $('#open-compare').disabled = comparing.size < 2;
    document.body.classList.toggle('with-compare', comparing.size > 0);
  }
  function renderSelection() {
    const list = products.filter(p => selected.has(p.id));
    $('#selection-list').innerHTML = list.length ? list.map(p => `<div class="selection-item"><img src="${escape(p.image)}" alt=""><div>${escape(p.name)}<small>${escape(p.weight)}</small></div><button type="button" data-remove="${escape(p.id)}" aria-label="Удалить ${escape(p.name)}">Убрать</button></div>`).join('') : '<p>Коллекция начинается с одного вкуса. Добавьте понравившуюся сладость кнопкой «+».</p>';
    $('#selection-email').hidden = !list.length;
  }
  function showProduct(id, updateAddress = true) {
    const p = get(id); if (!p) return; activeProduct = id;
    const info = [['Вкус',p.taste],['Текстура',p.texture],['С чем сочетать',p.pairing],['Для какого момента',p.occasion],['Масса упаковки',p.weight],['Формат набора',p.portions],['Предлагаемый состав',p.ingredients],['Аллергены',p.allergens],['Как хранить',p.storage]];
    const related = products.filter(x=>x.id!==p.id&&x.category===p.category).slice(0,3);
    $('#product-detail').innerHTML = `<div class="detail-grid"><img src="${escape(p.image)}" alt="${escape(p.name)} — иллюстрация упаковки"><div><p class="eyebrow">КОЛЛЕКЦИЯ / ${escape(labels[p.category])}</p><h2>${escape(p.name)}</h2><p>${escape(p.description)}</p><div class="detail-actions"><button class="button primary" type="button" data-add="${escape(p.id)}" data-add-only>В мою подборку</button><button class="button outline" type="button" data-share="${escape(p.id)}">Скопировать ссылку</button></div></div></div><div class="detail-information"><h3>Подробности вкуса</h3><p>${escape(p.story || '')}</p><dl class="detail-specs">${info.filter(([,value])=>value).map(([name,value])=>`<div><dt>${name}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>${noAddedSugar(p)?'<p class="catalog-note">Фрукты и ягоды содержат природные сахара.</p>':''}<p class="catalog-note">Концептуальный ассортимент вымышленного бренда. Составы и упаковки показаны для презентации идеи.</p></div>${related.length?`<div class="related-products"><h3>Продолжить знакомство</h3><div>${related.map(x=>`<button type="button" data-detail="${escape(x.id)}"><img src="${escape(x.image)}" alt=""><span>${escape(x.name)}</span><small>${escape(x.weight)}</small></button>`).join('')}</div></div>`:''}`;
    if (!$('#product-dialog').open) $('#product-dialog').showModal();
    if (updateAddress) history.replaceState(null, '', '#product/' + encodeURIComponent(id));
  }
  function toggleCompare(id) {
    if (!get(id)) return;
    if (comparing.has(id)) comparing.delete(id); else if (comparing.size < 3) comparing.add(id); else { notify('В сравнении может быть до трёх вкусов'); return; }
    render();
  }
  function showCompare() {
    if (comparing.size < 2) return;
    const list = products.filter(p => comparing.has(p.id));
    const row = (name, values) => `<tr><th scope="row">${name}</th>${values.map(v=>`<td>${v}</td>`).join('')}</tr>`;
    $('#compare-content').innerHTML = `<div class="compare-table"><table><caption class="visually-hidden">Сравнение выбранных концепций вкуса</caption><thead><tr><th scope="col">Характеристика</th>${list.map(p=>`<th scope="col"><img src="${escape(p.image)}" alt=""><span>${escape(title(p))}</span></th>`).join('')}</tr></thead><tbody>${row('Масса',list.map(p=>escape(p.weight)))}${row('Категория',list.map(p=>escape(labels[p.category])))}${row('Предлагаемый состав',list.map(p=>escape(p.ingredients)))}${row('Без добавления сахара',list.map(p=>noAddedSugar(p)?'Да, в концепции':'Не заявлено'))}${row('Подборка',list.map(p=>`<button class="button outline" type="button" data-add="${escape(p.id)}" data-add-only>Добавить</button>`))}</tbody></table></div><p class="catalog-note">Все позиции — демонстрационные концепции.</p>`;
    $('#compare-dialog').showModal();
  }
  async function copy(text, done) {
    try { await navigator.clipboard.writeText(text); notify(done); }
    catch { notify('Буфер обмена недоступен. Текст можно скопировать вручную.'); const fallback = document.createElement('textarea'); fallback.className='copy-fallback'; fallback.value=text; fallback.readOnly=true; fallback.setAttribute('aria-label','Текст для ручного копирования'); const target = document.querySelector('dialog[open]') || $('#selection-list'); target.append(fallback); fallback.focus(); fallback.select(); }
  }
  document.addEventListener('click', e => {
    const button = e.target.closest('button'); if (!button) return;
    if (button.dataset.add) choose(button.dataset.add, button.hasAttribute('data-add-only') || !!button.closest('#taste-finder'));
    if (button.dataset.remove) choose(button.dataset.remove);
    if (button.dataset.detail) showProduct(button.dataset.detail);
    if (button.dataset.compare) toggleCompare(button.dataset.compare);
    if (button.dataset.family) document.querySelector(`[data-filter="${button.dataset.family}"]`)?.click();
    if (button.dataset.share) copy(location.href.split('#')[0] + '#product/' + encodeURIComponent(button.dataset.share), 'Ссылка на вкус скопирована');
    if (button.hasAttribute('data-close')) button.closest('dialog')?.close();
  });
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click',e=>{if(e.target !== dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}));
  $('#product-dialog').addEventListener('close',()=>{activeProduct=null;if(location.hash.startsWith('#product/'))history.replaceState(null,'','#catalog');});
  document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{category=button.dataset.filter;visibleCount=12;document.querySelectorAll('.filter').forEach(x=>{const active=x===button;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active));});render();}));
  $('#search').addEventListener('input',e=>{query=e.target.value.trim().toLocaleLowerCase('ru');visibleCount=12;render();});
  $('#catalog-sort').addEventListener('change',e=>{sort=e.target.value;visibleCount=12;render();});
  $('#load-more').addEventListener('click',()=>{visibleCount+=12;render();});
  document.querySelectorAll('[data-family]').forEach(link=>link.addEventListener('click',()=>{query='';$('#search').value='';document.querySelector(`[data-filter="${link.dataset.family}"]`)?.click();}));
  $('#reset-search').addEventListener('click',()=>{$('#search').value='';query='';document.querySelector('[data-filter="all"]').click();});
  const closeMenu=()=>{$('.nav').classList.remove('open');document.body.classList.remove('menu-open');$('#menu-button').setAttribute('aria-expanded','false');$('#menu-button').setAttribute('aria-label','Открыть меню');};
  $('#menu-button').addEventListener('click',()=>{const open=$('.nav').classList.toggle('open');document.body.classList.toggle('menu-open',open);$('#menu-button').setAttribute('aria-expanded',String(open));$('#menu-button').setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');});
  document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();$('#search').focus();}});
  $('#open-selection').addEventListener('click',()=>$('#selection-dialog').showModal());
  $('#open-sources').addEventListener('click',()=>$('#sources-dialog').showModal());
  $('#open-compare').addEventListener('click',showCompare);
  $('#clear-compare').addEventListener('click',()=>{comparing.clear();render();});
  $('#selection-email').addEventListener('click',()=>copy('Сад №17 — моя подборка\n'+products.filter(p=>selected.has(p.id)).map(p=>`${p.name} — ${p.weight}`).join('\n'),'Подборка скопирована'));
  $('#business-form').addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.target);$('#request-preview').value=`Имя: ${data.get('name')}\nПроект: ${data.get('company')}\nИдея: ${data.get('topic')}\n\n${data.get('message')}`;$('#request-preview').hidden=false;$('#form-status').textContent='Текст подготовлен. Демо-форма ничего не отправляет.';});
  $('#clear-preferences').addEventListener('click',()=>{for(const key of ['sad17-choice','sad17-theme','sad17-gift']){try{localStorage.removeItem(key);}catch{}}selected.clear();comparing.clear();saveChoice();try{localStorage.removeItem('sad17-choice');}catch{}window.Sad17Theme?.set('auto');try{localStorage.removeItem('sad17-theme');}catch{}render();window.dispatchEvent(new CustomEvent('sad17:reset'));notify('Подборка, подарок и настройки темы сброшены');});
  if ('IntersectionObserver' in window) {
    const links=[...document.querySelectorAll('.nav a')];
    const observer=new IntersectionObserver(entries=>{for(const item of entries){if(!item.isIntersecting)continue;for(const link of links){const active=link.getAttribute('href')==='#'+item.target.id;if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}}},{rootMargin:'-20% 0px -60% 0px'});
    links.forEach(link=>{const section=$(link.getAttribute('href'));if(section)observer.observe(section);});
  }
  const fromHash=()=>{if(!location.hash.startsWith('#product/'))return;try{showProduct(decodeURIComponent(location.hash.slice(9)),false);}catch{}};
  window.addEventListener('hashchange',fromHash);
  fetch(new URL('products.json?v=rich-5',document.baseURI)).then(r=>{if(!r.ok)throw Error('catalog');return r.json();}).then(data=>{if(!Array.isArray(data))throw Error('catalog');products=data;selected=new Set([...selected].filter(id=>get(id)));render();saveChoice();fromHash();document.dispatchEvent(new CustomEvent('sad17:catalogready'));}).catch(()=>{$('#products').innerHTML='<p>Не удалось загрузить коллекцию. <button type="button" id="retry-catalog">Повторить</button></p>';$('#retry-catalog').addEventListener('click',()=>location.reload());});
  window.Sad17={add:id=>choose(id,true),notify};
})();
