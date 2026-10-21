import { createRoleplayCommand } from '../../utils/roleplayFactory.js';

export default createRoleplayCommand({
  name: 'hug',
  aliases: ['abrazar', 'abrazo'],
  actionKey: 'hug',
  description: 'Le da un cálido y cariñoso abrazo al usuario mencionado.',
  actionText: 'le ha dado un cálido abrazo',
  emoji: '🫂',
  isNsfw: false
});
