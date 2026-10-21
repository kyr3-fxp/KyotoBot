import { createRoleplayCommand } from '../../utils/roleplayFactory.js';

export default createRoleplayCommand({
  name: 'kiss',
  aliases: ['besar', 'beso'],
  actionKey: 'kiss',
  description: 'Le da un tierno beso al usuario mencionado.',
  actionText: 'le ha dado un tierno beso',
  emoji: '💋',
  isNsfw: false
});
