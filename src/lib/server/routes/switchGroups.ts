import handleSwitchGroups from '../../controllers/switch-groups';
import { ROUTE_METADATA } from '../constants';
import type { RouteMetadata, RouteConfig, RouteResultProtocol } from '../types';

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

resetSwitchGroup[ROUTE_METADATA] = {
  method: 'GET',
  description: 'Reset Switch Groups by reloading them from config',
} as RouteMetadata;

/**
 * /switchGroups/{...params}
 */
export const switchGroups = {
  reset: resetSwitchGroup,
} as const;
