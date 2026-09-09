// ============================================================
// BUGLESS TIC TAC TOE — Complete Rewrite
// Fixes: AudioContext leak, dataset.index string type,
//        leaveOnlineRoom flag reset, AI setTimeout race,
//        onlineBoardState reference mutation
// ============================================================


// --- Shared Audio Context (singleton — no leak) ---
let _audioCtx = null;

function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _audioCtx = new AC();
  }
  // Resume if suspended (browser autoplay policy)
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function playSynthSound(type) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;

    const playTone = (freq, start, duration, oscType = 'sine') => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = oscType;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.08, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    if (type === 'click') {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);

    } else if (type === 'pop') {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(550, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);

    } else if (type === 'win') {
      // C Major Arpeggio: C5 → E5 → G5 → C6
      playTone(523.25, 0,    0.12);
      playTone(659.25, 0.08, 0.12);
      playTone(783.99, 0.16, 0.12);
      playTone(1046.50,0.24, 0.35);

    } else if (type === 'lose') {
      // Descending retro game-over sweep
      playTone(392.00, 0,   0.12, 'sawtooth');
      playTone(369.99, 0.1, 0.12, 'sawtooth');
      playTone(349.23, 0.2, 0.12, 'sawtooth');
      playTone(329.63, 0.3, 0.35, 'sawtooth');

    } else if (type === 'draw') {
      // Double bleep
      playTone(300, 0,    0.1,  'triangle');
      playTone(300, 0.12, 0.15, 'triangle');
    }
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
}


// --- Mode Switching Logic ---
const friendModeBtn  = document.getElementById('friendModeBtn');
const aiModeBtn      = document.getElementById('aiModeBtn');
const onlineModeBtn  = document.getElementById('onlineModeBtn');

const friendMode  = document.getElementById('friendMode');
const aiMode      = document.getElementById('aiMode');
const onlineMode  = document.getElementById('onlineMode');

const modeBtns     = [friendModeBtn, aiModeBtn, onlineModeBtn];
const gameSections = [friendMode, aiMode, onlineMode];

function switchMode(activeBtn, activeSection) {
  playSynthSound('pop');

  modeBtns.forEach(btn => btn.classList.remove('active'));
  gameSections.forEach(sec => sec.classList.remove('active'));

  activeBtn.classList.add('active');
  activeSection.classList.add('active');

  if (activeSection !== onlineMode) {
    leaveOnlineRoom();
  } else {
    showOnlineSubScreen('onlineSetupScreen');
  }
}

friendModeBtn.addEventListener('click',  () => switchMode(friendModeBtn,  friendMode));
aiModeBtn.addEventListener('click',      () => switchMode(aiModeBtn,      aiMode));
onlineModeBtn.addEventListener('click',  () => switchMode(onlineModeBtn,  onlineMode));


// --- Shared Helpers ---
const WIN_PATTERNS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

function checkWin(board) {
  return WIN_PATTERNS.some(([a,b,c]) => board[a] && board[a] === board[b] && board[a] === board[c]);
}

function highlightWinner(cells, board) {
  WIN_PATTERNS.forEach(([a,b,c]) => {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      cells[a].classList.add('winner');
      cells[b].classList.add('winner');
      cells[c].classList.add('winner');
    }
  });
}


// ============================================================
// LOCAL MODE — Play With Friends
// ============================================================
const cellsFriend    = document.querySelectorAll('#boardFriend .cell');
const statusFriend   = document.getElementById('statusFriend');
const resetBtnFriend = document.getElementById('resetBtnFriend');
const scoreXFriend   = document.getElementById('scoreXFriend');
const scoreOFriend   = document.getElementById('scoreOFriend');
const scoreTieFriend = document.getElementById('scoreTieFriend');

let boardFriendState    = Array(9).fill('');
let currentPlayerFriend = 'X';
let gameActiveFriend    = true;
let scoresFriend        = { X: 0, O: 0, tie: 0 };

