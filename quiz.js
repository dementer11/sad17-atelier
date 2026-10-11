(() => {
  'use strict';

  const steps = ['mood', 'sugar', 'moment'];
  function valueText(value) {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join(' ');
    if (typeof value === 'object') return Object.values(value).map(valueText).filter(Boolean).join(' ');
    return String(value).toLowerCase();
  }

  function hasNoAddedSugar(product) {
    return product.category === 'no-sugar' || product.noAddedSugar === true ||
      /без добавления сахара/i.test(`${product.name || ''} ${valueText(product.ingredients)}`);
  }

  function weightInGrams(value) {
    if (typeof value === 'number') return value;
    const text = String(value || '').toLowerCase().replace(',', '.');
    const match = text.match(/(?:всего|total)\s*:?\s*(\d+(?:\.\d+)?)\s*(кг|kg|г|гр|g)?/) ||
      text.match(/(\d+(?:\.\d+)?)\s*(кг|kg|г|гр|g)?/);
    if (!match) return null;
    const amount = Number(match[1]);
    return /кг|kg/.test(match[2] || '') ? amount * 1000 : amount;
  }

  function recommendProducts(products, answers) {
    const eligibleProducts = answers.sugar === 'no-added'
      ? products.filter(hasNoAddedSugar)
      : products;
    const ranked = eligibleProducts.map((product, order) => ({ product, score: 0, order, reasons: [] }));
    const add = (entry, points, reason) => {
      if (points <= 0) return;
      entry.score += points;
      if (reason && !entry.reasons.includes(reason)) entry.reasons.push(reason);
    };

    for (const entry of ranked) {
      const product = entry.product;
      const category = valueText(product.category);
      const taste = valueText(product.taste);
      const texture = valueText(product.texture);
      const pairing = valueText(product.pairing);
      const occasion = valueText(product.occasion);
      const ingredients = valueText(product.ingredients);
      const name = valueText(product.name);
      const general = `${name} ${ingredients} ${valueText(product.description)}`;

      if (answers.mood === 'classic') {
        if (/classic|класс|традиц/.test(`${category} ${taste} ${name}`)) {
          add(entry, category === 'classic' ? 7 : 5, 'Яблочная классика для спокойного, знакомого вкуса.');
        } else if (/яблок|apple/.test(general)) {
          add(entry, 2, 'Яблочная основа поддерживает спокойный, знакомый вкус.');
        }
      } else if (answers.mood === 'brightberry') {
        const berryWords = /ягод|berry|клюкв|вишн|смород|брусник|черник|мали|ежев|облепих|cranber|cherr|currant|blueber|raspber/;
        if (category === 'berries') add(entry, 6, 'Ягодная категория отвечает вашему яркому настроению.');
        if (berryWords.test(`${taste} ${ingredients} ${name}`)) {
          add(entry, 5, 'В составе или названии указаны ягоды с выразительной нотой.');
        }
        if (/bright|ярк|кисл|sour|tart/.test(taste)) add(entry, 2, 'Вкусовой профиль отмечен как яркий или с кислинкой.');
      } else if (answers.mood === 'texture') {
        if (texture) add(entry, 1, `В карточке отмечена текстура: ${texture}.`);
        if (/хруст|ломк|жев|тянуч|кубик|свернут|рулет|crisp|brittle|chew|roll|cube/.test(texture)) {
          add(entry, 7, 'У этого варианта особенно выразительная фактура.');
        } else if (/плотн|упруг|воздуш|мягк|бархат|эласт|soft|dense|firm|airy/.test(texture)) {
          add(entry, 3, 'Текстура добавляет коллекции интересный контраст.');
        }
        if (/texture|текстур/.test(`${category} ${taste}`)) add(entry, 3, 'В карточке отдельно отмечен акцент на текстуре.');
      }

      if (answers.sugar === 'no-added') {
        const reason = product.category === 'no-sugar' || /без добавления сахара/i.test(product.name || '')
          ? 'В названии или категории есть пометка «без добавления сахара».'
          : 'В составе набора указаны позиции без добавления сахара.';
        add(entry, 2, reason);
      }

      if (answers.moment === 'tea') {
        if (/tea|чай|чаепит/.test(`${occasion} ${pairing}`)) {
          add(entry, 6, 'Вариант отмечен для чаепития.');
        } else if (/classic|класс|пастил/.test(`${category} ${name}`)) {
          add(entry, 1, 'Формат яблочной пастилы подойдёт для паузы к чаю.');
        }
      } else if (answers.moment === 'gift') {
        if (category === 'gifts' || category === 'gift') add(entry, 8, 'Товар входит в подарочную категорию.');
        if (/gift|подар|набор|празд/.test(occasion)) add(entry, 5, 'В карточке этот вариант отмечен для подарка.');
        if (/gift|подар|набор/.test(pairing)) add(entry, 3, 'Сочетание или формат подходит для подарочной подборки.');
      } else if (answers.moment === 'onroad') {
        const grams = weightInGrams(product.weight);
        if (grams !== null && grams <= 100) add(entry, 5, `Компактный формат ${product.weight} удобно взять с собой.`);
        if (/road|on.?road|дорог|путеше|с собой|travel|on.?the.?go/.test(`${occasion} ${pairing}`)) {
          add(entry, 5, 'В карточке этот вариант отмечен для дороги.');
        }
      }
    }

    return ranked.sort((left, right) => right.score - left.score || left.order - right.order).slice(0, 2);
  }

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  function init() {
    const root = document.querySelector('#taste-finder');
    if (!root || root.dataset.quizReady === 'true') return;
    root.dataset.quizReady = 'true';

    const form = root.querySelector('[data-quiz-form]');
    const panels = [...root.querySelectorAll('[data-quiz-step]')];
    const stepLabel = root.querySelector('[data-quiz-step-label]');
    const progress = root.querySelector('[data-quiz-progress]');
    const progressBar = root.querySelector('[role="progressbar"]');
    const nextButton = root.querySelector('[data-quiz-next]');
    const finishButton = root.querySelector('[data-quiz-finish]');
    const backButton = root.querySelector('[data-quiz-back]');
    const validation = root.querySelector('[data-quiz-validation]');
    const results = root.querySelector('[data-quiz-results]');
    const loadError = root.querySelector('[data-quiz-load-error]');
    const state = { step: 0, answers: {}, products: [] };

    function activeChoice(name) {
      return root.querySelector(`input[name="${name}"]:checked`)?.value || '';
    }

    function showStep(focus = false) {
      panels.forEach((panel, index) => { panel.hidden = index !== state.step; });
      stepLabel.textContent = `Шаг ${state.step + 1} из ${steps.length}`;
      progress.style.width = `${((state.step + 1) / steps.length) * 100}%`;
      progressBar.setAttribute('aria-valuenow', String(state.step + 1));
      backButton.hidden = state.step === 0;
      nextButton.hidden = state.step === steps.length - 1;
      finishButton.hidden = state.step !== steps.length - 1;
      nextButton.disabled = !activeChoice(steps[state.step]);
      finishButton.disabled = !activeChoice(steps[state.step]);
      validation.hidden = true;
      results.hidden = true;
      form.hidden = false;
      if (focus) {
        const legend = panels[state.step].querySelector('legend');
        legend?.setAttribute('tabindex', '-1');
        legend?.focus({ preventScroll: true });
      }
    }

    function escapeResultProduct(product) {
      const image = typeof product.image === 'string' && /^assets\/[\w./-]+$/.test(product.image)
        ? new URL(product.image, document.baseURI).href
        : '';
      return { ...product, safeImage: image };
    }

    async function loadProducts() {
      form.hidden = true;
      results.hidden = true;
      loadError.hidden = true;
      try {
        const response = await fetch(new URL('products.json?v=rich-5', document.baseURI), {
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error('Catalog unavailable');
        const catalog = await response.json();
        if (!Array.isArray(catalog)) throw new Error('Invalid catalog');
        state.products = catalog.filter(product => product && typeof product.id === 'string' &&
          typeof product.name === 'string' && typeof product.image === 'string');
        if (state.products.length < 2) throw new Error('Catalog needs at least two products');
        showStep();
      } catch {
        form.hidden = true;
        loadError.hidden = false;
      }
    }

    function advance() {
      if (!activeChoice(steps[state.step])) {
        validation.hidden = false;
        root.querySelector(`[data-quiz-step="${state.step}"] input`)?.focus();
        return;
      }
      state.answers[steps[state.step]] = activeChoice(steps[state.step]);
      if (state.step < steps.length - 1) {
        state.step += 1;
        showStep(true);
      } else {
        showResults();
      }
    }

    function makeRecommendations() {
      return recommendProducts(state.products, state.answers)
        .map(entry => ({ ...entry, product: escapeResultProduct(entry.product) }));
    }

    function showResults() {
      if (steps.some(question => !state.answers[question])) {
        state.step = steps.findIndex(question => !state.answers[question]);
        showStep(true);
        validation.hidden = false;
        return;
      }
      const picks = makeRecommendations();
      results.innerHTML = `<h3 tabindex="-1">Ваша пара вкусов</h3>
        <p class="quiz-results-intro">Подборка по вашим ответам — выберите, что добавить в демонстрационную коллекцию.</p>
        <div class="quiz-result-list">${picks.map(({ product, reasons }) => {
          const reason = reasons.slice(0, 2).join(' ') || 'Вариант из демонстрационной коллекции по вашим ответам.';
          return `<article class="quiz-result">
            <img src="${escapeHtml(product.safeImage)}" alt="${escapeHtml(product.name)}" loading="lazy" width="92" height="92">
            <div class="quiz-result-copy"><h4>${escapeHtml(product.name)}</h4><p>${escapeHtml(reason)}</p>
              <button class="quiz-button" type="button" data-add="${escapeHtml(product.id)}">Добавить в подборку</button>
            </div>
          </article>`;
        }).join('')}</div>
        <div class="quiz-result-actions"><button class="quiz-restart" type="button" data-quiz-restart>Пройти ещё раз</button><a class="quiz-catalog-link" href="#catalog">Перейти к коллекции ↘</a></div>`;
      form.hidden = true;
      loadError.hidden = true;
      results.hidden = false;
      root.querySelector('[data-quiz-progress]').style.width = '100%';
      root.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', '3');
      results.querySelector('h3')?.focus({ preventScroll: true });
    }

    root.addEventListener('change', event => {
      const input = event.target;
      if (!input.matches('input[type="radio"]')) return;
      state.answers[input.name] = input.value;
      validation.hidden = true;
      nextButton.disabled = !activeChoice(steps[state.step]);
      finishButton.disabled = !activeChoice(steps[state.step]);
    });

    root.addEventListener('click', event => {
      if (event.target.closest('[data-quiz-next], [data-quiz-finish]')) advance();
      if (event.target.closest('[data-quiz-back]')) {
        if (state.step > 0) { state.step -= 1; showStep(true); }
      }
      if (event.target.closest('[data-quiz-restart]')) {
        state.step = 0;
        state.answers = {};
        form.querySelectorAll('input[type="radio"]').forEach(input => { input.checked = false; });
        showStep(true);
      }
      if (event.target.closest('[data-quiz-retry]')) loadProducts();
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      advance();
    });

    loadProducts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
