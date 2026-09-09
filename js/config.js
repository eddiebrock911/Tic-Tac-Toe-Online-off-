/* TICKIT — Shared Configuration */
const TICKIT = window.TICKIT || {};

TICKIT.CONFIG = {
  WIN_PATTERNS: [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ],

  QUICK_CHAT: [
    { id: 'maza', text: 'Maza aaya' },
    { id: 'nice', text: 'Nice Move' },
    { id: 'gg', text: 'Good Game' },
    { id: 'almost', text: 'Almost!' },
    { id: 'turn', text: 'Your Turn' },
    { id: 'fast', text: 'Fast Play' },
    { id: 'haha', text: 'Haha' }
  ],

  AVATARS: ['😎', '🦊', '🐼', '🚀', '👾', '🎮', '⚡', '🔥', '💎', '🌟'],

  THEMES: ['cyberpunk', 'space', 'matrix', 'neon', 'minimal', 'retro'],

  RANK_TIERS: [
    { name: 'Bronze', min: 0, max: 799, color: '#cd7f32' },
    { name: 'Silver', min: 800, max: 999, color: '#c0c0c0' },
    { name: 'Gold', min: 1000, max: 1199, color: '#ffd700' },
    { name: 'Platinum', min: 1200, max: 1399, color: '#e5e4e2' },
    { name: 'Diamond', min: 1400, max: Infinity, color: '#b9f2ff' }
  ],

  DEFAULT_RATING: 1000,
  ELO_K: 32,

  HISTORY_LIMIT: 50,
  CHAT_DISPLAY_MS: 4000,
  CHAT_COOLDOWN_MS: 2000,

  ROOM_GRACE_MS: 60000,
  ROOM_EXPIRY_MS: 3600000,
  ROOM_CLEANUP_INTERVAL_MS: 300000,
  LOBBY_EXPIRY_MS: 600000,

  STORAGE_KEYS: {
    profile: 'tickit_profile',
    stats: 'tickit_stats',
    history: 'tickit_history',
    achievements: 'tickit_achievements',
    settings: 'tickit_settings',
    playerId: 'tickit_player_id'
  },

  ACHIEVEMENTS: [
    { id: 'first_win', name: 'First Win', desc: 'Win your first game', icon: '🏆' },
    { id: 'wins_5', name: 'Rising Star', desc: 'Win 5 games', icon: '⭐' },
    { id: 'wins_10', name: 'Champion', desc: 'Win 10 games', icon: '👑' },
    { id: 'streak_3', name: 'On Fire', desc: 'Win 3 in a row', icon: '🔥' },
    { id: 'perfect', name: 'Perfect Game', desc: 'Win without opponent scoring', icon: '💯' },
    { id: 'ai_challenger', name: 'AI Challenger', desc: 'Beat Hard AI', icon: '🤖' },
    { id: 'multiplayer', name: 'Multiplayer', desc: 'Play an online match', icon: '🌐' },
    { id: 'ranked', name: 'Ranked Player', desc: 'Complete a ranked match', icon: '📊' },
    { id: 'series', name: 'Series Champion', desc: 'Win a 3-game series', icon: '🎯' },
    { id: 'comeback', name: 'Comeback', desc: 'Win after being behind in series', icon: '💪' }
  ]
};

TICKIT.getRankTier = function (rating) {
  const tiers = TICKIT.CONFIG.RANK_TIERS;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (rating >= tiers[i].min) return { ...tiers[i], index: i };
  }
  return { ...tiers[0], index: 0 };
};

TICKIT.getNextRankProgress = function (rating) {
  const tier = TICKIT.getRankTier(rating);
  if (tier.max === Infinity) return { tier, progress: 100, next: null, remaining: 0 };
  const range = tier.max - tier.min + 1;
  const progress = Math.min(100, Math.round(((rating - tier.min) / range) * 100));
  const nextTier = TICKIT.CONFIG.RANK_TIERS[tier.index + 1] || null;
  return {
    tier,
    progress,
    next: nextTier,
    remaining: tier.max - rating + 1
  };
};

window.TICKIT = TICKIT;