function handleCellClickFriend(e) {
  const index = parseInt(e.target.dataset.index, 10); // FIX: parse to number
  if (boardFriendState[index] !== '' || !gameActiveFriend) return;

  playSynthSound('click');
  boardFriendState[index] = currentPlayerFriend;

  const cell = e.target;
  cell.textContent = currentPlayerFriend;
  cell.classList.add('taken', currentPlayerFriend.toLowerCase());

  if (checkWin(boardFriendState)) {
    highlightWinner(cellsFriend, boardFriendState);
    statusFriend.textContent = `Player ${currentPlayerFriend} Wins! 🎉`;
    scoresFriend[currentPlayerFriend]++;
    updateScoreDisplayFriend();
    gameActiveFriend = false;
    playSynthSound('win');
  } else if (boardFriendState.every(c => c !== '')) {
    statusFriend.textContent = "It's a Tie! 🤝";
    scoresFriend.tie++;
    updateScoreDisplayFriend();
    gameActiveFriend = false;
    playSynthSound('draw');
  } else {
    currentPlayerFriend = currentPlayerFriend === 'X' ? 'O' : 'X';
    statusFriend.textContent = `Player ${currentPlayerFriend}'s Turn`;
  }
}

function updateScoreDisplayFriend() {
  scoreXFriend.textContent   = scoresFriend.X;
  scoreOFriend.textContent   = scoresFriend.O;
  scoreTieFriend.textContent = scoresFriend.tie;
}

function resetGameFriend() {
  playSynthSound('pop');
  boardFriendState    = Array(9).fill('');
  currentPlayerFriend = 'X';
  gameActiveFriend    = true;
  statusFriend.textContent = `Player ${currentPlayerFriend}'s Turn`;
  cellsFriend.forEach(c => {
    c.textContent = '';
    c.className   = 'cell';
  });
}

cellsFriend.forEach(c => c.addEventListener('click', handleCellClickFriend));
resetBtnFriend.addEventListener('click', resetGameFriend);


// ============================================================
// AI MODE
// ============================================================
const cellsAI        = document.querySelectorAll('#boardAI .cell');
const statusAI       = document.getElementById('statusAI');
const resetBtnAI     = document.getElementById('resetBtnAI');
const scoreXAI       = document.getElementById('scoreXAI');
const scoreOAI       = document.getElementById('scoreOAI');
const scoreTieAI     = document.getElementById('scoreTieAI');
const difficultyBtns = document.querySelectorAll('.difficulty-btn');

let boardAIState  = Array(9).fill('');
let gameActiveAI  = true;
let scoresAI      = { X: 0, O: 0, tie: 0 };
let difficulty    = 'easy';
let aiGameVersion = 0; // FIX: race condition guard — incremented on every reset

difficultyBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    difficultyBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    difficulty = btn.dataset.difficulty;
    resetGameAI();
  });
});

function handleCellClickAI(e) {
  const index = parseInt(e.target.dataset.index, 10); // FIX: parse to number
  if (boardAIState[index] !== '' || !gameActiveAI) return;

  playSynthSound('click');
  makeMoveAI(index, 'X');

  if (checkWin(boardAIState)) {
    highlightWinner(cellsAI, boardAIState);
    statusAI.textContent = "You Win! 🎉";
    scoresAI.X++;
    updateScoreDisplayAI();
    gameActiveAI = false;
    playSynthSound('win');
    return;
  }

  if (boardAIState.every(c => c !== '')) {
    statusAI.textContent = "It's a Tie! 🤝";
    scoresAI.tie++;
    updateScoreDisplayAI();
    gameActiveAI = false;
    playSynthSound('draw');
    return;
  }

  // Block user input during AI turn
  gameActiveAI = false;
  statusAI.textContent = "AI is thinking...";

  // FIX: capture current version to detect stale timeout after reset
  const versionAtClick = aiGameVersion;

  setTimeout(() => {
    // If game was reset during the 500ms delay, discard this move
    if (aiGameVersion !== versionAtClick) return;

    const aiMove = getAIMove();
    makeMoveAI(aiMove, 'O');
    playSynthSound('click');

    if (checkWin(boardAIState)) {
      highlightWinner(cellsAI, boardAIState);
      statusAI.textContent = "AI Wins! 🤖";
      scoresAI.O++;
      updateScoreDisplayAI();
      gameActiveAI = false;
      playSynthSound('lose');
    } else if (boardAIState.every(c => c !== '')) {
      statusAI.textContent = "It's a Tie! 🤝";
      scoresAI.tie++;
      updateScoreDisplayAI();
      gameActiveAI = false;
      playSynthSound('draw');
    } else {
      statusAI.textContent = "Your Turn (X)";
      gameActiveAI = true;
    }
  }, 500);
}

