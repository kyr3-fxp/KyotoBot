import { createRoleplayCommand } from '../../utils/roleplayFactory.js';

export default createRoleplayCommand({
  name: 'spank',
  aliases: ['azotar', 'castigar'],
  actionKey: 'spank',
  description: 'Aplica un castigo o azote a un miembro.',
  actionText: 'ha castigado con un azote',
  emoji: '💥'
});
