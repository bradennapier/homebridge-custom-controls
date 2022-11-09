import { ROUTE_METADATA } from '../constants';
import type { RouteConfig, RouteMetadata, RouteResultProtocol } from '../types';

async function handleGetPluginContext({
  platform,
}: RouteConfig): Promise<RouteResultProtocol> {
  const { log } = platform;
  log.warn(`Getting Plugin Context`);

  return {
    data: {
      context: [...platform.accessories.values()].map((acc) => acc.context),
    },
  };
}

handleGetPluginContext[ROUTE_METADATA] = {
  method: 'GET',
  description: 'Get all plugin context in memory',
  // eslint-disable-next-line prettier/prettier
} satisfies RouteMetadata;

/**
 * /switchGroups/{...params}
 */
export const context = handleGetPluginContext;
