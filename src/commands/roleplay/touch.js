import { createRoleplayCommand } from '../../utils/roleplayFactory.js';

export default createRoleplayCommand({
  name: 'touch',
  aliases: ['manosear', 'tocar'],
  actionKey: 'touch',
  description: 'Toca o manosea a un miembro.',
  actionText: 'ha tocado y acariciado con audacia',
  emoji: '✋'
});