function makeMoveAI(index, player) {
  boardAIState[index] = player;
  cellsAI[index].textContent = player;
  cellsAI[index].classList.add('taken', player.toLowerCase());
}

function getAIMove() {
  if (difficulty === 'easy')   return getRandomMove();
  if (difficulty === 'medium') return Math.random() < 0.5 ? getBestMove() : getRandomMove();
  return getBestMove();
}

function getRandomMove() {
  const available = boardAIState
    .map((c, i) => c === '' ? i : null)
    .filter(i => i !== null);
  return available[Math.floor(Math.random() * available.length)];
}

function getBestMove() {
  // 1. Win if possible
  for (let i = 0; i < 9; i++) {
    if (boardAIState[i] === '') {
      boardAIState[i] = 'O';
      if (checkWin(boardAIState)) { boardAIState[i] = ''; return i; }
      boardAIState[i] = '';
    }
  }
  // 2. Block player from winning
  for (let i = 0; i < 9; i++) {
    if (boardAIState[i] === '') {
      boardAIState[i] = 'X';
      if (checkWin(boardAIState)) { boardAIState[i] = ''; return i; }
      boardAIState[i] = '';
    }
  }
  // 3. Take center
  if (boardAIState[4] === '') return 4;
  // 4. Take a corner
  const corners = [0, 2, 6, 8].filter(i => boardAIState[i] === '');
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
  // 5. Fallback: random
  return getRandomMove();
}

function updateScoreDisplayAI() {
  scoreXAI.textContent   = scoresAI.X;
  scoreOAI.textContent   = scoresAI.O;
  scoreTieAI.textContent = scoresAI.tie;
}

function resetGameAI() {
  playSynthSound('pop');
  aiGameVersion++;           // FIX: invalidate any pending AI setTimeout
  boardAIState  = Array(9).fill('');
  gameActiveAI  = true;
  statusAI.textContent = "Your Turn (X)";
  cellsAI.forEach(c => {
    c.textContent = '';
    c.className   = 'cell';
  });
}

cellsAI.forEach(c => c.addEventListener('click', handleCellClickAI));
resetBtnAI.addEventListener('click', resetGameAI);


// ============================================================
// ONLINE MULTIPLAYER MODE
// ============================================================
let socket            = null;
let currentRoom       = null;
let mySymbol          = null;   // 'X' or 'O'
let isMyTurn          = false;
let onlineBoardState  = Array(9).fill('');
let onlineScores      = { X: 0, O: 0, tie: 0 };
let socketInitialized = false;

const onlineSetupScreen = document.getElementById('onlineSetupScreen');
const onlineLobbyScreen = document.getElementById('onlineLobbyScreen');
const onlineGameScreen  = document.getElementById('onlineGameScreen');
const subScreens        = [onlineSetupScreen, onlineLobbyScreen, onlineGameScreen];

function showOnlineSubScreen(screenId) {
  subScreens.forEach(scr => scr.style.display = 'none');
  document.getElementById(screenId).style.display = 'block';
}

