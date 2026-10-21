import { createRoleplayCommand } from '../../utils/roleplayFactory.js';

export default createRoleplayCommand({
  name: 'bite',
  aliases: ['morder'],
  actionKey: 'bite',
  description: 'Le da una mordida sugerente al usuario etiquetado.',
  actionText: 'le ha dado una mordida sugerente y excitante',
  emoji: '👄'
});
