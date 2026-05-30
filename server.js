const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Port configuration (Render uses process.env.PORT)
const PORT = process.env.PORT || 3000;

// Serve static files from the project directory
app.use(express.static(__dirname));

// Route to ensure index.html is served for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// In-memory room storage
// Key: Room Code (e.g. "X2B9H4"), Value: Room Object
const rooms = new Map();

// Tic-Tac-Toe Winning Combinations
const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

// Helper to generate a unique 6-character room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code)); // Ensure uniqueness
  return code;
}

// Helper to check if a board has a win
function checkWin(board) {
  return WIN_PATTERNS.some(pattern => {
    const [a, b, c] = pattern;
    return board[a] && board[a] === board[b] && board[a] === board[c];
  });
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Track the room this socket belongs to
  let currentRoomCode = null;

  // 1. Host Game - Create Room
  socket.on('create-room', () => {
    const roomCode = generateRoomCode();
    
    const room = {
      code: roomCode,
      players: {
        X: { id: socket.id, score: 0 },
        O: null
      },
      board: Array(9).fill(''),
      currentPlayer: 'X',
      gameActive: true,
      scores: { X: 0, O: 0, tie: 0 }
    };

    rooms.set(roomCode, room);
    currentRoomCode = roomCode;
    
    socket.join(roomCode);
    socket.emit('room-created', roomCode);
    console.log(`Room created: ${roomCode} by ${socket.id}`);
  });

  // 2. Join Game - Join Room
  socket.on('join-room', (roomCode) => {
    const cleanCode = roomCode.toUpperCase().trim();
    const room = rooms.get(cleanCode);

    if (!room) {
      socket.emit('error-message', 'Room not found. Please check the code.');
      return;
    }

    if (room.players.O) {
      socket.emit('error-message', 'This room is full. You cannot join.');
      return;
    }

    // Register joiner as Player O
    room.players.O = { id: socket.id, score: 0 };
    currentRoomCode = cleanCode;
    
    socket.join(cleanCode);
    console.log(`User ${socket.id} joined room: ${cleanCode}`);

    // Notify both players that the game is starting
    // Send players information so they know who is X (Host) and who is O (Joiner)
    io.to(cleanCode).emit('game-start', {
      roomCode: cleanCode,
      players: {
        X: room.players.X.id,
        O: room.players.O.id
      },
      scores: room.scores,
      currentPlayer: room.currentPlayer
    });
  });

  // 3. Make Move
  socket.on('make-move', ({ index }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || !room.gameActive) return;

    // Validate turn
    const expectedPlayerId = room.currentPlayer === 'X' ? room.players.X.id : room.players.O?.id;
    if (socket.id !== expectedPlayerId) {
      return; // Not this player's turn or opponent hasn't joined
    }

    const cellIndex = parseInt(index);
    if (isNaN(cellIndex) || cellIndex < 0 || cellIndex > 8 || room.board[cellIndex] !== '') {
      return; // Invalid cell or already taken
    }

    const playerSymbol = room.currentPlayer;
    room.board[cellIndex] = playerSymbol;

    // Broadcast move immediately to keep gameplay snappy
    io.to(currentRoomCode).emit('move-made', {
      index: cellIndex,
      player: playerSymbol,
      board: room.board
    });

    // Check game outcome
    if (checkWin(room.board)) {
      room.scores[playerSymbol]++;
      room.gameActive = false;
      io.to(currentRoomCode).emit('game-over', {
        result: 'win',
        winner: playerSymbol,
        scores: room.scores,
        board: room.board
      });
      console.log(`Game over in room ${currentRoomCode}: ${playerSymbol} wins!`);
    } else if (room.board.every(cell => cell !== '')) {
      room.scores.tie++;
      room.gameActive = false;
      io.to(currentRoomCode).emit('game-over', {
        result: 'tie',
        scores: room.scores,
        board: room.board
      });
      console.log(`Game over in room ${currentRoomCode}: Tie!`);
    } else {
      // Toggle player turn
      room.currentPlayer = room.currentPlayer === 'X' ? 'O' : 'X';
      io.to(currentRoomCode).emit('turn-change', room.currentPlayer);
    }
  });

  // 4. Reset Game
  socket.on('reset-game', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    // Reset board state on server
    room.board = Array(9).fill('');
    room.currentPlayer = 'X';
    room.gameActive = true;

    // Notify both players to reset
    io.to(currentRoomCode).emit('game-reset', {
      currentPlayer: room.currentPlayer
    });
    console.log(`Game reset in room: ${currentRoomCode}`);
  });

  // 5. Floating Emoji Reaction
  socket.on('emoji-reaction', (emoji) => {
    if (!currentRoomCode) return;
    
    // Broadcast the emoji reaction to both players in the room
    // Sender ID is sent so client can style "You" vs "Opponent" reactions differently if desired
    io.to(currentRoomCode).emit('incoming-emoji', {
      emoji: emoji,
      senderId: socket.id
    });
  });

  // 6. Handle Disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        // Clean up the room and notify the other player
        socket.to(currentRoomCode).emit('opponent-left');
        rooms.delete(currentRoomCode);
        console.log(`Room ${currentRoomCode} deleted because a player disconnected.`);
      }
    }
  });
});

// Start the HTTP server
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Tic-Tac-Toe Server running on port ${PORT}`);
  console.log(`👉 Open http://localhost:${PORT} in your browser`);
  console.log(`====================================================`);
});
