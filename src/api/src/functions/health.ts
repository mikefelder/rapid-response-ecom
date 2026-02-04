import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { HealthCheckResponse } from '@rapid-response-shopper/shared';
import { getCosmosClient } from '../services/cosmos-client.js';

/**
 * GET /api/health
 * Health check endpoint
 */
async function healthCheck(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const checks = {
    cosmosDb: 'ok' as 'ok' | 'error',
    serviceBus: 'ok' as 'ok' | 'error',
    keyVault: 'ok' as 'ok' | 'error',
  };

  // Check Cosmos DB
  try {
    const client = await getCosmosClient();
    await client.getUserPreferences(); // Simple read to verify connectivity
  } catch (error) {
    checks.cosmosDb = 'error';
    context.error(`Cosmos DB health check failed: ${error}`);
  }

  // Determine overall status
  const hasErrors = Object.values(checks).some((v) => v === 'error');
  const status = hasErrors ? 'degraded' : 'healthy';

  const response: HealthCheckResponse = {
    status,
    timestamp: new Date().toISOString(),
    checks,
  };

  return {
    status: hasErrors ? 503 : 200,
    jsonBody: response,
  };
}

/**
 * GET /api/stores/search
 * Search for stores near a ZIP code
 */
async function searchStores(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const retailer = request.query.get('retailer') ?? 'bestbuy';
    const zipCode = request.query.get('zipCode');

    if (!zipCode) {
      return {
        status: 400,
        jsonBody: { error: { code: 'VALIDATION_ERROR', message: 'zipCode is required' } },
      };
    }

    // For now, return mock data
    // In production, this would call the retailer's store locator API
    const stores = [
      {
        storeId: '1234',
        storeName: 'Best Buy - Example Store',
        address: '123 Main St, City, ST',
        zipCode: zipCode,
      },
    ];

    return { jsonBody: { stores } };
  } catch (error) {
    context.error(`Error searching stores: ${error}`);
    return {
      status: 500,
      jsonBody: { error: { code: 'INTERNAL_ERROR', message: 'Failed to search stores' } },
    };
  }
}

// Register HTTP endpoints
app.http('healthCheck', {
  methods: ['GET'],
  route: 'health',
  authLevel: 'anonymous',
  handler: healthCheck,
});

app.http('searchStores', {
  methods: ['GET'],
  route: 'stores/search',
  authLevel: 'anonymous',
  handler: searchStores,
});
