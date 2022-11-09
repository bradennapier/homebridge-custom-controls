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
  // eslint-disable-next-line prettier/prettier
} as RouteMapProtocol;

debugRoutes.on[ROUTE_METADATA] = {
  description: 'Turn on Debug HAP Logging',
};

/**
 * /hap/{...params}
 */
export const hap = {
  debug: debugRoutes,
} as const;
