/**
 * Universal Api Client
 * Author: Laurentiu Gingioveanu
 * Email: laurentiu@eagertowork.ro
 * GitHub: https://github.com/glaurentiu
 * Twitter: @eager_to_work
 * License: MIT
 *
 * Axios adapter implementation for the universal API client
 */

import { HttpAdapter, RequestConfig, ApiResponse, ApiError } from '../types';
import { normalizeError } from '../errors';

// Dynamic import to make axios optional
let axios: any = null;

async function loadAxios() {
  if (!axios) {
    try {
      axios = (await import('axios')).default;
    } catch (error) {
      throw new Error('Axios is not installed. Please install it with: npm install axios');
    }
  }
  return axios;
}

export class AxiosAdapter implements HttpAdapter {
  /**
   * Makes an HTTP request using Axios
   */
  async request<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
    const axiosInstance = await loadAxios();
    const startTime = Date.now();

    try {
      // Prepare axios config
      const axiosConfig: any = {
        method: config.method || 'GET',
        url: config.url,
        headers: this.buildHeaders(config),
        timeout: config.timeout,
        withCredentials: config.withCredentials,
        responseType: config.responseType || 'json',
        cancelToken: config.signal ? new axios.CancelToken((cancel: any) => {
          config.signal?.addEventListener('abort', () => cancel('Request cancelled'));
        }) : undefined,
      };

      // Add request data
      if (config.data && config.method !== 'GET') {
        axiosConfig.data = config.data;
      }

      // Add query parameters
      if (config.params) {
        axiosConfig.params = config.params;
      }

      // Make the request
      const response = await axiosInstance(axiosConfig);

      const apiResponse: ApiResponse<T> = {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        config,
        duration: Date.now() - startTime,
      };

      return apiResponse;

    } catch (error: any) {
      // Normalize all errors using universal-error-normalizer
      throw normalizeError(error);
    }
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
export const axiosAdapter = new AxiosAdapter();