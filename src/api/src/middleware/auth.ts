import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

/**
 * Simple API key authentication middleware
 * 
 * For a single-user personal project, this provides basic protection.
 * For enhanced security, consider Azure AD B2C integration.
 */
export function validateApiKey(request: HttpRequest, context: InvocationContext): boolean {
  const apiKey = process.env.API_KEY;
  
  // If no API key is configured, allow all requests (development mode)
  if (!apiKey) {
    context.warn('No API_KEY configured - authentication disabled');
    return true;
  }

  const providedKey = request.headers.get('x-api-key') ?? request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!providedKey) {
    return false;
  }

  return providedKey === apiKey;
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(): HttpResponseInit {
  return {
    status: 401,
    jsonBody: {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing API key',
      },
    },
  };
}

/**
 * Middleware wrapper for authentication
 */
export function withAuth(
  handler: (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (!validateApiKey(request, context)) {
      return unauthorizedResponse();
    }
    return handler(request, context);
  };
}
