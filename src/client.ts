/**
 * Universal Api Client
 * Author: Laurentiu Gingioveanu
 * Email: laurentiu@eagertowork.ro
 * GitHub: https://github.com/glaurentiu
 * Twitter: @eager_to_work
 * License: MIT
 *
 * Core API Client implementation with retry logic, caching, and adapter support
 */

import {
  ClientConfig,
  RequestConfig,
  ApiResponse,
  ApiClientMethods,
  AdapterType,
  HttpAdapter,
  CacheEntry,
  BackoffStrategy,
  ApiError,
} from './types';
import { fetchAdapter } from './adapters/fetchAdapter';
import { axiosAdapter } from './adapters/axiosAdapter';
import { normalizeError, isRetryableError } from './errors';

export class APIClient implements ApiClientMethods {
  private config: ClientConfig;
  private adapters: Record<AdapterType, HttpAdapter>;
  private cache: Map<string, CacheEntry> = new Map();

  constructor(config: ClientConfig = {}) {
    this.config = {
      timeout: 30000, // 30 seconds
      adapter: 'fetch',
      retries: 3,
      retryDelay: 1000, // 1 second
      retryStrategy: 'exponential',
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      headers: {
        'User-Agent': 'Universal-API-Client/1.0.0',
      },
      ...config,
    };

    this.adapters = {
      fetch: fetchAdapter,
      axios: axiosAdapter,
    };
  }

  /**
   * Updates the client configuration
   */
  updateConfig(config: Partial<ClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Makes an HTTP request with retry logic and error handling
   */
  async request<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
    // Merge client config with request config
    const mergedConfig = this.mergeConfigs(config);

    // Generate cache key for GET requests
    const cacheKey = this.getCacheKey(mergedConfig);

    // Check cache for GET requests
    if (mergedConfig.method === 'GET' && this.config.cache?.enabled && cacheKey) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Execute hooks
    await this.executeHook('beforeRequest', mergedConfig);

    try {
      // Execute request with retry logic
      const response = await this.executeWithRetry<T>(mergedConfig);

      // Cache successful GET responses
      if (mergedConfig.method === 'GET' && this.config.cache?.enabled && cacheKey) {
        this.setCache(cacheKey, response);
      }

      // Execute after response hook
      await this.executeHook('afterResponse', response);

      return response;
    } catch (error) {
      // Execute error hook
      await this.executeHook('onError', error as ApiError);

      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config: Omit<RequestConfig, 'method' | 'url'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, config: Omit<RequestConfig, 'method' | 'url' | 'data'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, config: Omit<RequestConfig, 'method' | 'url' | 'data'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, config: Omit<RequestConfig, 'method' | 'url' | 'data'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config: Omit<RequestConfig, 'method' | 'url'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  /**
   * HEAD request
   */
  async head<T = any>(url: string, config: Omit<RequestConfig, 'method' | 'url'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'HEAD', url });
  }

  /**
   * OPTIONS request
   */
  async options<T = any>(url: string, config: Omit<RequestConfig, 'method' | 'url'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'OPTIONS', url });
  }

  /**
   * Clears the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Merges client configuration with request configuration
   */
  private mergeConfigs(requestConfig: RequestConfig): RequestConfig {
    const merged: RequestConfig = {
      ...this.config,
      ...requestConfig,
      headers: {
        ...this.config.headers,
        ...requestConfig.headers,
      },
    };

    // Build full URL if baseURL is provided
    if (this.config.baseURL && requestConfig.url) {
      merged.url = this.buildUrl(requestConfig.url);
    }

    return merged;
  }

  /**
   * Builds full URL from baseURL and path
   */
  private buildUrl(path: string): string {
    const baseURL = this.config.baseURL!.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${baseURL}/${cleanPath}`;
  }

  /**
   * Executes a request with retry logic
   */
  private async executeWithRetry<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const maxRetries = config.retries ?? this.config.retries ?? 0;
    let lastError: ApiError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const adapter = this.adapters[config.adapter || this.config.adapter || 'fetch'];
        return await adapter.request<T>(config);
      } catch (error) {
        lastError = error as ApiError;

        // Don't retry if this is the last attempt or error is not retryable
        if (attempt === maxRetries || !this.shouldRetry(lastError, config)) {
          throw lastError;
        }

        // Calculate delay and wait
        const delay = this.calculateRetryDelay(attempt, config);
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Determines if a request should be retried
   */
  private shouldRetry(error: ApiError, config: RequestConfig): boolean {
    // Check if error is retryable
    if (!error.retryable) {
      return false;
    }

    // Check custom retryable status codes
    const retryableCodes = config.retryableStatusCodes ?? this.config.retryableStatusCodes ?? [];
    if (error.status && retryableCodes.includes(error.status)) {
      return true;
    }

    // Use default retry logic
    return isRetryableError(error);
  }

  /**
   * Calculates retry delay based on strategy
   */
  private calculateRetryDelay(attempt: number, config: RequestConfig): number {
    const strategy = config.retryStrategy ?? this.config.retryStrategy ?? 'exponential';
    const baseDelay = config.retryDelay ?? this.config.retryDelay ?? 1000;

    switch (strategy) {
      case 'immediate':
        return 0;
      case 'fixed':
        return baseDelay;
      case 'exponential':
      default:
        // Exponential backoff with jitter
        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 0.1 * exponentialDelay;
        return exponentialDelay + jitter;
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generates a cache key for requests
   */
  private getCacheKey(config: RequestConfig): string | null {
    if (config.method !== 'GET') {
      return null;
    }

    // Create a deterministic key from URL and params
    const url = config.url || '';
    const params = config.params ? JSON.stringify(config.params) : '';
    return `${url}${params}`;
  }

  /**
   * Gets a response from cache
   */
  private getFromCache<T>(key: string): ApiResponse<T> | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if entry is expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Sets a response in cache
   */
  private setCache<T>(key: string, response: ApiResponse<T>): void {
    const ttl = this.config.cache?.ttl ?? 300000; // 5 minutes default
    const maxSize = this.config.cache?.maxSize ?? 100;

    // Remove oldest entries if cache is full
    if (this.cache.size >= maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data: response,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Executes a hook if defined
   */
  private async executeHook(hookName: keyof NonNullable<ClientConfig['hooks']>, ...args: any[]): Promise<void> {
    const hook = this.config.hooks?.[hookName];
    if (hook) {
      await (hook as any)(...args);
    }
  }
}