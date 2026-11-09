export default {
  name: 'help',
  aliases: ['menu', 'comandos', 'ayuda'],
  description: 'Muestra la lista de comandos disponibles organizados por categorías o detalles de uno en particular.',
  usage: '!help [comando opcional]',
  category: 'general',
  async execute({ sock, remoteJid, args, commands, prefix }) {
    if (args.length > 0) {
      const query = args[0].toLowerCase();
      const cmd = commands.get(query);

      if (!cmd) {
        await sock.sendMessage(remoteJid, {
          text: `❌ No se encontró el comando *${query}*. Usa *${prefix}help* para ver la lista completa.`
        });
        return;
      }

      const detail = [
        `📖 *Detalle del comando: ${cmd.name}*`,
        '━━━━━━━━━━━━━━━━━━━━',
        `📌 *Descripción:* ${cmd.description || 'Sin descripción'}`,
        `💡 *Uso:* \`${cmd.usage || `${prefix}${cmd.name}`}\``,
        cmd.category ? `🏷️ *Categoría:* ${cmd.category.toUpperCase()}` : '',
        cmd.aliases && cmd.aliases.length > 0
          ? `🔄 *Alias:* ${cmd.aliases.map(a => `\`${prefix}${a}\``).join(', ')}`
          : ''
      ].filter(Boolean).join('\n');

      await sock.sendMessage(remoteJid, { text: detail });
      return;
    }

    // Agrupar comandos por categoría
    const categories = {
      economy: { title: '🎮 *Juegos y Economía*', list: [] },
      media: { title: '🛠️ *Utilidades y Multimedia*', list: [] },
      admin: { title: '👑 *Administración de Grupos*', list: [] },
      nsfw: { title: '🔞 *Contenido NSFW +18*', list: [] },
      roleplay: { title: '🔥 *Interacción y Rol +18*', list: [] },
      interaction: { title: '✨ *Interacción Social*', list: [] },
      general: { title: '⚙️ *Generales e Información*', list: [] }
    };

    const uniqueCommands = Array.from(new Set(commands.values()));

    for (const cmd of uniqueCommands) {
      const cat = cmd.category || 'general';
      const targetCat = categories[cat] || categories.general;
      const description = cmd.name === 'cl' ? '' : `: ${cmd.description}`;
      targetCat.list.push(`• \`${prefix}${cmd.name}\`${description}`);
    }

    const sections = [];
    for (const key of Object.keys(categories)) {
      const cat = categories[key];
      if (cat.list.length > 0) {
        sections.push(`${cat.title}\n${cat.list.join('\n')}`);
      }
    }

    const menu = [
      '🤖 *MENÚ PRINCIPAL (KyotoBot)* 🤖',
      '━━━━━━━━━━━━━━━━━━━━━━━━━',
      sections.join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'),
      '━━━━━━━━━━━━━━━━━━━━━━━━━',
      `ℹ️ Escribe *${prefix}help <comando>* para ver el uso detallado de cualquier comando.`
    ].join('\n');

    await sock.sendMessage(remoteJid, { text: menu });
  }
};
