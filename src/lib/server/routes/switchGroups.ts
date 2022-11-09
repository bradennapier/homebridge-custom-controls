import handleSwitchGroups from '../../controllers/switch-groups';
import type { RouteConfig, RouteResultProtocol } from '../types';

async function resetSwitchGroup({
  platform,
}: RouteConfig): Promise<RouteResultProtocol> {
  const { log } = platform;

  log.warn('Resetting Switch Groups');
  await handleSwitchGroups(platform);

  return {
    statusCode: 204,
  };
}

/**
 * /switchGroups/{...params}
 */
export const switchGroups = {
  reset: resetSwitchGroup,
} as const;
