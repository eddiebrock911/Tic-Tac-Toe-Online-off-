const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'players.json');

// --- Configuration ---
const CONFIG = {
  WIN_PATTERNS: [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]],
  DEFAULT_RATING: 1000,
  ELO_K: 32,
  ROOM_GRACE_MS: 60000,
  ROOM_EXPIRY_MS: 3600000,
  LOBBY_EXPIRY_MS: 600000,
  CHAT_COOLDOWN_MS: 2000,
  MOVE_COOLDOWN_MS: 200,
  QUICK_CHAT: {
    maza: 'Maza aaya', nice: 'Nice Move', gg: 'Good Game',
    almost: 'Almost!', turn: 'Your Turn', fast: 'Fast Play', haha: 'Haha'
  },
  RANK_TIERS: [
    { name: 'Bronze', min: 0 }, { name: 'Silver', min: 800 },
    { name: 'Gold', min: 1000 }, { name: 'Platinum', min: 1200 },
    { name: 'Diamond', min: 1400 }
  ],
  ALLOWED_EMOJIS: ['😂', '🔥', '👑', '😮', '😮‍💨', '🤝']
};

app.use(express.static(__dirname));
app.use(express.json());

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// --- Persistent Player Store ---
let playerStore = {};
const socketToRoom = new Map();
const socketToPlayerId = new Map();
const rooms = new Map();

function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      playerStore = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) { console.warn('Could not load player store:', e.message); }
}

function saveStore() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(playerStore, null, 2));
  } catch (e) { console.warn('Could not save player store:', e.message); }
}

loadStore();
setInterval(saveStore, 60000);

function getOrCreatePlayer(playerId, username, avatar, fallbackId) {
  if (!playerId || typeof playerId !== 'string' || playerId.length > 32) {
    playerId = fallbackId;
  }
  if (!playerId || typeof playerId !== 'string') return null;
  if (!playerStore[playerId]) {
    playerStore[playerId] = {
      id: playerId,
      username: sanitizeText(username) || 'Player',
      avatar: sanitizeAvatar(avatar),
      rating: CONFIG.DEFAULT_RATING,
      wins: 0, losses: 0, draws: 0, games: 0, streak: 0,
      weeklyRating: CONFIG.DEFAULT_RATING,
      monthlyRating: CONFIG.DEFAULT_RATING,
      lastPlayed: Date.now()
    };
  } else {
    if (username) playerStore[playerId].username = sanitizeText(username);
    if (avatar) playerStore[playerId].avatar = sanitizeAvatar(avatar);
  }
  return playerStore[playerId];
}

function sanitizeText(str) {
  if (typeof str !== 'string') return 'Player';
  return str.replace(/[<>&"']/g, '').trim().slice(0, 20) || 'Player';
}

function sanitizeAvatar(str) {
  if (typeof str !== 'string') return '🎮';
  return str.slice(0, 4);
}

function getRankTier(rating) {
  let tier = CONFIG.RANK_TIERS[0];
  for (const t of CONFIG.RANK_TIERS) {
    if (rating >= t.min) tier = t;
  }
  return tier.name;
}

function calcElo(winnerRating, loserRating, isDraw) {
  const expected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  if (isDraw) {
    const change = Math.round(CONFIG.ELO_K * (0.5 - expected));
    return { winnerChange: change, loserChange: -change };
  }
  const change = Math.round(CONFIG.ELO_K * (1 - expected));
  return { winnerChange: change, loserChange: -change };
}

function updateRankedStats(winnerId, loserId, isDraw, winnerSymbol, room) {
  if (room.mode !== 'ranked') return null;
  const px = room.players.X?.playerId;
  const po = room.players.O?.playerId;
  if (!px || !po) return null;

  const pX = playerStore[px];
  const pO = playerStore[po];
  if (!pX || !pO) return null;

  const changes = {};
  if (isDraw) {
    const { winnerChange } = calcElo(pX.rating, pO.rating, true);
    pX.rating += winnerChange; pO.rating -= winnerChange;
    pX.draws++; pO.draws++;
    pX.streak = 0; pO.streak = 0;
    changes.X = winnerChange; changes.O = -winnerChange;
  } else {
    const winnerId2 = winnerSymbol === 'X' ? px : po;
    const loserId2 = winnerSymbol === 'X' ? po : px;
    const winner = playerStore[winnerId2];
    const loser = playerStore[loserId2];
    const { winnerChange, loserChange } = calcElo(winner.rating, loser.rating, false);
    winner.rating += winnerChange;
    loser.rating += loserChange;
    winner.wins++; loser.losses++;
    winner.streak++;
    loser.streak = 0;
    changes[winnerSymbol] = winnerChange;
    changes[winnerSymbol === 'X' ? 'O' : 'X'] = loserChange;
  }
  pX.games++; pO.games++;
  pX.lastPlayed = Date.now(); pO.lastPlayed = Date.now();
  pX.weeklyRating = pX.rating; pO.weeklyRating = pO.rating;
  pX.monthlyRating = pX.rating; pO.monthlyRating = pO.rating;
  saveStore();
  return changes;
}

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  } while (rooms.has(code));
  return code;
}

