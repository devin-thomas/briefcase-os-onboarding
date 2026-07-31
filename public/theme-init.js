(() => {
  try {
    const raw = localStorage.getItem('briefcaseos.demo.preferences.v1');
    const saved = raw ? JSON.parse(raw) : null;
    const theme = saved?.theme === 'light' ? 'light' : 'dark';
    const accent = /^#[0-9a-f]{6}$/i.test(saved?.accent || '') ? saved.accent : '#2f80ed';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.colorScheme = theme;
  } catch {}
})();
