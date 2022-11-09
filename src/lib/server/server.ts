import http from 'http';

import type { Platform } from '../helpers';
import type {
  RouteConfig,
  RouteMapProtocol,
  RouteResult,
  RouterResult,
} from './types';

import { APIErrors } from './errors';
import { handleMiddleware } from './middleware';
import * as routes from './routes';
import { getRouteConfig, getRPCSupportedRoutes, isAPIError } from './utils';

async function handleRoute(
  route: RouteConfig,
  router: RouteMapProtocol = routes,
): RouterResult {
  const {
    params: [param, ...params],
    ...context
  } = route;

  if (param in router) {
    const next = router[param];

    const nextRoute = {
      ...context,
      params,
    } as const;

    return typeof next === 'function'
      ? await next(nextRoute)
      : handleRoute(nextRoute, next);
  }

  throw APIErrors.RouteNotFound(route);
}

async function parseRoutePath(requestRoute: RouteConfig) {
  const routeResult = (await handleRoute(requestRoute)) ?? {
    statusCode: 204,
  };

  return typeof routeResult.statusCode === 'number'
    ? (routeResult as RouteResult)
    : {
        ...routeResult,
        statusCode: routeResult.data ? 200 : 204,
      };
}

async function handleRequest(
  platform: Platform,
  request: http.IncomingMessage,
  response: http.ServerResponse,
) {
  let result: RouteResult;

  const initialRoute = getRouteConfig({
    platform,
    request,
    response,
  } as const);

  try {
    // run each middleware in order
    const requestRoute = await handleMiddleware(initialRoute);

    if (requestRoute.params[0] === 'introspect') {
      // special introspection to rturn routes
      result = {
        statusCode: 200,
        data: {
          routes: getRPCSupportedRoutes(),
        },
      };
    } else {
      result = await parseRoutePath(requestRoute);
    }
  } catch (error) {
    if (isAPIError(error)) {
      result = error;
    } else {
      result = APIErrors.InternalServerError(initialRoute, error);
    }
  }

  response.writeHead(result.statusCode);
  response.end(result.data ? JSON.stringify(result.data) : undefined);
}

export async function createServer(port: number, platform: Platform) {
  const server = http.createServer(handleRequest.bind(null, platform));

  server.listen(port, () =>
    platform.log.info(
      `Http server ${
        server.address ?? 'UNKNOWN_ADDRESS'
      } listening on port: ${port}...`,
    ),
  );
}
