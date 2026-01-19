/**
 * Universal Api Client
 * Author: Laurentiu Gingioveanu
 * Email: laurentiu@eagertowork.ro
 * GitHub: https://github.com/glaurentiu
 * Twitter: @eager_to_work
 * License: MIT
 *
 * Async iterator for REST API pagination support
 */

import { APIClient } from './client';
import { PaginationConfig, PaginatedResponse, PageInfo, RequestConfig, ApiResponse } from './types';

export type PaginationStrategy = 'offset' | 'page' | 'cursor' | 'link';

export interface PaginationOptions extends PaginationConfig {
  strategy?: PaginationStrategy;
  initialParams?: Record<string, any>;
}

export type { PaginationConfig, PaginatedResponse, PageInfo } from './types';

/**
 * Async iterator for paginated API responses
 */
export class PaginatedIterator<T = any> implements AsyncIterableIterator<PaginatedResponse<T>> {
  private client: APIClient;
  private baseConfig: RequestConfig;
  private options: PaginationOptions;
  private currentPage: number = 0;
  private hasNextPage: boolean = true;
  private nextPageUrl?: string;
  private nextCursor?: string;

  constructor(
    client: APIClient,
    url: string,
    options: PaginationOptions = {}
  ) {
    this.client = client;
    this.baseConfig = { method: 'GET', url };
    this.options = {
      strategy: 'page',
      pageParam: 'page',
      limitParam: 'limit',
      offsetParam: 'offset',
      totalParam: 'total',
      dataParam: 'data',
      nextPageParam: 'next_page',
      hasNextParam: 'has_next',
      pageSize: 20,
      maxPages: 100,
      ...options,
    };
  }

  /**
   * Async iterator implementation
   */
  async next(): Promise<IteratorResult<PaginatedResponse<T>>> {
    if (!this.hasNextPage || this.currentPage >= (this.options.maxPages || 100)) {
      return { done: true, value: undefined };
    }

    try {
      const response = await this.fetchPage();
      this.currentPage++;

      // Update pagination state based on response
      this.updatePaginationState(response);

      return {
        done: false,
        value: response,
      };
    } catch (error) {
      // Stop iteration on error
      this.hasNextPage = false;
      throw error;
    }
  }

  /**
   * Makes this class async iterable
   */
  [Symbol.asyncIterator](): AsyncIterableIterator<PaginatedResponse<T>> {
    return this;
  }

  /**
   * Fetches all pages and returns them as an array
   */
  async all(): Promise<PaginatedResponse<T>[]> {
    const results: PaginatedResponse<T>[] = [];
    for await (const page of this) {
      results.push(page);
    }
    return results;
  }

  /**
   * Fetches a specific page
   */
  private async fetchPage(): Promise<PaginatedResponse<T>> {
    const config = { ...this.baseConfig };

    // Add pagination parameters based on strategy
    config.params = {
      ...this.options.initialParams,
      ...config.params,
      ...this.getPaginationParams(),
    };

    const response: ApiResponse<any> = await this.client.request(config);

    // Extract data and pagination info from response
    const data = this.extractData(response.data);
    const pageInfo = this.extractPageInfo(response.data, response);

    return {
      data,
      pageInfo,
    };
  }

  /**
   * Gets pagination parameters for the current request
   */
  private getPaginationParams(): Record<string, any> {
    const params: Record<string, any> = {};

    switch (this.options.strategy) {
      case 'page':
        params[this.options.pageParam!] = this.currentPage + 1;
        params[this.options.limitParam!] = this.options.pageSize;
        break;

      case 'offset':
        params[this.options.offsetParam!] = this.currentPage * (this.options.pageSize || 20);
        params[this.options.limitParam!] = this.options.pageSize;
        break;

      case 'cursor':
        if (this.nextCursor) {
          params.cursor = this.nextCursor;
        }
        params[this.options.limitParam!] = this.options.pageSize;
        break;

      case 'link':
        // Link-based pagination uses nextPageUrl, no additional params needed
        break;
    }

    return params;
  }

