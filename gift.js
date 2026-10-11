(() => {
  'use strict';

  const root = document.querySelector('#gift-studio');
  if (!root) return;

  const STORAGE_KEY = 'sad17-gift';
  const productSelect = root.querySelector('#gift-product-select');
  const noteInput = root.querySelector('#gift-note');
  const status = root.querySelector('[data-gift-status]');
  const itemList = root.querySelector('[data-gift-items]');
  const previewItems = root.querySelector('[data-gift-preview-items]');
  const productsById = new Map();
  let products = [];
  let boxSize = 3;
  let composition = new Map();

  function announce(message) {
    status.textContent = message;
  }

  function productWeight(product) {
    const match = String(product.weight || '').match(/(\d+(?:[.,]\d+)?)\s*г/i);
    const value = match ? Number(match[1].replace(',', '.')) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function imagePath(product) {
    if (typeof product.image !== 'string' || !product.image.startsWith('assets/demo/')) return '';
    try {
      const url = new URL(product.image, document.baseURI);
      const demoRoot = new URL('assets/demo/', document.baseURI);
      return url.origin === window.location.origin && url.pathname.startsWith(demoRoot.pathname) ? url.href : '';
    } catch {
      return '';
    }
  }

  function totalCount() {
    let total = 0;
    composition.forEach(quantity => { total += quantity; });
    return total;
  }

  function totalMass() {
    let total = 0;
    composition.forEach((quantity, id) => {
      const product = productsById.get(id);
      if (product) total += productWeight(product) * quantity;
    });
    return total;
  }

  function readDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
      const size = value.size === 5 ? 5 : 3;
      const items = new Map();
      if (Array.isArray(value.items)) {
        value.items.forEach(entry => {
          if (!entry || typeof entry.id !== 'string' || !productsById.has(entry.id)) return;
          const quantity = Number(entry.quantity);
          if (!Number.isInteger(quantity) || quantity < 1) return;
          items.set(entry.id, (items.get(entry.id) || 0) + quantity);
        });
      }
      let remaining = size;
      const trimmed = new Map();
      items.forEach((quantity, id) => {
        const accepted = Math.min(quantity, remaining);
        if (accepted > 0) trimmed.set(id, accepted);
        remaining -= accepted;
      });
      const occasions = ['Спасибо', 'Для тебя', 'С праздником'];
      return {
        size,
        items: trimmed,
        occasion: occasions.includes(value.occasion) ? value.occasion : 'Спасибо',
        note: typeof value.note === 'string' ? value.note.slice(0, 140) : ''
      };
    } catch {
      return null;
    }
  }

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        size: boxSize,
        items: [...composition].map(([id, quantity]) => ({ id, quantity })),
        occasion: root.querySelector('[name="gift-occasion"]:checked')?.value || 'Спасибо',
        note: noteInput.value.slice(0, 140)
      }));
    } catch {
      announce('Не удалось сохранить черновик в этом браузере. Состав остаётся на экране.');
    }
  }

  function makeImage(product, className, alt) {
    const img = document.createElement('img');
    const src = imagePath(product);
    img.alt = alt;
    img.loading = 'lazy';
    if (src) img.src = src;
    if (className) img.className = className;
    return img;
  }

  function renderSelect() {
    productSelect.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Выберите вкус';
    productSelect.append(placeholder);
    products.forEach(product => {
      const option = document.createElement('option');
      option.value = product.id;
      option.textContent = `${product.name} · ${product.weight}`;
      productSelect.append(option);
    });
  }

  function renderItems() {
    itemList.replaceChildren();
    if (!composition.size) {
      const empty = document.createElement('p');
      empty.className = 'gift-studio__list-empty';
      empty.textContent = 'Пока ничего не выбрано.';
      itemList.append(empty);
      return;
    }

    composition.forEach((quantity, id) => {
      const product = productsById.get(id);
      if (!product) return;
      const row = document.createElement('div');
      row.className = 'gift-studio__item';
      row.append(makeImage(product, 'gift-studio__item-image', ''));
      const text = document.createElement('div');
      text.className = 'gift-studio__item-text';
      const name = document.createElement('span');
      name.textContent = product.name;
      const weight = document.createElement('small');
      weight.textContent = product.weight;
      text.append(name, weight);
      const controls = document.createElement('div');
      controls.className = 'gift-studio__quantity';
      controls.setAttribute('aria-label', `Количество: ${product.name}`);
      const minus = document.createElement('button');
      minus.type = 'button';
      minus.dataset.giftChange = '-1';
      minus.dataset.productId = id;
      minus.setAttribute('aria-label', `Уменьшить количество: ${product.name}`);
      minus.textContent = '−';
      const count = document.createElement('span');
      count.textContent = String(quantity);
      count.setAttribute('aria-live', 'polite');
      const plus = document.createElement('button');
      plus.type = 'button';
      plus.dataset.giftChange = '1';
      plus.dataset.productId = id;
      plus.setAttribute('aria-label', `Увеличить количество: ${product.name}`);
      plus.textContent = '+';
      plus.disabled = totalCount() >= boxSize;
      controls.append(minus, count, plus);
      row.append(text, controls);
      itemList.append(row);
    });
  }

  function renderPreview() {
    const count = totalCount();
    const occasion = root.querySelector('[name="gift-occasion"]:checked')?.value || 'Спасибо';
    root.querySelector('[data-gift-capacity]').textContent = `${count} из ${boxSize} мест`;
    root.querySelector('[data-gift-greeting]').textContent = occasion;
    root.querySelector('[data-gift-preview-note]').textContent = noteInput.value.trim();
    root.querySelector('[data-gift-mass]').textContent = `Масса: ${Math.round(totalMass())} г`;
    previewItems.replaceChildren();

    if (!count) {
      const empty = document.createElement('p');
      empty.className = 'gift-studio__empty';
      empty.append('Здесь появится ваш набор.', document.createElement('br'), 'Добавьте первый вкус.');
      previewItems.append(empty);
      return;
    }

    const slots = [];
    composition.forEach((quantity, id) => {
      const product = productsById.get(id);
      for (let index = 0; product && index < quantity; index += 1) slots.push(product);
    });
    slots.forEach(product => {
      const card = document.createElement('div');
      card.className = 'gift-studio__preview-item';
      card.append(makeImage(product, 'gift-studio__preview-image', product.name));
      const name = document.createElement('span');
      name.textContent = product.name;
      const weight = document.createElement('small');
      weight.textContent = product.weight;
      card.append(name, weight);
      previewItems.append(card);
    });
  }

  function render() {
    renderItems();
    renderPreview();
    root.querySelectorAll('[data-gift-size]').forEach(button => {
      const active = Number(button.dataset.giftSize) === boxSize;
      button.setAttribute('aria-pressed', String(active));
    });
    const full = totalCount() >= boxSize;
    root.querySelector('[data-gift-add]').disabled = full || !productSelect.value;
    if (full) announce('Коробка заполнена. Уменьшите количество или выберите формат на 5 предметов.');
    else if (countLabel()) announce(`${countLabel()} свободно.`);
  }

  function countLabel() {
    const remaining = boxSize - totalCount();
    const word = remaining === 1 ? 'место' : remaining > 1 && remaining < 5 ? 'места' : 'мест';
    return `${remaining} ${word}`;
  }

  function setQuantity(id, delta) {
    if (!productsById.has(id)) return;
    const current = composition.get(id) || 0;
    if (delta > 0 && totalCount() >= boxSize) {
      announce('В коробке нет свободных мест. Выберите формат на 5 предметов или уменьшите количество.');
      return;
    }
    const next = current + delta;
    if (next <= 0) composition.delete(id);
    else composition.set(id, next);
    saveDraft();
    render();
  }

  function boxSizeChanged(size) {
    boxSize = size;
    let remaining = size;
    const next = new Map();
    composition.forEach((quantity, id) => {
      const accepted = Math.min(quantity, remaining);
      if (accepted > 0) next.set(id, accepted);
      remaining -= accepted;
    });
    composition = next;
    saveDraft();
    render();
  }

  function compositionText() {
    const lines = ['САД №17 · ПОДАРОЧНАЯ КОМПОЗИЦИЯ', `Формат: ${boxSize} предмета`, `Повод: ${root.querySelector('[name="gift-occasion"]:checked')?.value || 'Спасибо'}`];
    composition.forEach((quantity, id) => {
      const product = productsById.get(id);
      if (product) lines.push(`${product.name} × ${quantity} — ${product.weight}`);
    });
    lines.push(`Общая масса: ${Math.round(totalMass())} г`);
    if (noteInput.value.trim()) lines.push(`Пожелание: ${noteInput.value.trim()}`);
    lines.push('Демонстрационная концепция · без заказа и оплаты');
    return lines.join('\n');
  }

  function resetBuilder() {
    composition.clear();
    boxSize = 3;
    noteInput.value = '';
    root.querySelector('[name="gift-occasion"][value="Спасибо"]').checked = true;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* State still resets in this view. */ }
    root.querySelector('#gift-note-count').textContent = '0 / 140';
    productSelect.value = '';
    render();
    announce('Черновик очищен. Можно собрать новый набор.');
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function loadCanvasImage(product) {
    const src = imagePath(product);
    if (!src) return Promise.resolve(null);
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }

  async function downloadCard() {
    if (!composition.size) {
      announce('Добавьте хотя бы один вкус, чтобы скачать открытку.');
      return;
    }
    const button = root.querySelector('[data-gift-download]');
    button.disabled = true;
    announce('Готовим открытку…');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (!ctx || typeof canvas.toBlob !== 'function') throw new Error('Canvas PNG unavailable');

      const slots = [];
      composition.forEach((quantity, id) => {
        const product = productsById.get(id);
        for (let index = 0; product && index < quantity; index += 1) slots.push(product);
      });
      const images = await Promise.all(slots.map(loadCanvasImage));
      ctx.fillStyle = '#f5f3ee';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#b49b70';
      ctx.lineWidth = 2;
      roundedRect(ctx, 28, 28, 1144, 744, 24);
      ctx.stroke();
      ctx.fillStyle = '#263328';
      ctx.font = '500 22px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('САД №17', 72, 82);
      ctx.fillStyle = '#73796d';
      ctx.font = '13px Arial, sans-serif';
      ctx.fillText('ЯБЛОЧНОЕ АТЕЛЬЕ · ДЕМОНСТРАЦИОННАЯ КОНЦЕПЦИЯ', 72, 108);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#73796d';
      ctx.font = '15px Arial, sans-serif';
      ctx.fillText(`${boxSize} ПРЕДМЕТА · ${Math.round(totalMass())} г`, 1128, 82);
      ctx.textAlign = 'left';
      ctx.strokeStyle = '#c7b58f';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(72, 132);
      ctx.lineTo(1128, 132);
      ctx.stroke();

      const columns = 3;
      const cellWidth = 326;
      const gap = 32;
      const startX = 72;
      const startY = 154;
      slots.forEach((product, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const x = startX + col * (cellWidth + gap);
        const y = startY + row * 206;
        ctx.fillStyle = '#fffefa';
        roundedRect(ctx, x, y, cellWidth, 190, 14);
        ctx.fill();
        ctx.strokeStyle = '#e0ddd3';
        ctx.stroke();
        const image = images[index];
        if (image) {
          const ratio = Math.min(128 / image.width, 136 / image.height);
          const width = image.width * ratio;
          const height = image.height * ratio;
          ctx.drawImage(image, x + 18 + (128 - width) / 2, y + 15 + (136 - height) / 2, width, height);
        } else {
          ctx.fillStyle = '#e9eadf';
          roundedRect(ctx, x + 18, y + 15, 128, 136, 10);
          ctx.fill();
          ctx.fillStyle = '#53624b';
          ctx.font = '16px Georgia, serif';
          ctx.fillText('САД №17', x + 36, y + 88);
        }
        ctx.fillStyle = '#263328';
        ctx.font = '17px Arial, sans-serif';
        const words = String(product.name).split(/\s+/);
        let line = '';
        let textY = y + 68;
        words.forEach(word => {
          const test = line ? `${line} ${word}` : word;
          if (ctx.measureText(test).width > 160 && line) {
            ctx.fillText(line, x + 164, textY, 150);
            textY += 25;
            line = word;
          } else line = test;
        });
        if (line) ctx.fillText(line, x + 164, textY, 150);
        ctx.fillStyle = '#73796d';
        ctx.font = '14px Arial, sans-serif';
        ctx.fillText(product.weight, x + 164, Math.min(y + 146, textY + 30));
      });

      const greeting = root.querySelector('[name="gift-occasion"]:checked')?.value || 'Спасибо';
      ctx.fillStyle = '#263328';
      ctx.textAlign = 'left';
      ctx.font = 'italic 29px Georgia, serif';
      ctx.fillText(greeting, 72, 610);
      const note = noteInput.value.trim();
      if (note) {
        ctx.fillStyle = '#596256';
        ctx.font = '15px Arial, sans-serif';
        const words = note.split(/\s+/);
        const noteLines = [];
        let line = '';
        words.forEach(word => {
          const candidate = line ? `${line} ${word}` : word;
          if (ctx.measureText(candidate).width > 1040 && line) {
            noteLines.push(line);
            line = word;
          } else line = candidate;
        });
        if (line) noteLines.push(line);
        noteLines.slice(0, 3).forEach((noteLine, index) => ctx.fillText(noteLine, 72, 644 + index * 22));
      }
      ctx.fillStyle = '#73796d';
      ctx.font = '12px Arial, sans-serif';
      ctx.fillText('Демонстрационная концепция · САД №17 · Не является предложением о продаже', 72, 716);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG export failed');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sad17-gift-card.png';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      announce('Открытка PNG скачана. Это демонстрационная концепция.');
    } catch {
      announce('Не удалось создать PNG на этом устройстве. Состав набора можно скопировать отдельно.');
    } finally {
      button.disabled = false;
    }
  }

  root.querySelectorAll('[data-gift-size]').forEach(button => {
    button.addEventListener('click', () => boxSizeChanged(Number(button.dataset.giftSize) === 5 ? 5 : 3));
  });
  productSelect.addEventListener('change', () => {
    root.querySelector('[data-gift-add]').disabled = totalCount() >= boxSize || !productSelect.value;
  });
  root.querySelector('[data-gift-add]').addEventListener('click', () => {
    const id = productSelect.value;
    if (!productsById.has(id)) return;
    setQuantity(id, 1);
    productSelect.value = '';
    root.querySelector('[data-gift-add]').disabled = totalCount() >= boxSize;
  });
  itemList.addEventListener('click', event => {
    const button = event.target.closest('[data-gift-change]');
    if (button && root.contains(button)) setQuantity(button.dataset.productId, Number(button.dataset.giftChange));
  });
  root.querySelectorAll('[name="gift-occasion"]').forEach(input => input.addEventListener('change', () => {
    saveDraft();
    renderPreview();
  }));
  noteInput.addEventListener('input', () => {
    if (noteInput.value.length > 140) noteInput.value = noteInput.value.slice(0, 140);
    root.querySelector('#gift-note-count').textContent = `${noteInput.value.length} / 140`;
    saveDraft();
    renderPreview();
  });
  root.querySelector('[data-gift-reset]').addEventListener('click', resetBuilder);
  window.addEventListener('sad17:reset', resetBuilder);
  root.querySelector('[data-gift-copy]').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(compositionText());
      announce('Состав скопирован в буфер обмена. Ничего не отправлено.');
    } catch {
      announce('Не удалось скопировать состав. Проверьте разрешение буфера обмена в браузере.');
    }
  });
  root.querySelector('[data-gift-download]').addEventListener('click', downloadCard);

  fetch('products.json?v=sad17-1').then(response => {
    if (!response.ok) throw new Error('Catalog unavailable');
    return response.json();
  }).then(data => {
    if (!Array.isArray(data)) throw new Error('Invalid catalog');
    products = data.filter(product => product && typeof product.id === 'string' && typeof product.name === 'string' && productWeight(product) > 0);
    products.forEach(product => productsById.set(product.id, product));
    const draft = readDraft();
    if (draft) {
      boxSize = draft.size;
      composition = draft.items;
      noteInput.value = draft.note;
      const occasionInput = root.querySelector(`[name="gift-occasion"][value="${CSS.escape(draft.occasion)}"]`);
      if (occasionInput) occasionInput.checked = true;
      root.querySelector('#gift-note-count').textContent = `${noteInput.value.length} / 140`;
    }
    renderSelect();
    render();
    announce(products.length ? 'Черновик этого набора сохраняется только в вашем браузере.' : 'В каталоге пока нет доступных вкусов.');
  }).catch(() => {
    productSelect.replaceChildren();
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Не удалось загрузить вкусы';
    productSelect.append(option);
    root.querySelector('[data-gift-add]').disabled = true;
    announce('Не удалось загрузить демонстрационный каталог. Обновите страницу.');
  });
})();