function initSocketConnection() {
  if (socketInitialized) return;

  const socketUrl = window.location.protocol === 'file:'
    ? 'https://tickitonline.onrender.com'
    : window.location.origin;

  socket = io(socketUrl, {
    autoConnect:         false,
    reconnection:        true,
    reconnectionAttempts: 5,
    timeout:             10000
  });

  socket.connect();

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err);
    alert('Failed to connect to multiplayer server. Please make sure the server is running!');
    leaveOnlineRoom();
  });

  socket.on('room-created', (roomCode) => {
    currentRoom = roomCode;
    mySymbol    = 'X';
    document.getElementById('lobbyRoomCode').textContent = roomCode;
    showOnlineSubScreen('onlineLobbyScreen');
    playSynthSound('pop');
  });

  socket.on('game-start', ({ roomCode, players, scores, currentPlayer }) => {
    currentRoom       = roomCode;
    mySymbol          = socket.id === players.X ? 'X' : 'O';
    isMyTurn          = currentPlayer === mySymbol;
    onlineScores      = { ...scores };                  // FIX: shallow copy, not reference
    onlineBoardState  = Array(9).fill('');              // FIX: fresh array, not mutation

    document.getElementById('gameRoomCode').textContent     = roomCode;
    document.getElementById('youIndicator').textContent     = `You: ${mySymbol}`;
    document.getElementById('opponentIndicator').textContent = `Opponent: ${mySymbol === 'X' ? 'O' : 'X'}`;

    updateOnlineScoresUI();
    updateOnlineStatus(isMyTurn ? "Your Turn! ✨" : "Opponent's Turn... ⏳");

    document.querySelectorAll('#boardOnline .cell').forEach(cell => {
      cell.textContent = '';
      cell.className   = 'cell';
    });

    showOnlineSubScreen('onlineGameScreen');
    playSynthSound('win');
  });

  socket.on('move-made', ({ index, player, board }) => {
    onlineBoardState  = [...board];                     // FIX: copy array, not reference
    const cellsOnline = document.querySelectorAll('#boardOnline .cell');
    const idx         = parseInt(index, 10);           // FIX: ensure number
    cellsOnline[idx].textContent = player;
    cellsOnline[idx].classList.add('taken', player.toLowerCase());
    playSynthSound('click');
  });

  socket.on('turn-change', (currentPlayer) => {
    isMyTurn = currentPlayer === mySymbol;
    updateOnlineStatus(isMyTurn ? "Your Turn! ✨" : "Opponent's Turn... ⏳");
  });

  socket.on('game-over', ({ result, winner, scores, board }) => {
    onlineScores = { ...scores };                      // FIX: copy, not reference
    updateOnlineScoresUI();

    const cellsOnline = document.querySelectorAll('#boardOnline .cell');

    if (result === 'win') {
      highlightWinnerOnline(cellsOnline, board);
      if (winner === mySymbol) {
        updateOnlineStatus("You Win! 🎉🏆");
        playSynthSound('win');
      } else {
        updateOnlineStatus("Opponent Wins! 😢");
        playSynthSound('lose');
      }
    } else {
      updateOnlineStatus("It's a Tie! 🤝");
      playSynthSound('draw');
    }
    isMyTurn = false;
  });

  socket.on('game-reset', ({ currentPlayer }) => {
    isMyTurn         = currentPlayer === mySymbol;
    onlineBoardState = Array(9).fill('');              // FIX: always a fresh array

    document.querySelectorAll('#boardOnline .cell').forEach(cell => {
      cell.textContent = '';
      cell.className   = 'cell';
    });

    updateOnlineStatus(isMyTurn ? "Your Turn! ✨" : "Opponent's Turn... ⏳");
    playSynthSound('pop');
  });

  socket.on('incoming-emoji', ({ emoji }) => {
    spawnFloatingEmoji(emoji);
    playSynthSound('pop');
  });

  socket.on('opponent-left', () => {
    alert('Opponent left the room. Returning to Online Setup.');
    leaveOnlineRoom();
  });

  socket.on('error-message', (msg) => {
    alert(msg);
    leaveOnlineRoom();
  });

  socketInitialized = true;
}

function leaveOnlineRoom() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  // FIX: reset flag OUTSIDE the if-block so it always executes
  socketInitialized = false;
  currentRoom       = null;
  mySymbol          = null;
  isMyTurn          = false;
  onlineBoardState  = Array(9).fill('');

  showOnlineSubScreen('onlineSetupScreen');
}

