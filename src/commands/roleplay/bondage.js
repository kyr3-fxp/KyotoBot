import { createRoleplayCommand } from '../../utils/roleplayFactory.js';

export default createRoleplayCommand({
  name: 'bondage',
  aliases: ['tie', 'atar', 'inmovilizar'],
  actionKey: 'bondage',
  description: 'Ata o inmoviliza al usuario mencionado en un contexto de rol.',
  actionText: 'ha atado e inmovilizado en la cama',
  emoji: '⛓️'
});
