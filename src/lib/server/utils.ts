import path from 'path';
import { APIErrors } from './errors';
import type {
  InitialRouteConfig,
  MiddlewareRouteConfig,
  RouteMapProtocol,
  RouteMetadata,
  RouteResult,
} from './types';
import * as routes from './routes';
import { ROUTE_METADATA } from './constants';

let memoizedRoutes: undefined | RouteMetadata[];

/**
 * Parses the routes from the imported routes and returns an array
 * of paths that the RPC supports.
 *
 * @param path
 * @param childRoutes
 */
export function getRPCSupportedRoutes(
  path: string[] = [],
  childRoutes: RouteMapProtocol = routes,
  ignoreMemoized = false,
) {
  if (memoizedRoutes && !ignoreMemoized) {
    return memoizedRoutes;
  }

  const entries = Object.entries(childRoutes);

  const activeRpcRoutes = entries.reduce(
    (availableRoutes, [param, nextRoute]) => {
      if (typeof nextRoute === 'function') {
        const routePath = [...path, param].join('/');
        const metadata = nextRoute[ROUTE_METADATA] ?? {};
        const { method = 'GET' } = metadata;
        delete metadata.method;
        delete metadata.endpoint;

        const endpoint = `/${routePath}`;
        availableRoutes.push({
          endpoint,
          method,
          ...metadata,
        });
      } else {
        availableRoutes.push(
          ...getRPCSupportedRoutes([...path, param], nextRoute, true),
        );
      }

      return availableRoutes;
    },
    [] as RouteMetadata[],
  );

  memoizedRoutes = activeRpcRoutes;

  return memoizedRoutes;
}

export function getRouteConfig(
  initialRoute: InitialRouteConfig,
): MiddlewareRouteConfig {
  const { platform, request, response } = initialRoute;

  if (!request.url) {
    platform.log.warn('No Url found for handleRequest');
    throw APIErrors.RouteNotFound(initialRoute);
  }

  const { headers } = request;

  const url = new URL(request.url, `http://${headers.host}`);
  const params = url.pathname.substring(1).split(path.sep);

  return {
    url,
    params,
    platform,
    request,
    response,
  } as const;
}

export function isAPIError(error: unknown): error is RouteResult {
  return (
    !!error &&
    typeof error === 'object' &&
    'statusCode' in error &&
    typeof (error as RouteResult).statusCode === 'number'
  );
}