function updateOnlineStatus(text) {
  document.getElementById('statusOnline').textContent = text;
}

function updateOnlineScoresUI() {
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

function highlightWinnerOnline(cells, board) {
  WIN_PATTERNS.forEach(([a,b,c]) => {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      cells[a].classList.add('winner');
      cells[b].classList.add('winner');
      cells[c].classList.add('winner');
    }
  });
}

function spawnFloatingEmoji(emoji) {
  const container = document.getElementById('onlineGameScreen');
  if (!container) return;

  const span = document.createElement('span');
  span.className = 'floating-emoji';
  span.textContent = emoji;

  const randX   = Math.floor(Math.random() * 140) - 70;
  const randRot = Math.floor(Math.random() * 60)  - 30;
  span.style.setProperty('--rand-x',   `${randX}px`);
  span.style.setProperty('--rand-rot', `${randRot}deg`);

  container.appendChild(span);
  setTimeout(() => span.remove(), 1500);
}


// --- Wire up Online UI Events ---
const hostGameBtn    = document.getElementById('hostGameBtn');
const joinGameBtn    = document.getElementById('joinGameBtn');
const roomCodeInput  = document.getElementById('roomCodeInput');
const copyCodeBtn    = document.getElementById('copyCodeBtn');
const cancelLobbyBtn = document.getElementById('cancelLobbyBtn');
const resetBtnOnline = document.getElementById('resetBtnOnline');
const leaveBtnOnline = document.getElementById('leaveBtnOnline');
const cellsOnline    = document.querySelectorAll('#boardOnline .cell');

// 1. Host Room
hostGameBtn.addEventListener('click', () => {
  initSocketConnection();
  socket.emit('create-room');
});

// 2. Join Room
joinGameBtn.addEventListener('click', () => {
  const code = roomCodeInput.value.trim().toUpperCase();
  if (code.length !== 6) {
    alert('Please enter a valid 6-character room code.');
    return;
  }
  initSocketConnection();
  socket.emit('join-room', code);
});

// Enter key triggers join
roomCodeInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') joinGameBtn.click();
});

// 3. Copy Room Code
copyCodeBtn.addEventListener('click', () => {
  const roomCode = document.getElementById('lobbyRoomCode').textContent;
  if (!roomCode || roomCode === '------') return;

  navigator.clipboard.writeText(roomCode)
    .then(() => {
      copyCodeBtn.textContent = '✅ Copied!';
      copyCodeBtn.classList.add('copied');
      playSynthSound('pop');
      setTimeout(() => {
        copyCodeBtn.textContent = '📋 Copy';
        copyCodeBtn.classList.remove('copied');
      }, 2000);
    })
    .catch(err => console.error('Clipboard copy failed:', err));
});

// 4. Cancel Lobby
cancelLobbyBtn.addEventListener('click', () => {
  leaveOnlineRoom();
  playSynthSound('pop');
});

// 5. Leave active game
leaveBtnOnline.addEventListener('click', () => {
  if (confirm('Are you sure you want to leave this game?')) {
    leaveOnlineRoom();
    playSynthSound('pop');
  }
});

// 6. Reset online game
resetBtnOnline.addEventListener('click', () => {
  if (socket && currentRoom) socket.emit('reset-game');
});

// 7. Online board cell clicks
cellsOnline.forEach(cell => {
  cell.addEventListener('click', () => {
    const idx = parseInt(cell.dataset.index, 10); // FIX: parse to number
    if (onlineBoardState[idx] !== '' || !isMyTurn) return;
    if (socket && currentRoom) {
      socket.emit('make-move', { index: idx });   // FIX: send number, not string
    }
  });
});

// 8. Emoji reactions
document.querySelectorAll('.emoji-bar .emoji-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (socket && currentRoom) {
      socket.emit('emoji-reaction', btn.dataset.emoji);
    }
  });
});


// --- Back to Hub ---
document.querySelectorAll('#back').forEach(backBtn => {
  backBtn.addEventListener('click', () => {
    window.location.href = 'https://spacekit.onrender.com/';
  });
});