import { createRoleplayCommand } from '../../utils/roleplayFactory.js';

export default createRoleplayCommand({
  name: 'pat',
  aliases: ['acariciar', 'palmaditas'],
  actionKey: 'pat',
  description: 'Acaricia suavemente la cabeza del usuario mencionado.',
  actionText: 'ha acariciado con ternura a',
  emoji: '💆‍♂️',
  isNsfw: false
});
