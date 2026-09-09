/* TICKIT — Main Application Bootstrap */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    TICKIT.Themes.init();
    TICKIT.UI.init();
    TICKIT.Audio.resumeOnInteraction();
    TICKIT.UI.updateProfileDisplay();

    // Mode switching
    const modeBtns = [
      document.getElementById('friendModeBtn'),
      document.getElementById('aiModeBtn'),
      document.getElementById('onlineModeBtn')
    ];
    const sections = [
      document.getElementById('friendMode'),
      document.getElementById('aiMode'),
      document.getElementById('onlineMode')
    ];

    function switchMode(btn, section) {
      TICKIT.Audio.play('pop');
      modeBtns.forEach(b => b.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      section.classList.add('active');
      if (section.id !== 'onlineMode') {
        TICKIT.OnlineGame.leave();
      } else {
        TICKIT.OnlineGame.enterSetup();
      }
    }

    modeBtns[0].addEventListener('click', () => switchMode(modeBtns[0], sections[0]));
    modeBtns[1].addEventListener('click', () => switchMode(modeBtns[1], sections[1]));
    modeBtns[2].addEventListener('click', () => switchMode(modeBtns[2], sections[2]));

    TICKIT.LocalGame.init();
    TICKIT.AIGame.init();
    TICKIT.OnlineGame.init();

    // Nav buttons
    document.getElementById('profileBtn')?.addEventListener('click', () => {
      TICKIT.UI.updateProfileDisplay();
      TICKIT.UI.showModal('profileModal');
    });
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
      loadSettingsForm();
      TICKIT.UI.showModal('settingsModal');
    });
    document.getElementById('historyBtn')?.addEventListener('click', () => {
      TICKIT.UI.renderHistory();
      TICKIT.UI.showModal('historyModal');
    });
    document.getElementById('leaderboardBtn')?.addEventListener('click', () => {
      fetchLeaderboard('global');
      TICKIT.UI.showModal('leaderboardModal');
    });
    document.getElementById('achievementsBtn')?.addEventListener('click', () => {
      TICKIT.UI.renderAchievements();
      TICKIT.UI.showModal('achievementsModal');
    });

    // Close modals
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => TICKIT.UI.hideModal(btn.dataset.closeModal));
    });

    // Profile form
    document.getElementById('saveProfileBtn')?.addEventListener('click', () => {
      const profile = {
        username: document.getElementById('editUsername').value.trim().slice(0, 20) || 'Player',
        avatar: document.getElementById('editAvatar').value,
        symbol: document.querySelector('input[name="prefSymbol"]:checked')?.value || 'X'
      };
      TICKIT.Storage.saveProfile(profile);
      TICKIT.UI.updateProfileDisplay();
      TICKIT.UI.showToast('Profile saved!', 'success');
      TICKIT.UI.hideModal('profileModal');
    });

    // Avatar picker
    const avatarGrid = document.getElementById('avatarGrid');
    if (avatarGrid) {
      const profile = TICKIT.Storage.getProfile();
      TICKIT.CONFIG.AVATARS.forEach(av => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'avatar-option' + (av === profile.avatar ? ' selected' : '');
        btn.textContent = av;
        btn.addEventListener('click', () => {
          avatarGrid.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          document.getElementById('editAvatar').value = av;
        });
        avatarGrid.appendChild(btn);
      });
      document.getElementById('editUsername').value = profile.username;
      document.getElementById('editAvatar').value = profile.avatar;
    }

    // Settings
    document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
      const settings = {
        theme: document.getElementById('themeSelect').value,
        sound: document.getElementById('soundToggle').checked,
        music: document.getElementById('musicToggle').checked,
        animations: document.getElementById('animToggle').checked
      };
      TICKIT.Storage.saveSettings(settings);
      TICKIT.Themes.apply(settings.theme);
      TICKIT.UI.showToast('Settings saved!', 'success');
      TICKIT.UI.hideModal('settingsModal');
    });

    document.getElementById('resetLocalBtn')?.addEventListener('click', () => {
      if (confirm('This will remove your local profile, stats, history, achievements, and settings. Server/ranked data is NOT affected. Continue?')) {
        TICKIT.Storage.resetLocalData();
        loadSettingsForm();
        TICKIT.UI.updateProfileDisplay();
        TICKIT.UI.showToast('Local data reset.', 'success');
      }
    });

    document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
      if (confirm('Clear all match history?')) {
        TICKIT.Storage.clearHistory();
        TICKIT.UI.renderHistory();
        TICKIT.UI.showToast('History cleared.', 'success');
      }
    });

    // Leaderboard filters
    document.querySelectorAll('.lb-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.lb-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        fetchLeaderboard(btn.dataset.filter);
      });
    });

    // Back to hub
    document.querySelectorAll('#back').forEach(btn => {
      btn.addEventListener('click', () => { window.location.href = 'https://spacekit.onrender.com/'; });
    });

    // Register service worker
    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Load server rating for profile
    fetchPlayerRating();
  });

  function loadSettingsForm() {
    const s = TICKIT.Storage.getSettings();
    document.getElementById('themeSelect').value = s.theme;
    document.getElementById('soundToggle').checked = s.sound;
    document.getElementById('musicToggle').checked = s.music;
    document.getElementById('animToggle').checked = s.animations;
  }

  async function fetchLeaderboard(filter) {
    try {
      const base = window.location.protocol === 'file:' ? 'https://tickitonline.onrender.com' : '';
      const res = await fetch(`${base}/api/leaderboard?filter=${filter}`);
      const data = await res.json();
      TICKIT.UI.renderLeaderboard(data.players || [], filter);
    } catch {
      TICKIT.UI.renderLeaderboard([], filter);
      TICKIT.UI.showToast('Could not load leaderboard.', 'error');
    }
  }

  async function fetchPlayerRating() {
    try {
      const base = window.location.protocol === 'file:' ? 'https://tickitonline.onrender.com' : '';
      const id = TICKIT.Storage.getPlayerId();
      const res = await fetch(`${base}/api/player/${id}`);
      if (res.ok) {
        const data = await res.json();
        const rankEl = document.getElementById('profileRank');
        const ratingEl = document.getElementById('profileRating');
        const bar = document.getElementById('rankProgressBar');
        if (ratingEl) ratingEl.textContent = data.rating;
        const progress = TICKIT.getNextRankProgress(data.rating);
        if (rankEl) rankEl.textContent = progress.tier.name;
        if (bar) bar.style.width = progress.progress + '%';
      }
    } catch { /* offline — use defaults */ }
  }
})();
