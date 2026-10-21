/**
 * Gestor del juego Conecta 4
 */

const ROWS = 6;
const COLS = 7;

class Connect4Manager {
  constructor() {
    this.games = new Map(); // chatId -> game object
  }

  getGame(chatId) {
    return this.games.get(chatId);
  }

  createGame(chatId, p1, p2) {
    const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    const game = {
      board,
      player1: p1, // Ficha 🔴 (1)
      player2: p2, // Ficha 🟡 (2)
      turn: p1,
      startedAt: Date.now()
    };
    this.games.set(chatId, game);
    return game;
  }

  endGame(chatId) {
    this.games.delete(chatId);
  }

  renderBoard(board) {
    const symbols = { 0: '⚪', 1: '🔴', 2: '🟡' };
    const rowsStr = board.map(row => row.map(cell => symbols[cell]).join(' ')).join('\n');
    const header = '1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣';
    return `${rowsStr}\n━━━━━━━━━━━━━\n${header}`;
  }

  checkWin(board, r, c, piece) {
    const directions = [
      [0, 1],  // Horizontal
      [1, 0],  // Vertical
      [1, 1],  // Diagonal /
      [1, -1]  // Diagonal \
    ];

    for (const [dr, dc] of directions) {
      let count = 1;

      // Hacia un sentido
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === piece) {
        count++;
        nr += dr;
        nc += dc;
      }

      // Hacia el sentido contrario
      nr = r - dr;
      nc = c - dc;
      while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === piece) {
        count++;
        nr -= dr;
        nc -= dc;
      }

      if (count >= 4) return true;
    }
    return false;
  }

  dropPiece(chatId, player, col) {
    const game = this.getGame(chatId);
    if (!game) return { error: 'No hay ninguna partida de Conecta 4 activa en este chat.' };

    if (game.turn !== player) {
      return { error: '⏳ No es tu turno.' };
    }

    const c = col - 1;
    if (isNaN(c) || c < 0 || c >= COLS) {
      return { error: '⚠️ Columna inválida. Elige un número del 1 al 7.' };
    }

    // Buscar la fila más baja disponible en la columna c
    let targetRow = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (game.board[r][c] === 0) {
        targetRow = r;
        break;
      }
    }

    if (targetRow === -1) {
      return { error: '⚠️ Esa columna ya está llena. Elige otra.' };
    }

    const piece = player === game.player1 ? 1 : 2;
    game.board[targetRow][c] = piece;

    if (this.checkWin(game.board, targetRow, c, piece)) {
      this.endGame(chatId);
      return {
        success: true,
        winner: player,
        boardStr: this.renderBoard(game.board)
      };
    }

    // Verificar si el tablero está lleno (empate)
    const isFull = game.board[0].every(cell => cell !== 0);
    if (isFull) {
      this.endGame(chatId);
      return {
        success: true,
        draw: true,
        boardStr: this.renderBoard(game.board)
      };
    }

    // Cambiar turno
    game.turn = game.turn === game.player1 ? game.player2 : game.player1;
    return {
      success: true,
      nextTurn: game.turn,
      boardStr: this.renderBoard(game.board)
    };
  }
}

export const connect4Manager = new Connect4Manager();