  /**
   * Extracts data from response based on dataParam
   */
  private extractData(responseData: any): T[] {
    if (!this.options.dataParam) {
      return Array.isArray(responseData) ? responseData : [responseData];
    }

    const data = responseData[this.options.dataParam];
    return Array.isArray(data) ? data : [];
  }

  /**
   * Extracts page info from response
   */
  private extractPageInfo(responseData: any, response: ApiResponse): PageInfo {
    const pageInfo: PageInfo = {
      page: this.currentPage + 1,
      limit: this.options.pageSize || 20,
      hasNext: false,
    };

    // Extract total count
    if (this.options.totalParam && responseData[this.options.totalParam]) {
      pageInfo.total = responseData[this.options.totalParam];
    }

    // Extract hasNext flag
    if (this.options.hasNextParam !== undefined) {
      pageInfo.hasNext = responseData[this.options.hasNextParam] === true;
    }

    // Extract next page info
    if (this.options.nextPageParam && responseData[this.options.nextPageParam]) {
      pageInfo.nextPage = responseData[this.options.nextPageParam];
    }

    // Check for Link header (GitHub-style pagination)
    if (response.headers.link) {
      const nextLink = this.parseLinkHeader(response.headers.link);
      if (nextLink) {
        pageInfo.nextPage = nextLink;
      }
    }

    return pageInfo;
  }

  /**
   * Updates pagination state for next iteration
   */
  private updatePaginationState(response: PaginatedResponse<T>): void {
    const { pageInfo } = response;

    // Update hasNextPage based on pageInfo
    this.hasNextPage = pageInfo.hasNext;

    // Update next page URL/cursor for link/cursor strategies
    if (pageInfo.nextPage) {
      if (this.options.strategy === 'link') {
        this.nextPageUrl = pageInfo.nextPage as string;
      } else if (this.options.strategy === 'cursor') {
        this.nextCursor = pageInfo.nextPage as string;
      }
    }

    // Fallback: check if we got less data than requested page size
    if (!this.hasNextPage && response.data.length < (this.options.pageSize || 20)) {
      this.hasNextPage = false;
    }

    // For page-based pagination, check if we've reached the last page
    if (this.options.strategy === 'page' && pageInfo.total !== undefined) {
      const totalPages = Math.ceil(pageInfo.total / (this.options.pageSize || 20));
      this.hasNextPage = pageInfo.page < totalPages;
    }
  }

  /**
   * Parses Link header for GitHub-style pagination
   */
  private parseLinkHeader(linkHeader: string): string | null {
    const links = linkHeader.split(',');
    for (const link of links) {
      const match = link.match(/<([^>]+)>;\s*rel="next"/);
      if (match) {
        return match[1];
      }
    }
    return null;
  }
}

/**
 * Convenience function to create a paginated iterator
 */
export function paginate<T = any>(
  client: APIClient,
  url: string,
  options: PaginationOptions = {}
): PaginatedIterator<T> {
  return new PaginatedIterator<T>(client, url, options);
}

/**
 * Helper for common pagination patterns
 */
export const PaginationPresets = {
  // GitHub API style (page-based with Link headers)
  github: {
    strategy: 'link' as PaginationStrategy,
    pageSize: 30,
  },

  // Standard page-based pagination
  page: {
    strategy: 'page' as PaginationStrategy,
    pageParam: 'page',
    limitParam: 'per_page',
    totalParam: 'total_count',
    dataParam: 'items',
  },

  // Offset-based pagination
  offset: {
    strategy: 'offset' as PaginationStrategy,
    offsetParam: 'offset',
    limitParam: 'limit',
    totalParam: 'total',
    dataParam: 'results',
  },

  // Cursor-based pagination (GraphQL style)
  cursor: {
    strategy: 'cursor' as PaginationStrategy,
    dataParam: 'edges',
  },
};