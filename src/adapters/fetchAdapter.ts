/**
 * Universal Api Client
 * Author: Laurentiu Gingioveanu
 * Email: laurentiu@eagertowork.ro
 * GitHub: https://github.com/glaurentiu
 * Twitter: @eager_to_work
 * License: MIT
 *
 * Fetch adapter implementation for the universal API client
 */

import { HttpAdapter, RequestConfig, ApiResponse, ApiError } from '../types';
import { normalizeError } from '../errors';

export class FetchAdapter implements HttpAdapter {
  /**
   * Makes an HTTP request using the native fetch API
   */
  async request<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
    const startTime = Date.now();

    try {
      // Build the full URL
      const url = this.buildUrl(config);

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method: config.method || 'GET',
        headers: this.buildHeaders(config),
        signal: config.signal,
        credentials: config.withCredentials ? 'include' : 'same-origin',
      };

      // Add request body for non-GET methods
      if (config.data && config.method !== 'GET') {
        if (config.data instanceof FormData) {
          fetchOptions.body = config.data;
        } else if (config.data instanceof URLSearchParams) {
          fetchOptions.body = config.data.toString();
          (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/x-www-form-urlencoded';
        } else if (typeof config.data === 'string') {
          fetchOptions.body = config.data;
          if (!(fetchOptions.headers as Record<string, string>)['Content-Type']) {
            (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
          }
        } else {
          fetchOptions.body = JSON.stringify(config.data);
          if (!(fetchOptions.headers as Record<string, string>)['Content-Type']) {
            (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
          }
        }
      }

      // Add timeout using AbortController
      let timeoutId: NodeJS.Timeout | undefined;
      if (config.timeout && config.timeout > 0) {
        const controller = new AbortController();
        if (fetchOptions.signal) {
          // If there's already a signal, we need to combine them
          fetchOptions.signal.addEventListener('abort', () => controller.abort());
        } else {
          fetchOptions.signal = controller.signal;
        }

        timeoutId = setTimeout(() => {
          controller.abort();
        }, config.timeout);
      }

      // Make the request
      const response = await fetch(url, fetchOptions);

      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Parse response headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      // Handle different response types
      let data: T;
      const responseType = config.responseType || 'json';

      try {
        switch (responseType) {
          case 'json':
            data = await response.json();
            break;
          case 'text':
            data = await response.text() as T;
            break;
          case 'blob':
            data = await response.blob() as T;
            break;
          case 'arrayBuffer':
            data = await response.arrayBuffer() as T;
            break;
          case 'formData':
            data = await response.formData() as T;
            break;
          default:
            data = await response.json();
        }
      } catch (parseError) {
        // If JSON parsing fails, try to get text
        try {
          data = await response.text() as T;
        } catch {
          data = null as T;
        }
      }

      const apiResponse: ApiResponse<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers,
        config,
        duration: Date.now() - startTime,
      };

      // Throw error for non-2xx responses
      if (!response.ok) {
        throw normalizeError({
          message: response.statusText || `HTTP ${response.status}`,
          response: apiResponse,
          status: response.status,
        });
      }

      return apiResponse;

    } catch (error) {
      // Normalize all errors using universal-error-normalizer
      throw normalizeError(error);
    }
  }

  /**
   * Builds the full URL from config
   */
  private buildUrl(config: RequestConfig): string {
    let url = config.url || '';

    // Add query parameters
    if (config.params) {
      const searchParams = new URLSearchParams();

      Object.entries(config.params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, String(value));
        }
      });

      const paramString = searchParams.toString();
      if (paramString) {
        url += (url.includes('?') ? '&' : '?') + paramString;
      }
    }

    return url;
  }

  /**
   * Builds headers from config
   */
  private buildHeaders(config: RequestConfig): Record<string, string> {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }
}

// Export singleton instance
export const fetchAdapter = new FetchAdapter();