function checkWin(board) {
  return CONFIG.WIN_PATTERNS.some(([a, b, c]) =>
    board[a] && board[a] === board[b] && board[a] === board[c]
  );
}

function getWinningPattern(board) {
  return CONFIG.WIN_PATTERNS.find(([a, b, c]) =>
    board[a] && board[a] === board[b] && board[a] === board[c]
  );
}

function createRoom(socket, data) {
  const { username, avatar, mode } = data || {};
  let { playerId } = data || {};
  const code = generateRoomCode();
  const player = getOrCreatePlayer(playerId, username, avatar, socket.id);
  if (!player) { socket.emit('error-message', 'Could not create player session.'); return; }
  playerId = player.id;

  const room = {
    code,
    mode: mode === 'ranked' ? 'ranked' : 'casual',
    players: {
      X: { id: socket.id, playerId, username: player.username, avatar: player.avatar, disconnected: false },
      O: null
    },
    board: Array(9).fill(''),
    currentPlayer: 'X',
    gameActive: true,
    scores: { X: 0, O: 0, tie: 0 },
    lastMoveIndex: null,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    chatCooldowns: {},
    moveCooldowns: {},
    graceTimers: {}
  };

  rooms.set(code, room);
  socketToRoom.set(socket.id, code);
  socketToPlayerId.set(socket.id, playerId);
  socket.join(code);
  socket.emit('room-created', { roomCode: code, mode: room.mode });
  console.log(`Room ${code} created (${room.mode}) by ${playerId}`);
}

function buildStateSync(room, socketId) {
  const mySymbol = room.players.X?.id === socketId ? 'X' : room.players.O?.id === socketId ? 'O' : null;
  return {
    roomCode: room.code,
    mySymbol,
    board: [...room.board],
    currentPlayer: room.currentPlayer,
    scores: { ...room.scores },
    gameActive: room.gameActive,
    mode: room.mode,
    lastMoveIndex: room.lastMoveIndex,
    players: {
      X: room.players.X ? { username: room.players.X.username, avatar: room.players.X.avatar } : null,
      O: room.players.O ? { username: room.players.O.username, avatar: room.players.O.avatar } : null
    }
  };
}

function cleanupRoom(code) {
  const room = rooms.get(code);
  if (!room) return;
  Object.values(room.graceTimers).forEach(t => clearTimeout(t));
  rooms.delete(code);
  console.log(`Room ${code} cleaned up`);
}

function scheduleGracePeriod(room, symbol) {
  const key = symbol;
  if (room.graceTimers[key]) clearTimeout(room.graceTimers[key]);
  room.graceTimers[key] = setTimeout(() => {
    const r = rooms.get(room.code);
    if (!r) return;
    const player = r.players[symbol];
    if (player?.disconnected) {
      io.to(r.code).emit('opponent-left', { reason: 'timeout' });
      cleanupRoom(r.code);
    }
  }, CONFIG.ROOM_GRACE_MS);
}

// Room cleanup interval
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    const inactive = now - room.lastActivity > CONFIG.ROOM_EXPIRY_MS;
    const lobbyStale = !room.players.O && now - room.createdAt > CONFIG.LOBBY_EXPIRY_MS;
    if (inactive || lobbyStale) cleanupRoom(code);
  }
}, 300000);

// --- REST API ---
app.get('/api/leaderboard', (req, res) => {
  const filter = req.query.filter || 'global';
  let players = Object.values(playerStore).filter(p => p.games > 0);

  if (filter === 'weekly') {
    players.sort((a, b) => b.weeklyRating - a.weeklyRating);
  } else if (filter === 'monthly') {
    players.sort((a, b) => b.monthlyRating - a.monthlyRating);
  } else {
    players.sort((a, b) => b.rating - a.rating);
  }

  res.json({
    players: players.slice(0, 50).map(p => ({
      username: p.username, avatar: p.avatar, rating: p.rating,
      wins: p.wins, losses: p.losses, draws: p.draws, games: p.games,
      tier: getRankTier(p.rating)
    }))
  });
});

