import type { MiddlewareRouteConfig } from '../types';

export default async function prepareMiddleware(
  route: MiddlewareRouteConfig,
): Promise<MiddlewareRouteConfig> {
  const { response } = route;

  response.setHeader('Content-Type', 'application/json');

  return {
    ...route,
    context: {},
  };
}
