/**
 * Universal Api Client
 * Author: Laurentiu Gingioveanu
 * Email: laurentiu@eagertowork.ro
 * GitHub: https://github.com/glaurentiu
 * Twitter: @eager_to_work
 * License: MIT
 *
 * Core type definitions for the universal API client
 */

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

// Adapter types
export type AdapterType = 'fetch' | 'axios';

// Backoff strategies for retries
export type BackoffStrategy = 'immediate' | 'fixed' | 'exponential';

// Error types
export type ErrorType =
  | 'network'
  | 'timeout'
  | 'http'
  | 'graphql'
  | 'auth'
  | 'server'
  | 'client'
  | 'validation'
  | 'unknown';

// Request configuration
export interface RequestConfig<T = any> {
  method?: HttpMethod;
  url?: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: T;
  timeout?: number;
  adapter?: AdapterType;
  retries?: number;
  retryDelay?: number;
  retryStrategy?: BackoffStrategy;
  retryableStatusCodes?: number[];
  signal?: AbortSignal;
  withCredentials?: boolean;
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData';
}

// Client configuration
export interface ClientConfig {
  baseURL?: string;
  timeout?: number;
  adapter?: AdapterType;
  headers?: Record<string, string>;
  retries?: number;
  retryDelay?: number;
  retryStrategy?: BackoffStrategy;
  retryableStatusCodes?: number[];
  withCredentials?: boolean;
  cache?: CacheConfig;
  hooks?: Hooks;
}

// Cache configuration
export interface CacheConfig {
  enabled?: boolean;
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
}

// Logging hooks
export interface Hooks {
  beforeRequest?: (config: RequestConfig) => void | Promise<void>;
  afterResponse?: (response: ApiResponse) => void | Promise<void>;
  onError?: (error: ApiError) => void | Promise<void>;
}

// Normalized error interface
export interface ApiError {
  type: ErrorType;
  message: string;
  status?: number;
  code?: string;
  field?: string;
  details?: any;
  retryable: boolean;
  source: 'client' | 'server' | 'network';
  original?: any; // Original error object
}

// API Response interface
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: RequestConfig;
  duration: number; // Response time in milliseconds
}

// GraphQL specific types
export interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: GraphQLError[];
  extensions?: any;
}

export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: string[];
  extensions?: any;
}

// Pagination types
export interface PaginationConfig {
  pageParam?: string;
  limitParam?: string;
  offsetParam?: string;
  totalParam?: string;
  dataParam?: string;
  nextPageParam?: string;
  hasNextParam?: string;
  pageSize?: number;
  maxPages?: number;
}

export interface PageInfo {
  page: number;
  limit: number;
  total?: number;
  hasNext: boolean;
  nextPage?: string | number;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pageInfo: PageInfo;
}

// Adapter interface
export interface HttpAdapter {
  request<T = any>(config: RequestConfig): Promise<ApiResponse<T>>;
}

// Cache entry
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Utility types
export type RequestData = Record<string, any> | FormData | URLSearchParams | string | null;

export type ResponseData = any;

// Generic API client method signatures
export interface ApiClientMethods {
  get<T = any>(url: string, config?: Omit<RequestConfig, 'method' | 'url'>): Promise<ApiResponse<T>>;
  post<T = any>(url: string, data?: RequestData, config?: Omit<RequestConfig, 'method' | 'url' | 'data'>): Promise<ApiResponse<T>>;
  put<T = any>(url: string, data?: RequestData, config?: Omit<RequestConfig, 'method' | 'url' | 'data'>): Promise<ApiResponse<T>>;
  patch<T = any>(url: string, data?: RequestData, config?: Omit<RequestConfig, 'method' | 'url' | 'data'>): Promise<ApiResponse<T>>;
  delete<T = any>(url: string, config?: Omit<RequestConfig, 'method' | 'url'>): Promise<ApiResponse<T>>;
  head<T = any>(url: string, config?: Omit<RequestConfig, 'method' | 'url'>): Promise<ApiResponse<T>>;
  options<T = any>(url: string, config?: Omit<RequestConfig, 'method' | 'url'>): Promise<ApiResponse<T>>;
  request<T = any>(config: RequestConfig): Promise<ApiResponse<T>>;
}