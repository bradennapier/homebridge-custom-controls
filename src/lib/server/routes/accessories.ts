import { ROUTE_METADATA } from '../constants';
import type { RouteConfig, RouteMetadata } from '../types';

async function removeAllAccessories({ platform }: RouteConfig) {
  const { log } = platform;

  log.warn('Removing all accessories due to http request');
  platform.removeAllAccessories();
}

// TODO: convert to satisfies RouteMetadata
removeAllAccessories[ROUTE_METADATA] = {
  method: 'GET',
  description: 'Remove all accessories currently configured',
} as RouteMetadata;

/**
 * /accessories/{...params}
 */
export const accessories = {
  removeAll: removeAllAccessories,
} as const;
