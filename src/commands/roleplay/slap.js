import { createRoleplayCommand } from '../../utils/roleplayFactory.js';

export default createRoleplayCommand({
  name: 'slap',
  aliases: ['abofetear', 'bofetada'],
  actionKey: 'slap',
  description: 'Le da una bofetada al usuario mencionado.',
  actionText: 'le ha propinado una bofetada',
  emoji: '👋',
  isNsfw: false
});
