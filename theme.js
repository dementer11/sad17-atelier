(() => {
  'use strict';

  const storageKey = 'sad17-theme';
  const root = document.documentElement;
  const modes = ['auto', 'dark', 'light'];
  const media = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : { matches: false };

  let mode = 'auto';
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (modes.includes(saved)) mode = saved;
  } catch {
    // Theme selection still works when browser storage is unavailable.
  }

  const resolvedTheme = () => mode === 'auto' ? (media.matches ? 'dark' : 'light') : mode;

  function updateControl() {
    const button = document.getElementById('theme-toggle');
    const label = document.getElementById('theme-label');
    const icon = button && button.querySelector('.theme-toggle-icon');
    const nextMode = modes[(modes.indexOf(mode) + 1) % modes.length];
    const names = { auto: 'Авто', dark: 'Тёмная', light: 'Светлая' };
    const nextNames = { auto: 'автоматическую', dark: 'тёмную', light: 'светлую' };

    if (label) label.textContent = names[mode];
    if (icon) icon.textContent = mode === 'auto' ? '◐' : mode === 'dark' ? '☾' : '☀';
    if (button) {
      button.dataset.mode = mode;
      button.setAttribute('aria-label', `Тема: ${names[mode].toLowerCase()}. Переключить на ${nextNames[nextMode]} тему.`);
      button.title = `Текущая тема: ${names[mode].toLowerCase()}`;
    }
  }

  function publishChange() {
    const theme = resolvedTheme();
    root.dataset.theme = theme;
    updateControl();
    window.dispatchEvent(new CustomEvent('sad17:themechange', { detail: { mode, theme } }));
  }

  function setMode(nextMode) {
    if (!modes.includes(nextMode)) return false;
    mode = nextMode;
    try {
      window.localStorage.setItem(storageKey, mode);
    } catch {
      // Keep the in-memory theme even when browser storage is unavailable.
    }
    publishChange();
    return true;
  }

  function bindControl() {
    const button = document.getElementById('theme-toggle');
    if (!button || button.dataset.themeBound === 'true') return;
    button.dataset.themeBound = 'true';
    button.addEventListener('click', () => {
      setMode(modes[(modes.indexOf(mode) + 1) % modes.length]);
    });
    updateControl();
  }

  // Apply the saved or system-selected theme before the first paint.
  root.dataset.theme = resolvedTheme();
  window.Sad17Theme = {
    get mode() { return mode; },
    get theme() { return resolvedTheme(); },
    set: setMode,
    cycle() { return setMode(modes[(modes.indexOf(mode) + 1) % modes.length]); },
    reset() { return setMode('auto'); }
  };

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', () => {
      if (mode === 'auto') publishChange();
    });
  } else if (typeof media.addListener === 'function') {
    media.addListener(() => {
      if (mode === 'auto') publishChange();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindControl, { once: true });
  } else {
    bindControl();
  }
})();
