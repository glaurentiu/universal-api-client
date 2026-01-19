/**
 * Universal Api Client
 * Author: Laurentiu Gingioveanu
 * Email: laurentiu@eagertowork.ro
 * GitHub: https://github.com/glaurentiu
 * Twitter: @eager_to_work
 * License: MIT
 *
 * Error normalization utilities for consistent error handling
 * Built on top of universal-error-normalizer
 */

import { normalizeError as normalizeUniversalError } from 'universal-error-normalizer';
import { ApiError, ErrorType } from './types';

/**
 * Determines if an HTTP status code is retryable
 */
export function isRetryableStatus(status: number): boolean {
  // Retry on server errors (5xx), rate limiting (429), and network issues
  return status >= 500 || status === 429 || status === 408 || status === 503;
}

/**
 * Determines if an error is retryable based on type and status
 */
export function isRetryableError(error: ApiError): boolean {
  if (error.type === 'network' || error.type === 'timeout' || error.type === 'server') {
    return true;
  }

  if (error.type === 'http' && error.status && isRetryableStatus(error.status)) {
    return true;
  }

  return false;
}

/**
 * Normalizes any error using universal-error-normalizer and adds API-specific properties
 */
export function normalizeError(error: any, source: 'client' | 'server' | 'network' = 'client'): ApiError {
  // Use the universal error normalizer as the base
  const normalized = normalizeUniversalError(error);

  // Create our API-specific error format
  return {
    type: normalized.type as ErrorType,
    message: normalized.message,
    status: normalized.status,
    code: normalized.code,
    field: (normalized as any).field,
    details: (normalized as any).details,
    retryable: isRetryableError(normalized as unknown as ApiError),
    source,
    original: normalized.original || error,
  };
}

/**
 * Creates a custom error with specific properties
 */
export function createError(
  type: ErrorType,
  message: string,
  options: Partial<Pick<ApiError, 'status' | 'code' | 'field' | 'details' | 'source'>> = {}
): ApiError {
  return {
    type,
    message,
    status: options.status,
    code: options.code,
    field: options.field,
    details: options.details,
    retryable: isRetryableError({ type, status: options.status } as ApiError),
    source: options.source || 'client',
  };
}

/**
 * Throws a normalized error
 */
export function throwError(
  type: ErrorType,
  message: string,
  options: Partial<Pick<ApiError, 'status' | 'code' | 'field' | 'details' | 'source'>> = {}
): never {
  throw createError(type, message, options);
}