import { connect4Manager } from '../../games/connect4.js';

export default {
  name: 'connect4',
  aliases: ['c4', 'conecta4'],
  description: 'Desafía a otro miembro a una partida interactiva de Conecta 4.',
  usage: '!connect4 @usuario | !connect4 <columna 1-7> | !connect4 surrender',
  category: 'economy',
  async execute({ sock, remoteJid, sender, cleanSender, mentions, args }) {
    const activeGame = connect4Manager.getGame(remoteJid);

    // Cancelar/rendirse
    if (args[0] === 'surrender' || args[0] === 'rendirse') {
      if (!activeGame) {
        await sock.sendMessage(remoteJid, { text: '⚠️ No hay ninguna partida de Conecta 4 en curso.' });
        return;
      }
      if (activeGame.player1 !== sender && activeGame.player2 !== sender) {
        await sock.sendMessage(remoteJid, { text: '⚠️ No participas en la partida actual.' });
        return;
      }
      connect4Manager.endGame(remoteJid);
      await sock.sendMessage(remoteJid, {
        text: `🏳️ @${cleanSender} se ha rendido. Partida de Conecta 4 cancelada.`,
        mentions: [sender]
      });
      return;
    }

    // Movimiento (soltar ficha en columna 1-7)
    if (activeGame && !isNaN(parseInt(args[0], 10))) {
      const col = parseInt(args[0], 10);
      const move = connect4Manager.dropPiece(remoteJid, sender, col);

      if (move.error) {
        await sock.sendMessage(remoteJid, { text: move.error });
        return;
      }

      if (move.draw) {
        await sock.sendMessage(remoteJid, {
          text: `🤝 *¡TABLERO LLENO - EMPATE EN CONECTA 4!*\n\n${move.boardStr}`
        });
        return;
      }

      if (move.winner) {
        const cleanWinner = move.winner.split(':')[0].split('@')[0];
        await sock.sendMessage(remoteJid, {
          text: `🎉 *¡CONECTA 4!* @${cleanWinner} ha ganado la partida! 🏆\n\n${move.boardStr}`,
          mentions: [move.winner]
        });
        return;
      }

      const cleanNext = move.nextTurn.split(':')[0].split('@')[0];
      const nextPiece = move.nextTurn === activeGame.player1 ? '🔴' : '🟡';
      await sock.sendMessage(remoteJid, {
        text: `🎮 *CONECTA 4*\n\n${move.boardStr}\n\n👉 Turno de: ${nextPiece} @${cleanNext} (Escribe \`!connect4 <1-7>\`)`,
        mentions: [move.nextTurn]
      });
      return;
    }

    // Desafiar
    if (!mentions || mentions.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: activeGame
          ? '⚠️ Ya hay una partida en curso. Usa `!connect4 <1-7>` para jugar o `!connect4 surrender` para finalizar.'
          : '⚠️ Para iniciar una partida de Conecta 4, debes desafiar a alguien:\n*Ejemplo:* `!connect4 @usuario`'
      });
      return;
    }

    const opponent = mentions[0];
    const cleanOpponent = opponent.split(':')[0].split('@')[0];

    if (cleanOpponent === cleanSender) {
      await sock.sendMessage(remoteJid, { text: '🤦‍♂️ No puedes jugar contra ti mismo.' });
      return;
    }

    if (activeGame) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Ya hay una partida activa de Conecta 4 en este chat.'
      });
      return;
    }

    const game = connect4Manager.createGame(remoteJid, sender, opponent);
    const initialBoard = connect4Manager.renderBoard(game.board);

    await sock.sendMessage(remoteJid, {
      text: [
        '🔴🟡 *DESAFÍO: CONECTA 4*',
        '━━━━━━━━━━━━━━━━━━━━',
        `🔴 Jugador 1: @${cleanSender}`,
        `🟡 Jugador 2: @${cleanOpponent}`,
        '━━━━━━━━━━━━━━━━━━━━',
        initialBoard,
        '━━━━━━━━━━━━━━━━━━━━',
        `👉 Turno de: 🔴 @${cleanSender} (Escribe \`!connect4 <1-7>\`)`
      ].join('\n'),
      mentions: [sender, opponent]
    });
  }
};
