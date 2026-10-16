// Switching views leaves serial data, speech and event recording running.
(() => {
  const tabs = [...document.querySelectorAll('.nav-tab')];
  const pages = [...document.querySelectorAll('.app-page')];
  const scrollPositions = new Map();
  let active = tabs[0];

  function selectTab(tab) {
    if (tab === active) return;
    scrollPositions.set(active.id, window.scrollY);
    active = tab;
    for (const item of tabs) {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    }
    for (const page of pages) page.hidden = page.id !== tab.getAttribute('aria-controls');
    // Immediate switching also respects keyboard and reduced-motion preferences.
    window.scrollTo({ top: scrollPositions.get(tab.id) || 0, behavior: 'instant' });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next == null) return;
      event.preventDefault();
      tabs[next].focus({ preventScroll: true });
      selectTab(tabs[next]);
    });
  });

  document.querySelector('.skip-link').addEventListener('click', event => {
    event.preventDefault();
    selectTab(tabs[0]);
    document.querySelector('#speech-read').focus();
  });
})();