app.get('/api/player/:id', (req, res) => {
  const p = playerStore[req.params.id];
  if (!p) return res.json({ rating: CONFIG.DEFAULT_RATING, tier: 'Gold', games: 0 });
  res.json({
    rating: p.rating, tier: getRankTier(p.rating),
    wins: p.wins, losses: p.losses, draws: p.draws, games: p.games, streak: p.streak
  });
});

// --- Socket.IO ---
io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.on('create-room', (data) => {
    createRoom(socket, data || {});
  });

  socket.on('join-room', (payload) => {
    try {
      const data = typeof payload === 'string' ? { roomCode: payload } : (payload || {});
      const { roomCode, username, avatar } = data;
      const cleanCode = (roomCode || '').toUpperCase().trim();
      if (!/^[A-Z0-9]{6}$/.test(cleanCode)) {
        socket.emit('error-message', 'Invalid room code.');
        return;
      }

      const room = rooms.get(cleanCode);
      if (!room) { socket.emit('error-message', 'Room not found.'); return; }
      if (room.players.O && !room.players.O.disconnected) {
        socket.emit('error-message', 'Room is full.'); return;
      }

      const player = getOrCreatePlayer(data.playerId, username, avatar, socket.id);
      if (!player) { socket.emit('error-message', 'Could not join room.'); return; }
      const resolvedPlayerId = player.id;

      // Reconnecting O player
      if (room.players.O?.disconnected && room.players.O.playerId === resolvedPlayerId) {
        room.players.O.id = socket.id;
        room.players.O.disconnected = false;
        if (room.graceTimers.O) clearTimeout(room.graceTimers.O);
        socketToRoom.set(socket.id, cleanCode);
        socketToPlayerId.set(socket.id, resolvedPlayerId);
        socket.join(cleanCode);
        io.to(cleanCode).emit('opponent-reconnected');
        socket.emit('state-sync', { ...buildStateSync(room, socket.id), mySymbol: 'O' });
        return;
      }

      if (room.players.O) { socket.emit('error-message', 'Room is full.'); return; }

      room.players.O = {
        id: socket.id,
        playerId: resolvedPlayerId,
        username: player.username,
        avatar: player.avatar,
        disconnected: false
      };
      room.lastActivity = Date.now();
      socketToRoom.set(socket.id, cleanCode);
      socketToPlayerId.set(socket.id, resolvedPlayerId);
      socket.join(cleanCode);

      const hostSocket = io.sockets.sockets.get(room.players.X.id);
      if (hostSocket) {
        hostSocket.emit('game-start', { ...buildStateSync(room, room.players.X.id), mySymbol: 'X' });
      }
      socket.emit('game-start', { ...buildStateSync(room, socket.id), mySymbol: 'O' });
      console.log(`${resolvedPlayerId} joined room ${cleanCode}`);
    } catch (err) {
      console.error('join-room error:', err);
      socket.emit('error-message', 'Failed to join room. Please try again.');
    }
  });

  socket.on('reconnect-room', (payload) => {
    try {
      const data = payload || {};
      const cleanCode = (data.roomCode || '').toUpperCase().trim();
      const room = rooms.get(cleanCode);
      if (!room) { socket.emit('error-message', 'Room not found.'); return; }

      const player = getOrCreatePlayer(data.playerId, data.username, data.avatar, socket.id);
      if (!player) { socket.emit('error-message', 'Could not reconnect.'); return; }
      const resolvedPlayerId = player.id;

      let symbol = null;
      if (room.players.X?.playerId === resolvedPlayerId) symbol = 'X';
      else if (room.players.O?.playerId === resolvedPlayerId) symbol = 'O';
      else { socket.emit('error-message', 'You are not a member of this room.'); return; }

      room.players[symbol].id = socket.id;
      room.players[symbol].disconnected = false;
      if (room.graceTimers[symbol]) clearTimeout(room.graceTimers[symbol]);
      socketToRoom.set(socket.id, cleanCode);
      socketToPlayerId.set(socket.id, resolvedPlayerId);
      socket.join(cleanCode);
      io.to(cleanCode).emit('opponent-reconnected');
      socket.emit('state-sync', { ...buildStateSync(room, socket.id), mySymbol: symbol });
      console.log(`${resolvedPlayerId} reconnected to ${cleanCode}`);
    } catch (err) {
      console.error('reconnect-room error:', err);
      socket.emit('error-message', 'Failed to reconnect.');
    }
  });

  socket.on('make-move', ({ index }) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room || !room.gameActive) return;

    const now = Date.now();
    if (room.moveCooldowns[socket.id] && now - room.moveCooldowns[socket.id] < CONFIG.MOVE_COOLDOWN_MS) return;
    room.moveCooldowns[socket.id] = now;

    const expectedId = room.currentPlayer === 'X' ? room.players.X?.id : room.players.O?.id;
    if (socket.id !== expectedId) return;

    const cellIndex = parseInt(index, 10);
    if (isNaN(cellIndex) || cellIndex < 0 || cellIndex > 8 || room.board[cellIndex] !== '') return;

    const playerSymbol = room.currentPlayer;
    room.board[cellIndex] = playerSymbol;
    room.lastMoveIndex = cellIndex;
    room.lastActivity = Date.now();

    io.to(roomCode).emit('move-made', {
      index: cellIndex, player: playerSymbol,
      board: [...room.board], lastMoveIndex: cellIndex
    });

    if (checkWin(room.board)) {
      room.scores[playerSymbol]++;
      room.gameActive = false;
      const eloChanges = updateRankedStats(null, null, false, playerSymbol, room);
      io.to(roomCode).emit('game-over', {
        result: 'win', winner: playerSymbol,
        scores: { ...room.scores }, board: [...room.board],
        winningPattern: getWinningPattern(room.board),
        eloChanges
      });
      emitRatingUpdates(room);
    } else if (room.board.every(c => c !== '')) {
      room.scores.tie++;
      room.gameActive = false;
      const eloChanges = updateRankedStats(null, null, true, null, room);
      io.to(roomCode).emit('game-over', {
        result: 'tie', scores: { ...room.scores }, board: [...room.board], eloChanges
      });
      emitRatingUpdates(room);
    } else {
      room.currentPlayer = room.currentPlayer === 'X' ? 'O' : 'X';
      io.to(roomCode).emit('turn-change', room.currentPlayer);
    }
  });

  socket.on('reset-game', () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;
    if (!room.players.X || !room.players.O) return;

    room.board = Array(9).fill('');
    room.currentPlayer = 'X';
    room.gameActive = true;
    room.lastMoveIndex = null;
    room.lastActivity = Date.now();

    io.to(roomCode).emit('game-reset', { currentPlayer: 'X', board: [...room.board] });
  });

  socket.on('quick-chat', ({ messageId }) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;

    const message = CONFIG.QUICK_CHAT[messageId];
    if (!message) return;

    const now = Date.now();
    if (room.chatCooldowns[socket.id] && now - room.chatCooldowns[socket.id] < CONFIG.CHAT_COOLDOWN_MS) return;
    room.chatCooldowns[socket.id] = now;

    let senderName = 'Player';
    if (room.players.X?.id === socket.id) senderName = room.players.X.username;
    else if (room.players.O?.id === socket.id) senderName = room.players.O.username;

    io.to(roomCode).emit('quick-chat', { message, senderName, senderId: socket.id });
  });

  socket.on('emoji-reaction', (emoji) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    if (!CONFIG.ALLOWED_EMOJIS.includes(emoji)) return;
    io.to(roomCode).emit('incoming-emoji', { emoji, senderId: socket.id });
  });

  socket.on('leave-room', () => {
    handleDisconnect(socket, true);
  });

  socket.on('disconnect', () => {
    handleDisconnect(socket, false);
  });

  function emitRatingUpdates(room) {
    if (room.mode !== 'ranked') return;
    ['X', 'O'].forEach(sym => {
      const p = room.players[sym];
      if (p?.playerId && playerStore[p.playerId]) {
        const data = playerStore[p.playerId];
        io.to(p.id).emit('rating-update', { rating: data.rating, tier: getRankTier(data.rating) });
      }
    });
  }

  function handleDisconnect(socket, isVoluntary) {
    const roomCode = socketToRoom.get(socket.id);
    socketToRoom.delete(socket.id);
    socketToPlayerId.delete(socket.id);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    let symbol = null;
    if (room.players.X?.id === socket.id) symbol = 'X';
    else if (room.players.O?.id === socket.id) symbol = 'O';
    if (!symbol) return;

    if (isVoluntary || !room.players.O) {
      socket.to(roomCode).emit('opponent-left', { reason: 'left' });
      cleanupRoom(roomCode);
      return;
    }

    room.players[symbol].disconnected = true;
    room.lastActivity = Date.now();
    socket.to(roomCode).emit('opponent-disconnected');
    scheduleGracePeriod(room, symbol);
    console.log(`${symbol} disconnected from ${roomCode}, grace period started`);
  }
});

server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 TICKIT Server running on port ${PORT}`);
  console.log(`👉 Open http://localhost:${PORT}`);
  console.log('====================================================');
});
