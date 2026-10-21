import { tttManager } from '../../games/ttt.js';

export default {
  name: 'ttt',
  aliases: ['tictactoe', 'gato'],
  description: 'Inicia o continúa una partida interactiva de Tres en Raya (Gato).',
  usage: '!ttt @usuario | !ttt <1-9> | !ttt surrender',
  category: 'economy',
  async execute({ sock, remoteJid, sender, cleanSender, mentions, args }) {
    const activeGame = tttManager.getGame(remoteJid);

    // Cancelar/rendirse
    if (args[0] === 'surrender' || args[0] === 'rendirse') {
      if (!activeGame) {
        await sock.sendMessage(remoteJid, { text: '⚠️ No hay ninguna partida en curso.' });
        return;
      }
      if (activeGame.playerX !== sender && activeGame.playerO !== sender) {
        await sock.sendMessage(remoteJid, { text: '⚠️ No eres participante de la partida actual.' });
        return;
      }
      tttManager.endGame(remoteJid);
      await sock.sendMessage(remoteJid, {
        text: `🏳️ @${cleanSender} se ha rendido. Partida de Tres en Raya finalizada.`,
        mentions: [sender]
      });
      return;
    }

    // Si ya hay partida y se envía un número del 1 al 9: hacer movimiento
    if (activeGame && !isNaN(parseInt(args[0], 10))) {
      const position = parseInt(args[0], 10);
      const move = tttManager.makeMove(remoteJid, sender, position);

      if (move.error) {
        await sock.sendMessage(remoteJid, { text: move.error });
        return;
      }

      if (move.draw) {
        await sock.sendMessage(remoteJid, {
          text: `🤝 *¡EMPATE EN TRES EN RAYA!*\n\n${move.boardStr}\n\nBuen juego a ambos.`
        });
        return;
      }

      if (move.winner) {
        const cleanWinner = move.winner.split(':')[0].split('@')[0];
        await sock.sendMessage(remoteJid, {
          text: `🎉 *¡VICTORIA!* @${cleanWinner} ha ganado la partida de Tres en Raya! 🏆\n\n${move.boardStr}`,
          mentions: [move.winner]
        });
        return;
      }

      const cleanNext = move.nextTurn.split(':')[0].split('@')[0];
      await sock.sendMessage(remoteJid, {
        text: `🎮 *TRES EN RAYA*\n\n${move.boardStr}\n\n👉 Turno de: @${cleanNext} (Escribe \`!ttt <1-9>\`)`,
        mentions: [move.nextTurn]
      });
      return;
    }

    // Iniciar nueva partida
    if (!mentions || mentions.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: activeGame
          ? '⚠️ Ya hay una partida en curso. Usa `!ttt <1-9>` para jugar o `!ttt surrender` para terminarla.'
          : '⚠️ Para iniciar una partida, debes desafiar a alguien:\n*Ejemplo:* `!ttt @usuario`'
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
        text: '⚠️ Ya hay una partida activa en este chat. Usa `!ttt surrender` si desean cancelarla.'
      });
      return;
    }

    const game = tttManager.createGame(remoteJid, sender, opponent);
    const initialBoard = tttManager.renderBoard(game.board);

    await sock.sendMessage(remoteJid, {
      text: [
        '⚔️ *DESAFÍO: TRES EN RAYA*',
        '━━━━━━━━━━━━━━━━━━━━',
        `❌ Jugador X: @${cleanSender}`,
        `⭕ Jugador O: @${cleanOpponent}`,
        '━━━━━━━━━━━━━━━━━━━━',
        initialBoard,
        '━━━━━━━━━━━━━━━━━━━━',
        `👉 Turno de: @${cleanSender} (Escribe \`!ttt <1-9>\`)`
      ].join('\n'),
      mentions: [sender, opponent]
    });
  }
};
