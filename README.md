# Universal API Client

A production-ready, framework-agnostic API client for Node.js and browser environments. Built with TypeScript first, featuring automatic retries, error normalization, GraphQL support, pagination, and more.

**Author:** Laurentiu Gingioveanu ([@eager_to_work](https://twitter.com/eager_to_work))  
**Email:** laurentiu@eagertowork.ro  
**GitHub:** [glaurentiu](https://github.com/glaurentiu)


[![npm version](https://badge.fury.io/js/universal-api-client.svg)](https://www.npmjs.com/package/universal-api-client)
[![npm downloads](https://img.shields.io/npm/dy/universal-api-client)](https://www.npmjs.com/package/universal-api-client)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 **Framework Agnostic** - Works in Node.js and browsers
- 🔄 **Automatic Retries** - Configurable backoff strategies (immediate, fixed, exponential)
- ⏱️ **Timeout Support** - Global and per-request timeouts
- 🛡️ **Error Normalization** - Consistent error handling using universal-error-normalizer
- 📊 **GraphQL Support** - Query and mutation helpers with error normalization
- 📄 **Pagination** - Async iterators for paginated REST endpoints
- 💾 **Caching** - In-memory caching for GET requests
- 🔌 **Adapters** - Fetch (default) and Axios adapters
- 🎣 **Request Cancellation** - AbortController support
- 🪝 **Hooks** - Before request, after response, and error hooks
- 🛠️ **Middleware** - Extensible request/response interceptors
- 📝 **TypeScript First** - Full type safety and intellisense

## Installation

```bash
npm install universal-api-client
# or
yarn add universal-api-client
# or
pnpm add universal-api-client
```

For Axios support (optional):
```bash
npm install axios
```

## Quick Start

```typescript
import { createClient } from 'universal-api-client';

// Create a client with sensible defaults
const client = createClient({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  retries: 3,
});

// Make requests
const response = await client.get('/users');
console.log(response.data);
```

## Core Concepts

### APIClient

The main client class that handles all HTTP requests with retry logic, caching, and error normalization.

```typescript
import { APIClient } from 'universal-api-client';

const client = new APIClient({
  baseURL: 'https://api.example.com',
  timeout: 30000,
  retries: 3,
  retryStrategy: 'exponential',
  headers: {
    'Authorization': 'Bearer your-token',
  },
});
```

### Request Methods

```typescript
// GET request
const users = await client.get('/users');

// POST request
const newUser = await client.post('/users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// PUT request
await client.put('/users/123', { name: 'Jane Doe' });

// PATCH request
await client.patch('/users/123', { email: 'jane@example.com' });

// DELETE request
await client.delete('/users/123');
```

### Error Handling

All errors are normalized using [universal-error-normalizer](https://www.npmjs.com/package/universal-error-normalizer), ensuring consistent error handling across fetch, Axios, and GraphQL requests:

```typescript
try {
  await client.get('/users/invalid');
} catch (error) {
  console.log(error.type);     // 'client' | 'server' | 'network' | etc.
  console.log(error.message);  // Human-readable message
  console.log(error.status);   // HTTP status code (if applicable)
  console.log(error.retryable); // Whether the request can be retried
}
```

## Configuration

### Client Configuration

```typescript
interface ClientConfig {
  baseURL?: string;
  timeout?: number;           // Default: 30000ms
  adapter?: 'fetch' | 'axios'; // Default: 'fetch'
  headers?: Record<string, string>;
  retries?: number;           // Default: 3
  retryDelay?: number;        // Default: 1000ms
  retryStrategy?: 'immediate' | 'fixed' | 'exponential';
  retryableStatusCodes?: number[];
  withCredentials?: boolean;
  cache?: {
    enabled?: boolean;
    ttl?: number;             // Default: 300000ms (5 minutes)
    maxSize?: number;         // Default: 100
  };
  hooks?: {
    beforeRequest?: (config) => void;
    afterResponse?: (response) => void;
    onError?: (error) => void;
  };
}
```

### Request Configuration

```typescript
interface RequestConfig {
  method?: HttpMethod;
  url?: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;     // Query parameters
  data?: any;                       // Request body
  timeout?: number;
  adapter?: 'fetch' | 'axios';
  retries?: number;
  retryDelay?: number;
  retryStrategy?: BackoffStrategy;
  retryableStatusCodes?: number[];
  signal?: AbortSignal;             // For cancellation
  withCredentials?: boolean;
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData';
}
```

## Adapters

### Fetch Adapter (Default)

Uses the native `fetch` API. Works in both Node.js (18+) and browsers.

```typescript
import { createClient } from 'universal-api-client';

const client = createClient({
  adapter: 'fetch', // This is the default
});
```

### Axios Adapter

Requires installing Axios separately. Useful for existing Axios-based projects.

```typescript
import { createClient } from 'universal-api-client';

const client = createClient({
  adapter: 'axios',
});
```

## GraphQL Support

### Basic GraphQL Query

```typescript
import { createGraphQLClient, graphqlQuery } from 'universal-api-client';

const client = createGraphQLClient('https://api.example.com/graphql');

const query = `
  query GetUsers($limit: Int) {
    users(limit: $limit) {
      id
      name
      email
    }
  }
`;

const response = await graphqlQuery(client, {
  query,
  variables: { limit: 10 },
});

console.log(response.data.users);
```

### GraphQL Client

```typescript
import { GraphQLClient } from 'universal-api-client';

const gqlClient = new GraphQLClient('/graphql', {
  baseURL: 'https://api.example.com',
});

// Query
const users = await gqlClient.query(`
  query GetUsers {
    users {
      id
      name
    }
  }
`);

// Mutation
const newUser = await gqlClient.mutate(`
  mutation CreateUser($input: UserInput!) {
    createUser(input: $input) {
      id
      name
    }
  }
`, {
  input: { name: 'John', email: 'john@example.com' },
});
```

## Pagination

### Basic Pagination

```typescript
import { paginate, PaginationPresets } from 'universal-api-client';

const client = createClient({ baseURL: 'https://api.example.com' });

// Page-based pagination
for await (const page of paginate(client, '/users', {
  strategy: 'page',
  pageSize: 20,
})) {
  console.log(`Page ${page.pageInfo.page}:`, page.data);
}

// Or collect all pages
const allPages = await paginate(client, '/users').all();
```

### Pagination Strategies

```typescript
// Offset-based pagination
for await (const page of paginate(client, '/users', {
  strategy: 'offset',
  pageSize: 50,
})) {
  // ...
}

// Cursor-based pagination (GraphQL style)
for await (const page of paginate(client, '/users', {
  strategy: 'cursor',
  dataParam: 'edges',
})) {
  // ...
}

// Link-based pagination (GitHub API style)
for await (const page of paginate(client, '/users', {
  strategy: 'link',
})) {
  // ...
}
```

### Pagination Presets

```typescript
import { paginate, PaginationPresets } from 'universal-api-client';

// GitHub API style
for await (const page of paginate(client, '/repos', PaginationPresets.github)) {
  // ...
}

// Standard REST API
for await (const page of paginate(client, '/users', PaginationPresets.page)) {
  // ...
}
```

## Error Handling

### Error Types

```typescript
type ErrorType =
  | 'network'    // Connection issues
  | 'timeout'    // Request timeout
  | 'http'       // HTTP errors
  | 'graphql'    // GraphQL validation/execution errors
  | 'auth'       // Authentication/authorization errors
  | 'server'     // 5xx server errors
  | 'client'     // 4xx client errors
  | 'validation' // Data validation errors
  | 'unknown';   // Unknown errors
```

### Error Normalization

```typescript
try {
  await client.get('/protected-resource');
} catch (error) {
  if (error.type === 'auth') {
    // Handle authentication error
    redirectToLogin();
  } else if (error.retryable) {
    // Retry the request
    await client.get('/protected-resource');
  } else {
    // Show user-friendly message
    showError(error.message);
  }
}
```

## Caching

### Enable Caching

```typescript
const client = createClient({
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 100,
  },
});

// First request - fetches from API
const users1 = await client.get('/users');

// Second request - returns cached data
const users2 = await client.get('/users');

// Clear cache
client.clearCache();

// Get cache stats
const stats = client.getCacheStats();
console.log(`Cache size: ${stats.size}`);
```

## Request Cancellation

### Using AbortController

```typescript
const controller = new AbortController();

// Make request with cancellation
const promise = client.get('/slow-endpoint', {
  signal: controller.signal,
});

// Cancel request after 5 seconds
setTimeout(() => {
  controller.abort();
}, 5000);

try {
  const response = await promise;
} catch (error) {
  if (error.type === 'timeout') {
    console.log('Request was cancelled');
  }
}
```

## Hooks

### Request/Response Hooks

```typescript
const client = createClient({
  hooks: {
    beforeRequest: (config) => {
      console.log(`Making ${config.method} request to ${config.url}`);
      // Add auth token
      config.headers.Authorization = `Bearer ${getToken()}`;
    },

    afterResponse: (response) => {
      console.log(`Response: ${response.status} (${response.duration}ms)`);
    },

    onError: (error) => {
      // Log errors
      logError(error);

      // Send to error tracking service
      if (error.type === 'server') {
        trackError(error);
      }
    },
  },
});
```

## Middleware

### Using Middleware

```typescript
import {
  MiddlewareClient,
  loggingMiddleware,
  authMiddleware,
} from 'universal-api-client';

const client = new MiddlewareClient({
  baseURL: 'https://api.example.com',
});

// Add logging middleware
client.use(loggingMiddleware);

// Add authentication middleware
client.use(authMiddleware('your-token-here'));

// Custom middleware
client.use({
  name: 'custom',
  request: (config) => {
    // Add timestamp
    return {
      ...config,
      headers: {
        ...config.headers,
        'X-Timestamp': Date.now().toString(),
      },
    };
  },
});

// Make requests with middleware applied
const response = await client.get('/users');
```

## Convenience Helpers

### Quick Requests

```typescript
import { request } from 'universal-api-client';

// One-off request without creating a client
const response = await request('https://api.example.com/users', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer token' },
});
```

### Pre-configured Clients

```typescript
import {
  createRestClient,
  createGraphQLClient,
} from 'universal-api-client';

// REST API client
const restClient = createRestClient('https://api.example.com');

// GraphQL API client
const gqlClient = createGraphQLClient('https://api.example.com/graphql');
```

## Advanced Usage

### Custom Adapter

```typescript
import { APIClient, HttpAdapter, RequestConfig, ApiResponse } from 'universal-api-client';

class CustomAdapter implements HttpAdapter {
  async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    // Your custom HTTP logic here
    // Return normalized ApiResponse
  }
}

const client = new APIClient({
  adapter: new CustomAdapter(),
});
```

### Extending the Client

```typescript
class MyAPIClient extends APIClient {
  async getUsers(params?: { limit?: number; offset?: number }) {
    return this.get('/users', { params });
  }

  async createUser(user: { name: string; email: string }) {
    return this.post('/users', user);
  }
}

const client = new MyAPIClient({ baseURL: 'https://api.example.com' });
const users = await client.getUsers({ limit: 10 });
```

## TypeScript Support

### Type-safe Requests

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
}

// Type-safe request
const response = await client.post<User>('/users', {
  name: 'John',
  email: 'john@example.com',
} satisfies CreateUserRequest);

// response.data is typed as User
console.log(response.data.name); // ✅ TypeScript knows this is a string
```

### GraphQL Type Safety

```typescript
interface GetUsersResponse {
  users: {
    id: string;
    name: string;
    email: string;
  }[];
}

const response = await graphqlQuery<GetUsersResponse>(client, {
  query: `query GetUsers { users { id name email } }`,
});

// response.data is typed as GetUsersResponse
response.data.users.forEach(user => {
  console.log(user.name); // ✅ TypeScript knows user structure
});
```

## Best Practices

### Error Handling

```typescript
// Always handle errors appropriately
try {
  const response = await client.get('/users');
  // Handle success
} catch (error) {
  // Check error type
  switch (error.type) {
    case 'auth':
      // Redirect to login
      break;
    case 'network':
      // Show offline message
      break;
    case 'server':
      // Show generic error
      break;
    default:
      // Handle other errors
  }
}
```

### Timeout and Retries

```typescript
// Set reasonable timeouts
const client = createClient({
  timeout: 10000, // 10 seconds
  retries: 3,
  retryStrategy: 'exponential',
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
});
```

### Resource Cleanup

```typescript
// Cancel requests when component unmounts (React example)
useEffect(() => {
  const controller = new AbortController();

  client.get('/data', { signal: controller.signal })
    .then(setData)
    .catch(handleError);

  return () => controller.abort();
}, []);
```

### Caching Strategy

```typescript
// Enable caching for frequently accessed data
const client = createClient({
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
  },
});

// Cache user preferences
const prefs = await client.get('/user/preferences');

// Cache will be used for subsequent requests
```

## Migration Guide

### From Axios

```typescript
// Before (Axios)
import axios from 'axios';
const response = await axios.get('/users');

// After (Universal API Client)
import { createClient } from 'universal-api-client';
const client = createClient({ adapter: 'axios' });
const response = await client.get('/users');
```

### From Fetch

```typescript
// Before (native fetch)
const response = await fetch('/users');
const data = await response.json();

// After (Universal API Client)
import { createClient } from 'universal-api-client';
const client = createClient();
const response = await client.get('/users');
const data = response.data;
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Support

- 📖 [Documentation](https://github.com/glaurentiu/universal-api-client)
- 🐛 [Issues](https://github.com/glaurentiu/universal-api-client/issues)
- 💬 [Discussions](https://github.com/glaurentiu/universal-api-client/discussions)
