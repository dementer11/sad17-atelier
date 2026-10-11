(() => {
  'use strict';

  const steps = ['mood', 'sugar', 'moment'];
  const scoring = {
    mood: {
      classic: [
        ['pastila-classic', 6, 'Яблочная классика для спокойного, знакомого вкуса.'],
        ['pastila-cedar', 3, 'Яблочная основа дополнена кедровым орехом.'],
        ['pastila-no-sugar', 2, 'Сдержанный яблочный вкус без добавления сахара.'],
        ['zefir-antonovka', 1, 'Яблочная классика в более воздушной текстуре.']
      ],
      brightberry: [
        ['pastila-cranberry', 6, 'Клюква добавляет яркий ягодный акцент.'],
        ['pastila-berries-no-sugar', 5, 'Сразу несколько ягод собраны в одном сочетании.'],
        ['pastila-cherry-no-sugar', 4, 'Вишня задаёт выразительную ягодную ноту.'],
        ['smokva-cranberry', 3, 'Клюквенная смоква предлагает более плотную ягодную текстуру.']
      ],
      texture: [
        ['smokva-cranberry', 6, 'Плотная фруктовая текстура заметно отличается от пастилы.'],
        ['zefir-antonovka', 4, 'Воздушная текстура добавляет разнообразия.'],
        ['pastila-cedar', 3, 'Кедровый орех добавляет интересный акцент.'],
        ['pastila-cranberry', 1, 'Ягодная кислинка дополняет мягкую текстуру пастилы.']
      ]
    },
    sugar: {
      'no-added': [
        ['pastila-no-sugar', 5, 'В названии указано: без добавления сахара.'],
        ['pastila-cherry-no-sugar', 5, 'В названии указано: без добавления сахара.'],
        ['pastila-berries-no-sugar', 5, 'В названии указано: без добавления сахара.'],
        ['smokva-cranberry', 4, 'Клюквенная смоква представлена без добавления сахара.']
      ],
      any: []
    },
    moment: {
      tea: [
        ['pastila-classic', 3, 'Подойдёт к неспешной паузе с чаем.'],
        ['pastila-cedar', 3, 'Ореховый акцент хорошо поддержит чаепитие.'],
        ['zefir-antonovka', 3, 'Воздушный яблочный зефир — вариант к чаю.'],
        ['pastila-cranberry', 2, 'Ягодная нота добавит чаепитию яркости.'],
        ['pastila-no-sugar', 2, 'Яблочная пастила для паузы к чаю.']
      ],
      gift: [
        ['pastila-cedar', 5, 'Необычный ореховый акцент для небольшого подарка.'],
        ['pastila-berries-no-sugar', 3, 'Ягодное сочетание выглядит выразительно в подарок.'],
        ['pastila-cranberry', 3, 'Яркая клюквенная нота для подарочного выбора.'],
        ['zefir-antonovka', 2, 'Воздушный яблочный вариант для подарка.'],
        ['pastila-classic', 2, 'Знакомая яблочная классика в подарок.']
      ],
      onroad: [
        ['smokva-cranberry', 5, 'Небольшой формат удобно взять с собой.'],
        ['pastila-no-sugar', 3, 'Компактный формат для короткой паузы в пути.'],
        ['pastila-cherry-no-sugar', 3, 'Компактный формат для короткой паузы в пути.'],
        ['pastila-berries-no-sugar', 3, 'Компактный формат для короткой паузы в пути.'],
        ['pastila-cranberry', 1, 'Ягодная пастила для паузы в дороге.']
      ]
    }
  };

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
        const response = await fetch(new URL('products.json', document.baseURI), {
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
      const eligibleProducts = state.answers.sugar === 'no-added'
        ? state.products.filter(product => /без добавления сахара/i.test(product.name))
        : state.products;
      const ranked = new Map(eligibleProducts.map((product, index) => [product.id, {
        product, score: 0, order: index, reasons: []
      }]));
      for (const question of steps) {
        const answer = state.answers[question];
        const additions = scoring[question]?.[answer] || [];
        additions.forEach(([id, points, reason]) => {
          const entry = ranked.get(id);
          if (!entry) return;
          entry.score += points;
          if (!entry.reasons.includes(reason)) entry.reasons.push(reason);
        });
      }
      return [...ranked.values()]
        .sort((left, right) => right.score - left.score || left.order - right.order)
        .slice(0, 2)
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
