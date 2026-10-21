/**
 * Gestor del juego Tres en Raya (Tic-Tac-Toe)
 */

class TicTacToeManager {
  constructor() {
    this.games = new Map(); // chatId -> game object
  }

  getGame(chatId) {
    return this.games.get(chatId);
  }

  createGame(chatId, p1, p2) {
    const game = {
      board: Array(9).fill(null),
      playerX: p1,
      playerO: p2,
      turn: p1, // X inicia
      winner: null,
      isDraw: false,
      startedAt: Date.now()
    };
    this.games.set(chatId, game);
    return game;
  }

  endGame(chatId) {
    this.games.delete(chatId);
  }

  renderBoard(board) {
    const numEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
    const formatted = board.map((cell, idx) => {
      if (cell === 'X') return '❌';
      if (cell === 'O') return '⭕';
      return numEmojis[idx];
    });

    return [
      `       ${formatted[0]} ┃ ${formatted[1]} ┃ ${formatted[2]}`,
      '      ━━━╋━━━╋━━━',
      `       ${formatted[3]} ┃ ${formatted[4]} ┃ ${formatted[5]}`,
      '      ━━━╋━━━╋━━━',
      `       ${formatted[6]} ┃ ${formatted[7]} ┃ ${formatted[8]}`
    ].join('\n');
  }

  checkWinner(board) {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // horizontales
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // verticales
      [0, 4, 8], [2, 4, 6]             // diagonales
    ];

    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a]; // 'X' o 'O'
      }
    }

    if (board.every(cell => cell !== null)) {
      return 'draw';
    }

    return null;
  }

  makeMove(chatId, player, position) {
    const game = this.getGame(chatId);
    if (!game) return { error: 'No hay ninguna partida activa en este chat.' };

    if (game.turn !== player) {
      return { error: '⏳ No es tu turno.' };
    }

    const posIdx = position - 1;
    if (isNaN(posIdx) || posIdx < 0 || posIdx > 8) {
      return { error: '⚠️ Posición inválida. Elige un número del 1 al 9.' };
    }

    if (game.board[posIdx] !== null) {
      return { error: '⚠️ Esa casilla ya está ocupada. Elige otra.' };
    }

    const mark = player === game.playerX ? 'X' : 'O';
    game.board[posIdx] = mark;

    const result = this.checkWinner(game.board);
    if (result === 'draw') {
      game.isDraw = true;
      this.endGame(chatId);
      return { success: true, draw: true, boardStr: this.renderBoard(game.board) };
    }

    if (result) {
      game.winner = player;
      this.endGame(chatId);
      return { success: true, winner: player, boardStr: this.renderBoard(game.board) };
    }

    // Cambiar de turno
    game.turn = game.turn === game.playerX ? game.playerO : game.playerX;
    return {
      success: true,
      nextTurn: game.turn,
      boardStr: this.renderBoard(game.board)
    };
  }
}

export const tttManager = new TicTacToeManager();
