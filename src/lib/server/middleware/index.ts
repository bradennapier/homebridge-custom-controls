import type { MiddlewareRouteConfig, RouteConfig } from '../types';

import prepareMiddleware from './prepare';

const middlewares = [
  /**
   * Basic preprations for all routes such as response headers
   */
  prepareMiddleware,
] as const;

export async function handleMiddleware(route: MiddlewareRouteConfig) {
  const finalizedRoute = await middlewares.reduce(async (routePromise, fn) => {
    return routePromise.then((nextConfig) => fn(nextConfig));
  }, Promise.resolve(route));

  // perhaps add validations here and type guarding instead
  return finalizedRoute as RouteConfig;
}
