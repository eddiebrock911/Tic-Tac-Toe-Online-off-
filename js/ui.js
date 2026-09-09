/* TICKIT — Shared UI: Overlays, Toasts, Last Move, Modals, Status */
(function () {
  let lastMoveCell = null;
  let toastContainer = null;

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function animEnabled() {
    return TICKIT.Storage.getSettings().animations && !prefersReducedMotion();
  }

  TICKIT.UI = {
    init() {
      toastContainer = document.getElementById('toastContainer');
    },

    highlightLastMove(cell) {
      if (lastMoveCell) lastMoveCell.classList.remove('last-move');
      if (cell) {
        cell.classList.add('last-move');
        lastMoveCell = cell;
      } else {
        lastMoveCell = null;
      }
    },

    clearBoardHighlights(cells) {
      cells.forEach(c => {
        c.classList.remove('winner', 'last-move', 'taken', 'x', 'o');
        c.textContent = '';
        c.className = 'cell';
        c.setAttribute('aria-label', 'Empty cell');
      });
      lastMoveCell = null;
    },

    highlightWinner(cells, board) {
      TICKIT.CONFIG.WIN_PATTERNS.forEach(([a, b, c]) => {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
          cells[a].classList.add('winner');
          cells[b].classList.add('winner');
          cells[c].classList.add('winner');
        }
      });
    },

    renderCell(cell, player) {
      cell.textContent = player;
      cell.classList.add('taken', player.toLowerCase());
      cell.setAttribute('aria-label', `Cell ${parseInt(cell.dataset.index, 10) + 1}, ${player}`);
      if (animEnabled()) cell.classList.add('cell-pop');
      setTimeout(() => cell.classList.remove('cell-pop'), 300);
    },

    showToast(message, type = 'info', duration = 3500) {
      if (!toastContainer) return;
      const el = document.createElement('div');
      el.className = `toast toast-${type}`;
      el.setAttribute('role', 'status');
      el.textContent = message;
      toastContainer.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));
      setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
      }, duration);
    },

    showStatusBanner(id, message, visible = true) {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = message;
      el.hidden = !visible;
      el.setAttribute('aria-live', 'polite');
    },

    showResultOverlay(data) {
      const overlay = document.getElementById('resultOverlay');
      if (!overlay) return;
      const {
        title, subtitle, winner, loser, isDraw,
        seriesScore, seriesWinner, mode,
        onNewGame, onLeave
      } = data;

      document.getElementById('resultTitle').textContent = title || (isDraw ? "It's a Draw!" : 'Game Over');
      document.getElementById('resultSubtitle').textContent = subtitle || '';
      document.getElementById('resultWinner').textContent = winner || '—';
      document.getElementById('resultLoser').textContent = loser || '—';
      document.getElementById('resultDraw').hidden = !isDraw;
      document.getElementById('resultWinLoss').hidden = !!isDraw;

      const seriesEl = document.getElementById('resultSeries');
      if (seriesScore) {
        seriesEl.hidden = false;
        seriesEl.textContent = `Series: ${seriesScore}${seriesWinner ? ` — ${seriesWinner} wins series!` : ''}`;
      } else {
        seriesEl.hidden = true;
      }

      overlay.hidden = false;
      overlay.classList.add('show');
      if (animEnabled()) overlay.classList.add('animate-in');

      const newBtn = document.getElementById('resultNewGame');
      const leaveBtn = document.getElementById('resultLeave');
      const cloneNew = newBtn.cloneNode(true);
      const cloneLeave = leaveBtn.cloneNode(true);
      newBtn.replaceWith(cloneNew);
      leaveBtn.replaceWith(cloneLeave);

      cloneNew.addEventListener('click', () => {
        TICKIT.UI.hideResultOverlay();
        if (onNewGame) onNewGame();
      });
      cloneLeave.addEventListener('click', () => {
        TICKIT.UI.hideResultOverlay();
        if (onLeave) onLeave();
      });

      cloneLeave.hidden = mode !== 'online';
    },

    hideResultOverlay() {
      const overlay = document.getElementById('resultOverlay');
      if (!overlay) return;
      overlay.classList.remove('show', 'animate-in');
      overlay.hidden = true;
    },

    showModal(id) {
      const modal = document.getElementById(id);
      if (modal) {
        modal.hidden = false;
        modal.classList.add('show');
        const focusable = modal.querySelector('button, input, [tabindex]');
        if (focusable) focusable.focus();
      }
    },

    hideModal(id) {
      const modal = document.getElementById(id);
      if (modal) {
        modal.classList.remove('show');
        modal.hidden = true;
      }
    },

    showChatBubble(message, senderName, isSelf) {
      const container = document.getElementById('chatBubbles');
      if (!container) return;
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble ${isSelf ? 'self' : 'opponent'}`;
      bubble.textContent = message;
      const label = document.createElement('span');
      label.className = 'chat-sender';
      label.textContent = senderName;
      bubble.prepend(label);
      container.appendChild(bubble);
      setTimeout(() => {
        bubble.classList.add('fade-out');
        setTimeout(() => bubble.remove(), 400);
      }, TICKIT.CONFIG.CHAT_DISPLAY_MS);
    },

    updateProfileDisplay() {
      const profile = TICKIT.Storage.getProfile();
      const stats = TICKIT.Storage.getStats();
      const els = {
        avatar: document.getElementById('profileAvatar'),
        name: document.getElementById('profileName'),
        symbol: document.getElementById('profileSymbol'),
        wins: document.getElementById('statWins'),
        losses: document.getElementById('statLosses'),
        draws: document.getElementById('statDraws'),
        winRate: document.getElementById('statWinRate'),
        streak: document.getElementById('statStreak'),
        bestStreak: document.getElementById('statBestStreak'),
        rank: document.getElementById('profileRank'),
        rating: document.getElementById('profileRating'),
        rankProgress: document.getElementById('rankProgressBar')
      };
      if (els.avatar) els.avatar.textContent = profile.avatar;
      if (els.name) els.name.textContent = profile.username;
      if (els.symbol) els.symbol.textContent = profile.symbol;
      if (els.wins) els.wins.textContent = stats.wins;
      if (els.losses) els.losses.textContent = stats.losses;
      if (els.draws) els.draws.textContent = stats.draws;
      if (els.winRate) els.winRate.textContent = TICKIT.Storage.winRate(stats) + '%';
      if (els.streak) els.streak.textContent = stats.streak;
      if (els.bestStreak) els.bestStreak.textContent = stats.bestStreak;
    },

    renderHistory() {
      const list = document.getElementById('historyList');
      const empty = document.getElementById('historyEmpty');
      if (!list) return;
      const history = TICKIT.Storage.getHistory();
      list.innerHTML = '';
      if (history.length === 0) {
        if (empty) empty.hidden = false;
        return;
      }
      if (empty) empty.hidden = true;
      history.forEach(entry => {
        const item = document.createElement('div');
        item.className = `history-item result-${entry.result}`;
        const date = new Date(entry.date).toLocaleString();
        item.innerHTML = `
          <span class="history-result-icon">${entry.result === 'win' ? '✅' : entry.result === 'loss' ? '❌' : '🤝'}</span>
          <div class="history-details">
            <strong>${entry.mode.toUpperCase()} vs ${entry.opponent}</strong>
            <small>${date} · ${entry.symbol || '—'}${entry.ranked ? ' · Ranked' : ''}</small>
          </div>`;
        list.appendChild(item);
      });
    },

    renderAchievements() {
      const grid = document.getElementById('achievementsGrid');
      if (!grid) return;
      const unlocked = TICKIT.Storage.getAchievements();
      grid.innerHTML = '';
      TICKIT.CONFIG.ACHIEVEMENTS.forEach(a => {
        const card = document.createElement('div');
        const isUnlocked = unlocked.includes(a.id);
        card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        card.innerHTML = `<span class="ach-icon">${a.icon}</span><strong>${a.name}</strong><small>${a.desc}</small>`;
        grid.appendChild(card);
      });
    },

    renderLeaderboard(players, filter = 'global') {
      const tbody = document.getElementById('leaderboardBody');
      const empty = document.getElementById('leaderboardEmpty');
      if (!tbody) return;
      tbody.innerHTML = '';
      if (!players || players.length === 0) {
        if (empty) empty.hidden = false;
        return;
      }
      if (empty) empty.hidden = true;
      players.forEach((p, i) => {
        const tr = document.createElement('tr');
        const wr = p.games > 0 ? Math.round((p.wins / p.games) * 100) : 0;
        tr.innerHTML = `
          <td>${i + 1}</td>
          <td>${p.avatar || '🎮'} ${escapeHtml(p.username)}</td>
          <td>${p.rating}</td>
          <td>${p.wins}</td>
          <td>${p.losses}</td>
          <td>${p.draws}</td>
          <td>${wr}%</td>`;
        tbody.appendChild(tr);
      });
    },

    showAIAnalysis(analysis) {
      const panel = document.getElementById('aiAnalysisPanel');
      if (!panel) return;
      document.getElementById('aiAnalysisSummary').textContent = analysis.summary;
      const lists = {
        missed: document.getElementById('aiMissedWins'),
        mistakes: document.getElementById('aiPlayerMistakes'),
        aiErr: document.getElementById('aiAiMistakes')
      };
      lists.missed.innerHTML = analysis.missedWins.map(t => `<li>${t}</li>`).join('') || '<li>None detected</li>';
      lists.mistakes.innerHTML = analysis.playerMistakes.map(t => `<li>${t}</li>`).join('') || '<li>None detected</li>';
      lists.aiErr.innerHTML = analysis.aiMistakes.map(t => `<li>${t}</li>`).join('') || '<li>None detected</li>';
      panel.hidden = false;
    },

    hideAIAnalysis() {
      const panel = document.getElementById('aiAnalysisPanel');
      if (panel) panel.hidden = true;
    }
  };

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
})();
