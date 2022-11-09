import debug from 'debug';
import { ROUTE_METADATA } from '../constants';

import type { RouteConfig, RouteMapProtocol } from '../types';

async function handleHapDebug(state: boolean, { platform }: RouteConfig) {
  const { log } = platform;
  log.warn(`${state ? 'Starting' : 'Stopping'} Debug Logging for HAP-NodeJS`);

  if (state) {
    debug.enable('HAP-NodeJS:*');
  } else {
    debug.disable();
  }
}

const debugRoutes = {
  on: (route) => handleHapDebug(true, route),
  off: (route) => handleHapDebug(false, route),
} as RouteMapProtocol;

debugRoutes.on[ROUTE_METADATA] = {
  method: 'GET',
  description: 'Turn ON HAP Debug Logging',
};

debugRoutes.off[ROUTE_METADATA] = {
  method: 'GET',
  description: 'Turn OFF HAP Debug Logging',
};

/**
 * /hap/{...params}
 */
export const hap = {
  debug: debugRoutes,
} as const;
