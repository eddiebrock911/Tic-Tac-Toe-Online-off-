/* TICKIT — Local / Friend Mode */
(function () {
  const checkWin = (board) =>
    TICKIT.CONFIG.WIN_PATTERNS.some(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]);

  TICKIT.LocalGame = {
    board: Array(9).fill(''),
    currentPlayer: 'X',
    active: true,
    scores: { X: 0, O: 0, tie: 0 },
    cells: null,
    statusEl: null,

    init() {
      this.cells = document.querySelectorAll('#boardFriend .cell');
      this.statusEl = document.getElementById('statusFriend');
      this.cells.forEach(c => {
        c.addEventListener('click', (e) => this.handleClick(e));
        c.setAttribute('tabindex', '0');
        c.setAttribute('role', 'gridcell');
        c.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.handleClick(e); }
        });
      });
      document.getElementById('resetBtnFriend').addEventListener('click', () => this.reset());
    },

    handleClick(e) {
      const cell = e.target.closest('.cell');
      if (!cell) return;
      const index = parseInt(cell.dataset.index, 10);
      if (this.board[index] !== '' || !this.active) return;

      TICKIT.Audio.play('click');
      this.board[index] = this.currentPlayer;
      TICKIT.UI.renderCell(cell, this.currentPlayer);
      TICKIT.UI.highlightLastMove(cell);

      if (checkWin(this.board)) {
        TICKIT.UI.highlightWinner(this.cells, this.board);
        this.statusEl.textContent = `Player ${this.currentPlayer} Wins! 🎉`;
        this.scores[this.currentPlayer]++;
        this.updateScores();
        this.active = false;
        TICKIT.Audio.play('win');
        const pref = TICKIT.Storage.getProfile().symbol;
        const result = this.currentPlayer === pref ? 'win' : 'loss';
        TICKIT.Storage.recordResult({
          mode: 'local', opponent: 'Friend', result,
          symbol: pref, score: `${this.scores.X}-${this.scores.O}-${this.scores.tie}`
        });
        TICKIT.UI.updateProfileDisplay();
        TICKIT.UI.showResultOverlay({
          title: `Player ${this.currentPlayer} Wins!`,
          winner: `Player ${this.currentPlayer}`,
          loser: `Player ${this.currentPlayer === 'X' ? 'O' : 'X'}`,
          isDraw: false,
          seriesScore: `${this.scores.X} - ${this.scores.O} (Ties: ${this.scores.tie})`,
          onNewGame: () => this.reset()
        });
      } else if (this.board.every(c => c !== '')) {
        this.statusEl.textContent = "It's a Tie! 🤝";
        this.scores.tie++;
        this.updateScores();
        this.active = false;
        TICKIT.Audio.play('draw');
        TICKIT.Storage.recordResult({
          mode: 'local', opponent: 'Friend', result: 'draw',
          symbol: this.currentPlayer, score: `${this.scores.X}-${this.scores.O}-${this.scores.tie}`
        });
        TICKIT.UI.updateProfileDisplay();
        TICKIT.UI.showResultOverlay({
          title: "It's a Draw!",
          isDraw: true,
          seriesScore: `${this.scores.X} - ${this.scores.O} (Ties: ${this.scores.tie})`,
          onNewGame: () => this.reset()
        });
      } else {
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        this.statusEl.textContent = `Player ${this.currentPlayer}'s Turn`;
      }
    },

    updateScores() {
      document.getElementById('scoreXFriend').textContent = this.scores.X;
      document.getElementById('scoreOFriend').textContent = this.scores.O;
      document.getElementById('scoreTieFriend').textContent = this.scores.tie;
    },

    reset() {
      TICKIT.Audio.play('pop');
      TICKIT.UI.hideResultOverlay();
      this.board = Array(9).fill('');
      this.currentPlayer = 'X';
      this.active = true;
      this.statusEl.textContent = `Player ${this.currentPlayer}'s Turn`;
      TICKIT.UI.clearBoardHighlights(this.cells);
    }
  };
})();
