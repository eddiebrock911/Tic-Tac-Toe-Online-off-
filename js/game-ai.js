/* TICKIT — AI Mode */
(function () {
  const checkWin = (board) =>
    TICKIT.CONFIG.WIN_PATTERNS.some(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]);

  TICKIT.AIGame = {
    board: Array(9).fill(''),
    active: true,
    scores: { X: 0, O: 0, tie: 0 },
    difficulty: 'easy',
    gameVersion: 0,
    moveHistory: [],
    cells: null,
    statusEl: null,

    init() {
      this.cells = document.querySelectorAll('#boardAI .cell');
      this.statusEl = document.getElementById('statusAI');
      document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.difficulty = btn.dataset.difficulty;
          this.reset();
        });
      });
      this.cells.forEach(c => {
        c.addEventListener('click', (e) => this.handleClick(e));
        c.setAttribute('tabindex', '0');
        c.setAttribute('role', 'gridcell');
        c.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.handleClick(e); }
        });
      });
      document.getElementById('resetBtnAI').addEventListener('click', () => this.reset());
      document.getElementById('closeAnalysisBtn')?.addEventListener('click', () => TICKIT.UI.hideAIAnalysis());
    },

    makeMove(index, player) {
      this.board[index] = player;
      TICKIT.UI.renderCell(this.cells[index], player);
      TICKIT.UI.highlightLastMove(this.cells[index]);
      this.moveHistory.push({ index, player });
    },

    handleClick(e) {
      const cell = e.target.closest('.cell');
      if (!cell) return;
      const index = parseInt(cell.dataset.index, 10);
      if (this.board[index] !== '' || !this.active) return;

      TICKIT.Audio.play('click');
      this.makeMove(index, 'X');

      if (checkWin(this.board)) {
        this.endGame('win');
        return;
      }
      if (this.board.every(c => c !== '')) {
        this.endGame('draw');
        return;
      }

      this.active = false;
      this.statusEl.textContent = 'AI is thinking...';
      const version = this.gameVersion;

      setTimeout(() => {
        if (version !== this.gameVersion) return;
        const aiMove = TICKIT.AI.getMove(this.board, this.difficulty);
        this.makeMove(aiMove, 'O');
        TICKIT.Audio.play('click');

        if (checkWin(this.board)) {
          this.endGame('loss');
        } else if (this.board.every(c => c !== '')) {
          this.endGame('draw');
        } else {
          this.statusEl.textContent = 'Your Turn (X)';
          this.active = true;
        }
      }, this.difficulty === 'hard' ? 300 : 500);
    },

    endGame(result) {
      this.active = false;
      if (result === 'win') {
        TICKIT.UI.highlightWinner(this.cells, this.board);
        this.statusEl.textContent = 'You Win! 🎉';
        this.scores.X++;
        TICKIT.Audio.play('win');
        if (this.difficulty === 'hard') TICKIT.Storage.unlockAchievement('ai_challenger');
      } else if (result === 'loss') {
        TICKIT.UI.highlightWinner(this.cells, this.board);
        this.statusEl.textContent = 'AI Wins! 🤖';
        this.scores.O++;
        TICKIT.Audio.play('lose');
      } else {
        this.statusEl.textContent = "It's a Tie! 🤝";
        this.scores.tie++;
        TICKIT.Audio.play('draw');
      }
      this.updateScores();
      TICKIT.Storage.recordResult({
        mode: 'ai', opponent: `AI (${this.difficulty})`, result,
        symbol: 'X', score: `${this.scores.X}-${this.scores.O}-${this.scores.tie}`
      });
      TICKIT.UI.updateProfileDisplay();

      const analysis = TICKIT.AI.analyzeGame(this.moveHistory, 'X', this.difficulty);
      TICKIT.UI.showAIAnalysis(analysis);

      TICKIT.UI.showResultOverlay({
        title: result === 'win' ? 'You Win!' : result === 'loss' ? 'AI Wins!' : "It's a Draw!",
        winner: result === 'win' ? 'You' : result === 'loss' ? 'AI' : null,
        loser: result === 'win' ? 'AI' : result === 'loss' ? 'You' : null,
        isDraw: result === 'draw',
        seriesScore: `${this.scores.X} - ${this.scores.O} (Ties: ${this.scores.tie})`,
        onNewGame: () => this.reset()
      });
    },

    updateScores() {
      document.getElementById('scoreXAI').textContent = this.scores.X;
      document.getElementById('scoreOAI').textContent = this.scores.O;
      document.getElementById('scoreTieAI').textContent = this.scores.tie;
    },

    reset() {
      TICKIT.Audio.play('pop');
      TICKIT.UI.hideResultOverlay();
      TICKIT.UI.hideAIAnalysis();
      this.gameVersion++;
      this.board = Array(9).fill('');
      this.moveHistory = [];
      this.active = true;
      this.statusEl.textContent = 'Your Turn (X)';
      TICKIT.UI.clearBoardHighlights(this.cells);
    }
  };
})();
