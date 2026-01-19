/**
 * Universal Api Client
 * Author: Laurentiu Gingioveanu
 * Email: laurentiu@eagertowork.ro
 * GitHub: https://github.com/glaurentiu
 * Twitter: @eager_to_work
 * License: MIT
 *
 * Convenience helpers and utilities for the universal API client
 */

import { APIClient } from './client';
import { ClientConfig, RequestConfig, ApiResponse } from './types';

/**
 * Quick request helper for one-off requests without creating a client instance
 */
export async function request<T = any>(
  url: string,
  config: RequestConfig & { clientConfig?: ClientConfig } = {}
): Promise<ApiResponse<T>> {
  const { clientConfig, ...requestConfig } = config;

  const client = new APIClient(clientConfig);
  return client.request<T>({ url, ...requestConfig });
}

/**
 * Creates a configured client instance with sensible defaults
 */
export function createClient(config: ClientConfig = {}): APIClient {
  const defaultConfig: ClientConfig = {
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    retryStrategy: 'exponential',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Universal-API-Client/1.0.0',
    },
    cache: {
      enabled: false,
      ttl: 300000, // 5 minutes
      maxSize: 100,
    },
    ...config,
  };

  return new APIClient(defaultConfig);
}

/**
 * Creates a client pre-configured for REST APIs
 */
export function createRestClient(baseURL: string, config: ClientConfig = {}): APIClient {
  return createClient({
    baseURL,
    ...config,
  });
}

/**
 * Creates a client pre-configured for GraphQL APIs
 */
export function createGraphQLClient(endpoint: string, config: ClientConfig = {}): APIClient {
  return createClient({
    baseURL: endpoint.replace(/\/graphql.*$/, ''), // Extract base URL from GraphQL endpoint
    ...config,
  });
}

/**
 * Middleware system for request/response interceptors
 */
export interface Middleware {
  name: string;
  request?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  response?: (response: ApiResponse) => ApiResponse | Promise<ApiResponse>;
  error?: (error: any) => any;
}

/**
 * Extended client with middleware support
 */
export class MiddlewareClient extends APIClient {
  private middlewares: Middleware[] = [];

  constructor(config: ClientConfig = {}) {
    super(config);
  }

  /**
   * Adds middleware to the client
   */
  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * Removes middleware by name
   */
  remove(name: string): void {
    this.middlewares = this.middlewares.filter(m => m.name !== name);
  }

  /**
   * Clears all middlewares
   */
  clearMiddlewares(): void {
    this.middlewares = [];
  }

  /**
   * Overrides the request method to apply middlewares
   */
  async request<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
    // Apply request middlewares
    let processedConfig = config;
    for (const middleware of this.middlewares) {
      if (middleware.request) {
        processedConfig = await middleware.request(processedConfig);
      }
    }

    try {
      // Make the request
      const response = await super.request<T>(processedConfig);

      // Apply response middlewares
      let processedResponse = response;
      for (const middleware of this.middlewares) {
        if (middleware.response) {
          processedResponse = await middleware.response(processedResponse);
        }
      }

      return processedResponse;
    } catch (error) {
      // Apply error middlewares
      let processedError = error;
      for (const middleware of this.middlewares) {
        if (middleware.error) {
          processedError = middleware.error(processedError);
        }
      }
      throw processedError;
    }
  }
}

/**
 * Common middleware presets
 */

// Logging middleware
export const loggingMiddleware: Middleware = {
  name: 'logging',
  request: (config) => {
    console.log(`[API Request] ${config.method} ${config.url}`);
    return config;
  },
  response: (response) => {
    console.log(`[API Response] ${response.status} ${response.config.method} ${response.config.url} (${response.duration}ms)`);
    return response;
  },
  error: (error) => {
    console.error(`[API Error] ${error.message}`, error);
    return error;
  },
};

// Authentication middleware
export function authMiddleware(token: string, type: 'Bearer' | 'Basic' | 'Token' = 'Bearer'): Middleware {
  return {
    name: 'auth',
    request: (config) => {
      return {
        ...config,
        headers: {
          ...config.headers,
          Authorization: `${type} ${token}`,
        },
      };
    },
  };
}

// Request ID middleware
export const requestIdMiddleware: Middleware = {
  name: 'request-id',
  request: (config) => {
    const requestId = Math.random().toString(36).substring(2, 15);
    return {
      ...config,
      headers: {
        ...config.headers,
        'X-Request-ID': requestId,
      },
    };
  },
};

// Retry logging middleware
export const retryLoggingMiddleware: Middleware = {
  name: 'retry-logging',
  error: (error) => {
    if (error.retryable) {
      console.warn(`[API Retry] ${error.message} - will retry`);
    }
    return error;
  },
};

/**
 * Utility functions
 */

/**
 * Sleep/delay utility
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a debounced version of a function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Creates a throttled version of a function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}