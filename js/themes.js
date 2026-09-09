/* TICKIT — Theme Management via CSS Variables */
(function () {
  const themeVars = {
    cyberpunk: {
      '--bg-gradient-start': '#1b1b36',
      '--bg-gradient-end': '#0a0a14',
      '--blob-1': '#00f2fe',
      '--blob-2': '#ff007f',
      '--accent-1': '#00f2fe',
      '--accent-2': '#ff007f',
      '--accent-3': '#4facfe',
      '--text-primary': '#f8f9fa',
      '--text-muted': 'rgba(255,255,255,0.6)',
      '--card-bg': 'rgba(20,20,35,0.45)',
      '--cell-bg': 'rgba(255,255,255,0.03)',
      '--title-gradient': 'linear-gradient(135deg, #00f2fe 0%, #ff007f 100%)'
    },
    space: {
      '--bg-gradient-start': '#0b0d21',
      '--bg-gradient-end': '#050510',
      '--blob-1': '#6c5ce7',
      '--blob-2': '#0984e3',
      '--accent-1': '#a29bfe',
      '--accent-2': '#74b9ff',
      '--accent-3': '#6c5ce7',
      '--text-primary': '#dfe6e9',
      '--text-muted': 'rgba(223,230,233,0.6)',
      '--card-bg': 'rgba(11,13,33,0.6)',
      '--cell-bg': 'rgba(255,255,255,0.04)',
      '--title-gradient': 'linear-gradient(135deg, #a29bfe 0%, #74b9ff 100%)'
    },
    matrix: {
      '--bg-gradient-start': '#0a1a0a',
      '--bg-gradient-end': '#020502',
      '--blob-1': '#00ff41',
      '--blob-2': '#003b00',
      '--accent-1': '#00ff41',
      '--accent-2': '#39ff14',
      '--accent-3': '#00cc33',
      '--text-primary': '#d4ffd4',
      '--text-muted': 'rgba(212,255,212,0.6)',
      '--card-bg': 'rgba(0,20,0,0.5)',
      '--cell-bg': 'rgba(0,255,65,0.05)',
      '--title-gradient': 'linear-gradient(135deg, #00ff41 0%, #39ff14 100%)'
    },
    neon: {
      '--bg-gradient-start': '#1a0a2e',
      '--bg-gradient-end': '#0f0518',
      '--blob-1': '#ff00ff',
      '--blob-2': '#00ffff',
      '--accent-1': '#ff00ff',
      '--accent-2': '#00ffff',
      '--accent-3': '#ff6ec7',
      '--text-primary': '#fff0ff',
      '--text-muted': 'rgba(255,240,255,0.65)',
      '--card-bg': 'rgba(26,10,46,0.55)',
      '--cell-bg': 'rgba(255,255,255,0.04)',
      '--title-gradient': 'linear-gradient(135deg, #ff00ff 0%, #00ffff 100%)'
    },
    minimal: {
      '--bg-gradient-start': '#2d3436',
      '--bg-gradient-end': '#1e272e',
      '--blob-1': '#636e72',
      '--blob-2': '#b2bec3',
      '--accent-1': '#dfe6e9',
      '--accent-2': '#b2bec3',
      '--accent-3': '#74b9ff',
      '--text-primary': '#f5f6fa',
      '--text-muted': 'rgba(245,246,250,0.6)',
      '--card-bg': 'rgba(45,52,54,0.7)',
      '--cell-bg': 'rgba(255,255,255,0.06)',
      '--title-gradient': 'linear-gradient(135deg, #dfe6e9 0%, #b2bec3 100%)'
    },
    retro: {
      '--bg-gradient-start': '#2c1810',
      '--bg-gradient-end': '#1a0f08',
      '--blob-1': '#e17055',
      '--blob-2': '#fdcb6e',
      '--accent-1': '#e17055',
      '--accent-2': '#fdcb6e',
      '--accent-3': '#fab1a0',
      '--text-primary': '#ffeaa7',
      '--text-muted': 'rgba(255,234,167,0.65)',
      '--card-bg': 'rgba(44,24,16,0.6)',
      '--cell-bg': 'rgba(255,255,255,0.05)',
      '--title-gradient': 'linear-gradient(135deg, #e17055 0%, #fdcb6e 100%)'
    }
  };

  TICKIT.Themes = {
    apply(themeName) {
      const vars = themeVars[themeName] || themeVars.cyberpunk;
      const root = document.documentElement;
      Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
      root.setAttribute('data-theme', themeName);
      document.body.classList.add('theme-transition');
      setTimeout(() => document.body.classList.remove('theme-transition'), 400);
    },

    init() {
      const settings = TICKIT.Storage.getSettings();
      this.apply(settings.theme);
    },

    list: () => TICKIT.CONFIG.THEMES
  };
})();
