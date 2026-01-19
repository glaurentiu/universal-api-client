/**
 * Universal Api Client
 * Author: Laurentiu Gingioveanu
 * Email: laurentiu@eagertowork.ro
 * GitHub: https://github.com/glaurentiu
 * Twitter: @eager_to_work
 * License: MIT
 *
 * @packageDocumentation
 */

// Core client and types
export { APIClient } from './client';
export type {
  ClientConfig,
  RequestConfig,
  ApiResponse,
  ApiClientMethods,
  AdapterType,
  HttpAdapter,
  CacheEntry,
  CacheConfig,
  Hooks,
} from './types';

// Error handling
export { normalizeError, createError, throwError, isRetryableError, isRetryableStatus } from './errors';
export type { ApiError, ErrorType } from './types';

// Adapters
export { FetchAdapter, fetchAdapter } from './adapters/fetchAdapter';
export { AxiosAdapter, axiosAdapter } from './adapters/axiosAdapter';

// GraphQL support
export {
  graphqlQuery,
  graphqlQueryHelper,
  graphqlMutation,
  validateGraphQLQuery,
  extractOperationName,
  GraphQLClient,
} from './graphql';
export type {
  GraphQLRequest,
  GraphQLResponse,
  GraphQLError,
  GraphQLOptions,
} from './graphql';

// Pagination support
export {
  PaginatedIterator,
  paginate,
  PaginationPresets,
} from './pagination';
export type {
  PaginationConfig,
  PaginatedResponse,
  PageInfo,
  PaginationStrategy,
  PaginationOptions,
} from './pagination';

// Convenience helpers and utilities
export {
  request,
  createClient,
  createRestClient,
  createGraphQLClient,
  MiddlewareClient,
  loggingMiddleware,
  authMiddleware,
  requestIdMiddleware,
  retryLoggingMiddleware,
  delay,
  debounce,
  throttle,
} from './helpers';
export type { Middleware } from './helpers';

// Re-export all types for convenience
export type {
  HttpMethod,
  BackoffStrategy,
  RequestData,
  ResponseData,
} from './types';