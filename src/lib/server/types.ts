import type http from 'http';
import type { Platform } from '../helpers';
import type { ROUTE_METADATA } from './constants';

export interface RouteConfigProtocol {
  platform: Platform;
  request: http.IncomingMessage;
  response: http.ServerResponse;
  params?: undefined | string[];
  url?: undefined | URL;
  context?: undefined | Record<string, unknown>;
}

export interface InitialRouteConfig extends RouteConfigProtocol {
  url?: undefined;
  params?: undefined;
  context?: undefined;
}

export interface MiddlewareRouteConfig extends RouteConfigProtocol {
  url: NonNullable<RouteConfigProtocol['url']>;
  params: NonNullable<RouteConfigProtocol['params']>;
}

/**
 * Represents the route config shape after the middleware parsing has
 * completed and added any additional context to the route.
 *
 * This is the config that the routes themselves will have and should
 * represent the proper types that are expected by the time we actually
 * process a given request.
 */
export interface RouteConfig extends MiddlewareRouteConfig {
  context: NonNullable<RouteConfigProtocol['context']>;
}

export interface RouteResultProtocol {
  statusCode?: http.ServerResponse['statusCode'];
  data?: Record<string | number, unknown>;
}

export interface RouteResult extends RouteResultProtocol {
  statusCode: http.ServerResponse['statusCode'];
}

export type RouterResult = Promise<void | RouteResultProtocol>;

export type RouteMetadata = {
  endpoint?: string;
  description?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: {
    [key: string]: {
      description?: string;
      required?: boolean;
      type: 'string' | 'number' | 'boolean' | `enum<${string}>`;
    };
  };
};

export type RouteMapProtocolValue =
  | RouteMapProtocol
  | (((route: RouteConfig) => RouterResult) & {
      [ROUTE_METADATA]?: RouteMetadata;
    });

/**
 * A path that leads to routes based on params in the URL,
 * returns a promise of what should be returned to the
 * user.
 */
export type RouteMapProtocol = {
  readonly [key: string]: RouteMapProtocolValue;
};
