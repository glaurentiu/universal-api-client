/**
 * Universal Api Client
 * Author: Laurentiu Gingioveanu
 * Email: laurentiu@eagertowork.ro
 * GitHub: https://github.com/glaurentiu
 * Twitter: @eager_to_work
 * License: MIT
 *
 * GraphQL query helper for the universal API client
 */

import { APIClient } from './client';
import { GraphQLRequest, GraphQLResponse, ApiResponse, RequestConfig } from './types';
import { normalizeError } from './errors';

export interface GraphQLOptions extends Omit<RequestConfig, 'method' | 'data'> {
  endpoint?: string;
}

export type { GraphQLRequest, GraphQLResponse, GraphQLError } from './types';

/**
 * Executes a GraphQL query or mutation
 */
export async function graphqlQuery<T = any>(
  client: APIClient,
  request: GraphQLRequest,
  options: GraphQLOptions = {}
): Promise<GraphQLResponse<T>> {
  const {
    endpoint = '/graphql',
    headers = {},
    ...requestConfig
  } = options;

  try {
    // Validate GraphQL request
    if (!request.query || typeof request.query !== 'string') {
      throw normalizeError(
        { message: 'GraphQL query is required and must be a string' },
        'client'
      );
    }

    // Prepare GraphQL request payload
    const payload = {
      query: request.query.trim(),
      variables: request.variables,
      operationName: request.operationName,
    };

    // Make HTTP request to GraphQL endpoint
    const response: ApiResponse<GraphQLResponse<T>> = await client.post(
      endpoint,
      payload,
      {
        ...requestConfig,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      }
    );

    const { data, errors } = response.data;

    // Handle GraphQL errors
    if (errors && errors.length > 0) {
      // Create a normalized error from GraphQL errors
      const primaryError = errors[0];
      throw normalizeError({
        message: primaryError.message || 'GraphQL query failed',
        errors, // Keep original GraphQL errors
        field: primaryError.path?.[0] as string,
        extensions: primaryError.extensions,
      });
    }

    // Return successful GraphQL response
    return response.data;

  } catch (error) {
    // Normalize all errors using universal-error-normalizer
    throw normalizeError(error);
  }
}

/**
 * Convenience function for GraphQL queries (read operations)
 */
export async function graphqlQueryHelper<T = any>(
  client: APIClient,
  query: string,
  variables?: Record<string, any>,
  options: GraphQLOptions = {}
): Promise<T | null> {
  const response = await graphqlQuery<T>(client, { query, variables }, options);

  // Return data or null for queries
  return response.data || null;
}

/**
 * Convenience function for GraphQL mutations (write operations)
 */
export async function graphqlMutation<T = any>(
  client: APIClient,
  mutation: string,
  variables?: Record<string, any>,
  options: GraphQLOptions = {}
): Promise<T | null> {
  const response = await graphqlQuery<T>(client, {
    query: mutation,
    variables,
  }, options);

  // Return data or null for mutations
  return response.data || null;
}

/**
 * Validates a GraphQL query string
 */
export function validateGraphQLQuery(query: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!query || typeof query !== 'string') {
    errors.push('Query must be a non-empty string');
    return { valid: false, errors };
  }

  const trimmed = query.trim();

  if (!trimmed) {
    errors.push('Query cannot be empty');
    return { valid: false, errors };
  }

  // Basic validation - check for query/mutation/subscription keywords
  const hasOperation = /\b(query|mutation|subscription)\b/i.test(trimmed);
  if (!hasOperation) {
    errors.push('Query must contain a valid GraphQL operation (query, mutation, or subscription)');
  }

  // Check for balanced braces (very basic)
  const openBraces = (trimmed.match(/{/g) || []).length;
  const closeBraces = (trimmed.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push('Query has unbalanced braces');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extracts operation name from GraphQL query
 */
export function extractOperationName(query: string): string | null {
  const match = query.match(/\b(query|mutation|subscription)\s+(\w+)/i);
  return match ? match[2] : null;
}

/**
 * Creates a GraphQL client extension
 */
export class GraphQLClient extends APIClient {
  private graphqlEndpoint: string;

  constructor(endpoint: string, config: any = {}) {
    super(config);
    this.graphqlEndpoint = endpoint;
  }

  /**
   * Execute a GraphQL query
   */
  async query<T = any>(
    query: string,
    variables?: Record<string, any>,
    options: Omit<GraphQLOptions, 'endpoint'> = {}
  ): Promise<T | null> {
    return graphqlQueryHelper<T>(this, query, variables, {
      ...options,
      endpoint: this.graphqlEndpoint,
    });
  }

  /**
   * Execute a GraphQL mutation
   */
  async mutate<T = any>(
    mutation: string,
    variables?: Record<string, any>,
    options: Omit<GraphQLOptions, 'endpoint'> = {}
  ): Promise<T | null> {
    return graphqlMutation<T>(this, mutation, variables, {
      ...options,
      endpoint: this.graphqlEndpoint,
    });
  }
}