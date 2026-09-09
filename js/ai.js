/* TICKIT — AI Engine: Easy, Medium, Hard (Minimax) + Game Analysis */
(function () {
  const WIN = TICKIT.CONFIG.WIN_PATTERNS;

  function checkWin(board, player) {
    return WIN.some(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c] && board[a] === player);
  }

  function getAvailable(board) {
    return board.map((c, i) => (c === '' ? i : null)).filter(i => i !== null);
  }

  function minimax(board, isMax, ai = 'O', human = 'X') {
    if (checkWin(board, ai)) return { score: 10 };
    if (checkWin(board, human)) return { score: -10 };
    if (board.every(c => c !== '')) return { score: 0 };

    const moves = getAvailable(board);
    if (isMax) {
      let best = { score: -Infinity, index: moves[0] };
      for (const idx of moves) {
        board[idx] = ai;
        const result = minimax(board, false, ai, human);
        board[idx] = '';
        if (result.score > best.score) best = { score: result.score, index: idx };
      }
      return best;
    }
    let best = { score: Infinity, index: moves[0] };
    for (const idx of moves) {
      board[idx] = human;
      const result = minimax(board, true, ai, human);
      board[idx] = '';
      if (result.score < best.score) best = { score: result.score, index: idx };
    }
    return best;
  }

  function findWinMove(board, player) {
    for (const i of getAvailable(board)) {
      board[i] = player;
      const win = checkWin(board, player);
      board[i] = '';
      if (win) return i;
    }
    return null;
  }

  function getRandomMove(board) {
    const avail = getAvailable(board);
    return avail[Math.floor(Math.random() * avail.length)];
  }

  function getStrategicMove(board, ai = 'O', human = 'X') {
    const win = findWinMove(board, ai);
    if (win !== null) return win;
    const block = findWinMove(board, human);
    if (block !== null) return block;
    if (board[4] === '') return 4;
    const corners = [0, 2, 6, 8].filter(i => board[i] === '');
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
    return getRandomMove(board);
  }

  TICKIT.AI = {
    getMove(board, difficulty) {
      const b = [...board];
      if (difficulty === 'easy') {
        if (Math.random() < 0.35) return getStrategicMove(b);
        return getRandomMove(b);
      }
      if (difficulty === 'medium') {
        const roll = Math.random();
        if (roll < 0.45) return getStrategicMove(b);
        if (roll < 0.7) return getRandomMove(b);
        return minimax(b, true).index;
      }
      return minimax(b, true).index;
    },

    analyzeGame(moves, playerSymbol = 'X', difficulty = 'medium') {
      const analysis = {
        winner: null,
        playerMistakes: [],
        missedWins: [],
        aiMistakes: [],
        summary: ''
      };
      if (!moves || moves.length === 0) {
        analysis.summary = 'No moves recorded.';
        return analysis;
      }

      const board = Array(9).fill('');
      const aiSymbol = playerSymbol === 'X' ? 'O' : 'X';
      let current = 'X';

      for (const { index, player } of moves) {
        const before = [...board];
        board[index] = player;

        if (player === playerSymbol) {
          const missed = findWinMove(before, playerSymbol);
          if (missed !== null && missed !== index) {
            analysis.missedWins.push(`Move ${moves.indexOf(moves.find(m => m.index === index && m.player === player)) + 1}: You could have won!`);
          }
          const block = findWinMove(before, aiSymbol);
          if (block !== null && block !== index && !checkWin(before, aiSymbol)) {
            analysis.playerMistakes.push(`Move ${moves.indexOf(moves.find(m => m.index === index && m.player === player)) + 1}: Missed blocking AI's threat.`);
          }
        } else if (difficulty === 'hard') {
          const optimal = minimax(before, true, aiSymbol, playerSymbol);
          if (optimal.index !== index) {
            analysis.aiMistakes.push(`AI played suboptimally at move ${moves.indexOf(moves.find(m => m.index === index && m.player === player)) + 1}.`);
          }
        }
        current = current === 'X' ? 'O' : 'X';
      }

      if (checkWin(board, playerSymbol)) {
        analysis.winner = 'player';
        analysis.summary = `Great game! You beat the ${difficulty} AI.`;
      } else if (checkWin(board, aiSymbol)) {
        analysis.winner = 'ai';
        analysis.summary = `The ${difficulty} AI won this round. Review your key moments below.`;
      } else {
        analysis.winner = 'draw';
        analysis.summary = 'A solid draw — both sides played well.';
      }

      if (analysis.missedWins.length === 0 && analysis.playerMistakes.length === 0 && analysis.winner === 'player') {
        analysis.summary += ' No major mistakes detected!';
      }
      return analysis;
    }
  };
})();
