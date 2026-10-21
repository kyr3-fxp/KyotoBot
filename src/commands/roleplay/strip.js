import { createRoleplayCommand } from '../../utils/roleplayFactory.js';

export default createRoleplayCommand({
  name: 'strip',
  aliases: ['desvestir', 'quitarropa'],
  actionKey: 'strip',
  description: 'Le quita o despoja una prenda a la persona etiquetada.',
  actionText: 'le ha quitado una prenda seductoramente',
  emoji: '👗'
});
