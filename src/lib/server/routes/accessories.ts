import { ROUTE_METADATA } from '../constants';
import type { RouteConfig, RouteMetadata } from '../types';

async function removeAllAccessories({ platform }: RouteConfig) {
  const { log, removeAllAccessories } = platform;

  log.warn('Removing all accessories due to http request');
  removeAllAccessories();
}

removeAllAccessories[ROUTE_METADATA] = {
  method: 'GET',
  description: 'Remove all accessories currently configured',
} as RouteMetadata;

/**
 * /switchGroups/{...params}
 */
export const accessories = {
  removeAll: removeAllAccessories,
} as const;
