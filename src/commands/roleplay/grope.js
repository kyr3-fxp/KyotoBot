import { createRoleplayCommand } from '../../utils/roleplayFactory.js';

export default createRoleplayCommand({
  name: 'grope',
  aliases: ['agarrar', 'manoseada'],
  actionKey: 'grope',
  description: 'Agarra o manosea de forma impulsiva a otro integrante.',
  actionText: 'ha agarrado impulsivamente las zonas prohibidas de',
  emoji: '😈'
});
