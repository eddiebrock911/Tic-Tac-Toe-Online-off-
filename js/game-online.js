/* TICKIT — Online Multiplayer Mode */
(function () {
  let socket = null;
  let socketInitialized = false;
  let currentRoom = null;
  let mySymbol = null;
  let isMyTurn = false;
  let onlineBoardState = Array(9).fill('');
  let onlineScores = { X: 0, O: 0, tie: 0 };
  let onlineMode = 'casual';
  let lastChatTime = 0;
  let reconnecting = false;
  let playerId = null;

  const subScreens = ['onlineSetupScreen', 'onlineLobbyScreen', 'onlineGameScreen'];

  function showSubScreen(id) {
    subScreens.forEach(s => {
      const el = document.getElementById(s);
      if (el) el.style.display = s === id ? 'block' : 'none';
    });
  }

  function getProfilePayload() {
    const p = TICKIT.Storage.getProfile();
    return {
      playerId: playerId,
      username: p.username.slice(0, 20),
      avatar: p.avatar
    };
  }

  function updateStatus(text) {
    document.getElementById('statusOnline').textContent = text;
  }

  function updateScoresUI() {
    const scoreYou = document.getElementById('scoreYouOnline');
    const scoreOpp = document.getElementById('scoreOpponentOnline');
    const scoreTie = document.getElementById('scoreTieOnline');
    if (mySymbol === 'X') {
      scoreYou.textContent = onlineScores.X;
      scoreOpp.textContent = onlineScores.O;
    } else {
      scoreYou.textContent = onlineScores.O;
      scoreOpp.textContent = onlineScores.X;
    }
    scoreTie.textContent = onlineScores.tie;
  }

  function syncBoardFromServer(board, lastMoveIndex) {
    onlineBoardState = [...board];
    const cells = document.querySelectorAll('#boardOnline .cell');
    cells.forEach((cell, i) => {
      cell.textContent = board[i] || '';
      cell.className = 'cell';
      if (board[i]) cell.classList.add('taken', board[i].toLowerCase());
      cell.setAttribute('aria-label', board[i] ? `Cell ${i + 1}, ${board[i]}` : 'Empty cell');
    });
    if (lastMoveIndex != null && lastMoveIndex >= 0) {
      TICKIT.UI.highlightLastMove(cells[lastMoveIndex]);
    }
  }

  function applyServerState(state) {
    if (!state) return;
    currentRoom = state.roomCode || currentRoom;
    mySymbol = state.mySymbol || mySymbol;
    isMyTurn = state.currentPlayer === mySymbol;
    onlineScores = { ...state.scores };
    onlineMode = state.mode || onlineMode;

    document.getElementById('gameRoomCode').textContent = currentRoom;
    document.getElementById('youIndicator').textContent = `${TICKIT.Storage.getProfile().avatar} You: ${mySymbol}`;
    document.getElementById('opponentIndicator').textContent = `Opponent: ${mySymbol === 'X' ? 'O' : 'X'}`;
    document.getElementById('onlineModeTag').textContent = onlineMode === 'ranked' ? 'Ranked' : 'Casual';

    syncBoardFromServer(state.board, state.lastMoveIndex);
    updateScoresUI();

    if (state.gameActive === false) {
      updateStatus('Round over — start a new game');
    } else {
      updateStatus(isMyTurn ? "Your Turn! ✨" : "Opponent's Turn... ⏳");
    }
    showSubScreen('onlineGameScreen');
  }

  function emitWhenConnected(event, payload) {
    initSocket();
    const send = () => socket.emit(event, payload);
    if (socket.connected) send();
    else socket.once('connect', send);
  }

  function initSocket() {
    if (socketInitialized) {
      if (!socket.connected) socket.connect();
      return;
    }

    const socketUrl = window.location.protocol === 'file:'
      ? 'https://tickitonline.onrender.com'
      : window.location.origin;

    socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    socket.on('connect', () => {
      console.log('Connected:', socket.id);
      reconnecting = false;
      TICKIT.UI.showStatusBanner('connectionBanner', '', false);
      if (currentRoom && playerId) {
        socket.emit('reconnect-room', { roomCode: currentRoom, ...getProfilePayload() });
      }
    });

    socket.on('connect_error', () => {
      TICKIT.UI.showStatusBanner('connectionBanner', 'Unable to connect to multiplayer server.', true);
      TICKIT.UI.showToast('Unable to connect to multiplayer server.', 'error');
    });

    socket.on('reconnect_attempt', () => {
      reconnecting = true;
      TICKIT.UI.showStatusBanner('connectionBanner', 'Reconnecting...', true);
    });

    socket.on('room-created', (data) => {
      const roomCode = typeof data === 'string' ? data : data?.roomCode;
      const mode = typeof data === 'object' && data ? data.mode : 'casual';
      if (!roomCode) {
        TICKIT.UI.showToast('Failed to create room. Please try again.', 'error');
        return;
      }
      currentRoom = roomCode;
      mySymbol = 'X';
      onlineMode = mode || 'casual';
      document.getElementById('lobbyRoomCode').textContent = roomCode;
      document.getElementById('lobbyModeTag').textContent = onlineMode === 'ranked' ? 'Ranked Match' : 'Casual Match';
      showSubScreen('onlineLobbyScreen');
      TICKIT.Audio.play('pop');
    });

    socket.on('game-start', (state) => {
      if (state.mySymbol) mySymbol = state.mySymbol;
      else mySymbol = state.players?.X === socket.id ? 'X' : 'O';
      applyServerState({ ...state, mySymbol });
      TICKIT.Storage.unlockAchievement('multiplayer');
      TICKIT.Audio.play('win');
      const joinBtn = document.getElementById('joinGameBtn');
      if (joinBtn) { joinBtn.disabled = false; joinBtn.textContent = 'Join Game'; }
      const hostBtn = document.getElementById('hostGameBtn');
      if (hostBtn) { hostBtn.disabled = false; hostBtn.textContent = 'Host Game'; }
    });

    socket.on('state-sync', (state) => {
      applyServerState(state);
    });

    socket.on('move-made', ({ index, player, board, lastMoveIndex }) => {
      onlineBoardState = [...board];
      const cells = document.querySelectorAll('#boardOnline .cell');
      const idx = parseInt(index, 10);
      TICKIT.UI.renderCell(cells[idx], player);
      TICKIT.UI.highlightLastMove(cells[idx]);
      TICKIT.Audio.play('click');
    });

    socket.on('turn-change', (currentPlayer) => {
      isMyTurn = currentPlayer === mySymbol;
      updateStatus(isMyTurn ? "Your Turn! ✨" : "Opponent's Turn... ⏳");
    });

    socket.on('game-over', (data) => {
      onlineScores = { ...data.scores };
      updateScoresUI();
      const cells = document.querySelectorAll('#boardOnline .cell');
      isMyTurn = false;

      let result, title, winner, loser;
      if (data.result === 'win') {
        TICKIT.UI.highlightWinner(cells, data.board);
        if (data.winner === mySymbol) {
          result = 'win';
          title = 'You Win! 🎉';
          winner = TICKIT.Storage.getProfile().username;
          loser = 'Opponent';
          updateStatus('You Win! 🎉');
          TICKIT.Audio.play('win');
        } else {
          result = 'loss';
          title = 'Opponent Wins!';
          winner = 'Opponent';
          loser = TICKIT.Storage.getProfile().username;
          updateStatus('Opponent Wins! 😢');
          TICKIT.Audio.play('lose');
        }
      } else {
        result = 'draw';
        title = "It's a Draw!";
        updateStatus("It's a Tie! 🤝");
        TICKIT.Audio.play('draw');
      }

      const ranked = onlineMode === 'ranked';
      TICKIT.Storage.recordResult({
        mode: 'online', opponent: 'Online Player', result,
        symbol: mySymbol, score: `${onlineScores.X}-${onlineScores.O}-${onlineScores.tie}`, ranked
      });
      if (ranked) TICKIT.Storage.unlockAchievement('ranked');
      TICKIT.UI.updateProfileDisplay();

      let subtitle = '';
      if (data.eloChanges && ranked) {
        const change = data.eloChanges[mySymbol];
        subtitle = change != null ? `Rating ${change >= 0 ? '+' : ''}${change}` : '';
      }

      TICKIT.UI.showResultOverlay({
        title, winner, loser, isDraw: result === 'draw', subtitle,
        seriesScore: `You ${mySymbol === 'X' ? onlineScores.X : onlineScores.O} - Opponent ${mySymbol === 'X' ? onlineScores.O : onlineScores.X} (Ties: ${onlineScores.tie})`,
        mode: 'online',
        onNewGame: () => { if (socket && currentRoom) socket.emit('reset-game'); },
        onLeave: () => TICKIT.OnlineGame.leave()
      });
    });

    socket.on('game-reset', ({ currentPlayer }) => {
      isMyTurn = currentPlayer === mySymbol;
      onlineBoardState = Array(9).fill('');
      TICKIT.UI.clearBoardHighlights(document.querySelectorAll('#boardOnline .cell'));
      TICKIT.UI.hideResultOverlay();
      updateStatus(isMyTurn ? "Your Turn! ✨" : "Opponent's Turn... ⏳");
      TICKIT.Audio.play('pop');
    });

    socket.on('quick-chat', ({ message, senderName, senderId }) => {
      TICKIT.UI.showChatBubble(message, senderName, senderId === socket.id);
      TICKIT.Audio.play('chat');
    });

    socket.on('incoming-emoji', ({ emoji }) => {
      spawnEmoji(emoji);
      TICKIT.Audio.play('pop');
    });

    socket.on('opponent-disconnected', () => {
      TICKIT.UI.showStatusBanner('connectionBanner', 'Opponent disconnected. Waiting for reconnection...', true);
    });

    socket.on('opponent-reconnected', () => {
      TICKIT.UI.showStatusBanner('connectionBanner', '', false);
      TICKIT.UI.showToast('Opponent reconnected!', 'success');
    });

    socket.on('opponent-left', (data) => {
      const msg = data?.reason === 'timeout' ? 'Opponent did not reconnect.' : 'Opponent left the room.';
      TICKIT.UI.showToast(msg, 'warning');
      TICKIT.OnlineGame.leave();
    });

    socket.on('error-message', (msg) => {
      TICKIT.UI.showToast(msg, 'error');
      const joinBtn = document.getElementById('joinGameBtn');
      if (joinBtn) { joinBtn.disabled = false; joinBtn.textContent = 'Join Game'; }
      const hostBtn = document.getElementById('hostGameBtn');
      if (hostBtn) { hostBtn.disabled = false; hostBtn.textContent = 'Host Game'; }
      if (msg.includes('Room not found') || msg.includes('Invalid room') || msg.includes('Failed to join')) {
        showSubScreen('onlineSetupScreen');
      }
    });

    socket.on('rating-update', ({ rating, tier }) => {
      const ratingEl = document.getElementById('profileRating');
      const rankEl = document.getElementById('profileRank');
      if (ratingEl) ratingEl.textContent = rating;
      if (rankEl) rankEl.textContent = tier;
    });

    socketInitialized = true;
  }

  function spawnEmoji(emoji) {
    const container = document.getElementById('onlineGameScreen');
    if (!container) return;
    const span = document.createElement('span');
    span.className = 'floating-emoji';
    span.textContent = emoji;
    const randX = Math.floor(Math.random() * 140) - 70;
    const randRot = Math.floor(Math.random() * 60) - 30;
    span.style.setProperty('--rand-x', `${randX}px`);
    span.style.setProperty('--rand-rot', `${randRot}deg`);
    container.appendChild(span);
    setTimeout(() => span.remove(), 1500);
  }

  TICKIT.OnlineGame = {
    init() {
      playerId = TICKIT.Storage.getPlayerId();

      document.getElementById('hostGameBtn').addEventListener('click', () => {
        playerId = TICKIT.Storage.getPlayerId();
        const mode = document.querySelector('input[name="onlineModeType"]:checked')?.value || 'casual';
        const btn = document.getElementById('hostGameBtn');
        btn.disabled = true;
        btn.textContent = 'Creating...';
        emitWhenConnected('create-room', { ...getProfilePayload(), mode });
        setTimeout(() => { btn.disabled = false; btn.textContent = 'Host Game'; }, 3000);
      });

      document.getElementById('joinGameBtn').addEventListener('click', () => {
        const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
        if (code.length !== 6) {
          TICKIT.UI.showToast('Please enter a valid 6-character room code.', 'warning');
          return;
        }
        playerId = TICKIT.Storage.getPlayerId();
        const joinBtn = document.getElementById('joinGameBtn');
        joinBtn.disabled = true;
        joinBtn.textContent = 'Joining...';
        emitWhenConnected('join-room', { roomCode: code, ...getProfilePayload() });
        setTimeout(() => { joinBtn.disabled = false; joinBtn.textContent = 'Join Game'; }, 3000);
      });

      document.getElementById('roomCodeInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('joinGameBtn').click();
      });

      document.getElementById('copyCodeBtn').addEventListener('click', () => {
        const code = document.getElementById('lobbyRoomCode').textContent;
        if (!code || code === '------') return;
        navigator.clipboard.writeText(code).then(() => {
          const btn = document.getElementById('copyCodeBtn');
          btn.textContent = '✅ Copied!';
          btn.classList.add('copied');
          TICKIT.Audio.play('pop');
          setTimeout(() => { btn.textContent = '📋 Copy'; btn.classList.remove('copied'); }, 2000);
        });
      });

      document.getElementById('cancelLobbyBtn').addEventListener('click', () => this.leave());
      document.getElementById('leaveBtnOnline').addEventListener('click', () => {
        if (confirm('Leave this game?')) this.leave();
      });
      document.getElementById('resetBtnOnline').addEventListener('click', () => {
        if (socket && currentRoom) socket.emit('reset-game');
      });

      document.querySelectorAll('#boardOnline .cell').forEach(cell => {
        cell.addEventListener('click', () => {
          const idx = parseInt(cell.dataset.index, 10);
          if (onlineBoardState[idx] !== '' || !isMyTurn) return;
          if (socket && currentRoom) socket.emit('make-move', { index: idx });
        });
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('role', 'gridcell');
      });

      document.querySelectorAll('.emoji-bar .emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (socket && currentRoom) socket.emit('emoji-reaction', btn.dataset.emoji);
        });
      });

      document.querySelectorAll('.quick-chat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const now = Date.now();
          if (now - lastChatTime < TICKIT.CONFIG.CHAT_COOLDOWN_MS) {
            TICKIT.UI.showToast('Please wait before sending another message.', 'warning');
            return;
          }
          if (socket && currentRoom) {
            socket.emit('quick-chat', { messageId: btn.dataset.msgId });
            lastChatTime = now;
          }
        });
      });
    },

    leave() {
      if (socket && currentRoom) socket.emit('leave-room');
      if (socket) { socket.disconnect(); socket = null; }
      socketInitialized = false;
      currentRoom = null;
      mySymbol = null;
      isMyTurn = false;
      onlineBoardState = Array(9).fill('');
      reconnecting = false;
      TICKIT.UI.hideResultOverlay();
      TICKIT.UI.showStatusBanner('connectionBanner', '', false);
      showSubScreen('onlineSetupScreen');
    },

    enterSetup() {
      showSubScreen('onlineSetupScreen');
    },

    isActive() { return !!currentRoom; }
  };
})();
