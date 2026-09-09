/* TICKIT — Local Storage: Profile, Stats, History, Achievements, Settings */
(function () {
  const C = TICKIT.CONFIG;
  const KEYS = C.STORAGE_KEYS;

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return 'p_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    }
    return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function getPlayerId() {
    let id = localStorage.getItem(KEYS.playerId);
    if (!id || typeof id !== 'string' || id.length > 32) {
      id = generateId();
      localStorage.setItem(KEYS.playerId, id);
    }
    return id;
  }

  const defaultProfile = () => ({
    username: 'Player',
    avatar: C.AVATARS[0],
    symbol: 'X'
  });

  const defaultStats = () => ({
    total: 0, wins: 0, losses: 0, draws: 0,
    aiGames: 0, onlineGames: 0, rankedGames: 0,
    streak: 0, bestStreak: 0
  });

  const defaultSettings = () => ({
    theme: 'cyberpunk',
    sound: true,
    music: false,
    animations: true
  });

  TICKIT.Storage = {
    getPlayerId,
    getProfile: () => ({ ...defaultProfile(), ...read(KEYS.profile, {}) }),
    saveProfile(p) { write(KEYS.profile, p); },

    getStats: () => ({ ...defaultStats(), ...read(KEYS.stats, {}) }),
    saveStats(s) { write(KEYS.stats, s); },

    getSettings: () => ({ ...defaultSettings(), ...read(KEYS.settings, {}) }),
    saveSettings(s) { write(KEYS.settings, s); },

    getAchievements: () => read(KEYS.achievements, []),
    unlockAchievement(id) {
      const list = this.getAchievements();
      if (!list.includes(id)) {
        list.push(id);
        write(KEYS.achievements, list);
        return true;
      }
      return false;
    },

    getHistory: () => read(KEYS.history, []),
    addHistory(entry) {
      const history = this.getHistory();
      history.unshift({ ...entry, id: Date.now(), date: new Date().toISOString() });
      write(KEYS.history, history.slice(0, C.HISTORY_LIMIT));
    },
    clearHistory() { write(KEYS.history, []); },

    recordResult({ mode, opponent, result, symbol, score, seriesResult, ranked }) {
      const stats = this.getStats();
      stats.total++;
      if (result === 'win') {
        stats.wins++;
        stats.streak++;
        if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
      } else if (result === 'loss') {
        stats.losses++;
        stats.streak = 0;
      } else {
        stats.draws++;
        stats.streak = 0;
      }
      if (mode === 'ai') stats.aiGames++;
      if (mode === 'online') stats.onlineGames++;
      if (ranked) stats.rankedGames++;
      this.saveStats(stats);

      this.addHistory({
        mode, opponent, result, symbol, score: score || null, seriesResult: seriesResult || null, ranked: !!ranked
      });

      this.checkAchievements({ result, mode, ranked, stats, seriesResult });
      return stats;
    },

    checkAchievements({ result, mode, ranked, stats, seriesResult, perfectRound, comeback }) {
      if (result === 'win') {
        this.unlockAchievement('first_win');
        if (stats.wins >= 5) this.unlockAchievement('wins_5');
        if (stats.wins >= 10) this.unlockAchievement('wins_10');
        if (stats.streak >= 3) this.unlockAchievement('streak_3');
        if (perfectRound) this.unlockAchievement('perfect');
      }
      if (mode === 'online') this.unlockAchievement('multiplayer');
      if (ranked) this.unlockAchievement('ranked');
      if (seriesResult === 'win') this.unlockAchievement('series');
      if (comeback) this.unlockAchievement('comeback');
    },

    winRate(stats) {
      const s = stats || this.getStats();
      if (s.total === 0) return 0;
      return Math.round((s.wins / s.total) * 100);
    },

    resetLocalData() {
      [KEYS.profile, KEYS.stats, KEYS.history, KEYS.achievements, KEYS.settings].forEach(k => {
        localStorage.removeItem(k);
      });
    }
  };
})();
