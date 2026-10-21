import { createRoleplayCommand } from '../../utils/roleplayFactory.js';

export default createRoleplayCommand({
  name: 'bed',
  aliases: ['cama', 'alacama'],
  actionKey: 'bed',
  description: 'Arrastra o lleva a la cama a la persona etiquetada.',
  actionText: 'ha llevado directo a la cama',
  emoji: '🛏️'
});
