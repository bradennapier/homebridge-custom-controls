import type { RouteResult, RouteConfigProtocol } from './types';

function APIError(
  message: string,
  context: Omit<RouteResult, 'data'>,
): RouteResult {
  return {
    ...context,
    data: {
      error: message,
    },
  };
}

export const APIErrors = {
  InternalServerError(route: RouteConfigProtocol, error?: unknown) {
    const {
      platform: { log },
    } = route;
    log.error('Internal Server Error', route, error);

    return APIError('Internal Server Error', {
      statusCode: 500,
    });
  },
  RouteNotFound: ({ url }: RouteConfigProtocol) =>
    APIError(`Route not found: ${url ?? '/'}`, {
      statusCode: 404,
    }),
} as const;
