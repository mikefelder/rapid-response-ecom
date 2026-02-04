import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import type {
  MonitoredProduct,
  CreateProductRequest,
  UpdateProductRequest,
  ProductResponse,
  ProductListResponse,
  InventoryHistoryResponse,
} from '@rapid-response-shopper/shared';
import { InventoryProviderFactory } from '@rapid-response-shopper/shared';
import { getCosmosClient } from '../services/cosmos-client.js';
import { withAuth } from '../middleware/auth.js';

/**
 * GET /api/products
 * List all monitored products
 */
async function listProducts(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const client = await getCosmosClient();
    const products = await client.getAllProducts();

    const response: ProductListResponse = {
      products: products.map(toProductResponse),
      pagination: {
        total: products.length,
        hasMore: false,
      },
    };

    return { jsonBody: response };
  } catch (error) {
    context.error(`Error listing products: ${error}`);
    return {
      status: 500,
      jsonBody: { error: { code: 'INTERNAL_ERROR', message: 'Failed to list products' } },
    };
  }
}

/**
 * POST /api/products
 * Create a new product to monitor
 */
async function createProduct(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = (await request.json()) as CreateProductRequest;

    // Validate required fields
    if (!body.retailer || !body.sku || !body.name) {
      return {
        status: 400,
        jsonBody: { error: { code: 'VALIDATION_ERROR', message: 'retailer, sku, and name are required' } },
      };
    }

    // Initialize provider to get URLs
    const providerFactory = InventoryProviderFactory.create({
      bestbuy: { apiKey: process.env.BESTBUY_API_KEY ?? '' },
    });

    const provider = providerFactory.getProvider(body.retailer);
    if (!provider) {
      return {
        status: 400,
        jsonBody: { error: { code: 'UNSUPPORTED_RETAILER', message: `Retailer '${body.retailer}' is not supported` } },
      };
    }

    const now = new Date().toISOString();
    const product: MonitoredProduct = {
      id: uuidv4(),
      retailer: body.retailer,
      sku: body.sku,
      name: body.name,
      isActive: true,
      priority: body.priority ?? 'normal',
      storeLocations: body.storeLocations,
      currentStatus: {
        online: { available: false },
        stores: [],
      },
      lastCheckedAt: now,
      productUrl: provider.getProductUrl(body.sku),
      addToCartUrl: provider.getAddToCartUrl(body.sku),
      createdAt: now,
      updatedAt: now,
    };

    const client = await getCosmosClient();
    await client.createProduct(product);

    return {
      status: 201,
      jsonBody: toProductResponse(product),
    };
  } catch (error) {
    context.error(`Error creating product: ${error}`);
    return {
      status: 500,
      jsonBody: { error: { code: 'INTERNAL_ERROR', message: 'Failed to create product' } },
    };
  }
}

/**
 * GET /api/products/{id}
 * Get a specific product
 */
async function getProduct(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) {
      return {
        status: 400,
        jsonBody: { error: { code: 'VALIDATION_ERROR', message: 'Product ID is required' } },
      };
    }

    const client = await getCosmosClient();
    const product = await client.getProduct(id);

    if (!product) {
      return {
        status: 404,
        jsonBody: { error: { code: 'NOT_FOUND', message: 'Product not found' } },
      };
    }

    return { jsonBody: toProductResponse(product) };
  } catch (error) {
    context.error(`Error getting product: ${error}`);
    return {
      status: 500,
      jsonBody: { error: { code: 'INTERNAL_ERROR', message: 'Failed to get product' } },
    };
  }
}

/**
 * PATCH /api/products/{id}
 * Update a product
 */
async function updateProduct(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) {
      return {
        status: 400,
        jsonBody: { error: { code: 'VALIDATION_ERROR', message: 'Product ID is required' } },
      };
    }

    const body = (await request.json()) as UpdateProductRequest;
    const client = await getCosmosClient();
    const product = await client.getProduct(id);

    if (!product) {
      return {
        status: 404,
        jsonBody: { error: { code: 'NOT_FOUND', message: 'Product not found' } },
      };
    }

    // Apply updates
    if (body.name !== undefined) product.name = body.name;
    if (body.priority !== undefined) product.priority = body.priority;
    if (body.storeLocations !== undefined) product.storeLocations = body.storeLocations;
    if (body.isActive !== undefined) product.isActive = body.isActive;
    product.updatedAt = new Date().toISOString();

    await client.updateProduct(product);

    return { jsonBody: toProductResponse(product) };
  } catch (error) {
    context.error(`Error updating product: ${error}`);
    return {
      status: 500,
      jsonBody: { error: { code: 'INTERNAL_ERROR', message: 'Failed to update product' } },
    };
  }
}

/**
 * DELETE /api/products/{id}
 * Delete a product
 */
async function deleteProduct(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) {
      return {
        status: 400,
        jsonBody: { error: { code: 'VALIDATION_ERROR', message: 'Product ID is required' } },
      };
    }

    const client = await getCosmosClient();
    const product = await client.getProduct(id);

    if (!product) {
      return {
        status: 404,
        jsonBody: { error: { code: 'NOT_FOUND', message: 'Product not found' } },
      };
    }

    await client.deleteProduct(id);

    return { status: 204 };
  } catch (error) {
    context.error(`Error deleting product: ${error}`);
    return {
      status: 500,
      jsonBody: { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete product' } },
    };
  }
}

/**
 * GET /api/products/{id}/history
 * Get inventory history for a product
 */
async function getProductHistory(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) {
      return {
        status: 400,
        jsonBody: { error: { code: 'VALIDATION_ERROR', message: 'Product ID is required' } },
      };
    }

    const client = await getCosmosClient();
    const product = await client.getProduct(id);

    if (!product) {
      return {
        status: 404,
        jsonBody: { error: { code: 'NOT_FOUND', message: 'Product not found' } },
      };
    }

    const limit = parseInt(request.query.get('limit') ?? '50', 10);
    const continuationToken = request.query.get('token') ?? undefined;

    const { entries, continuationToken: nextToken } = await client.getProductHistory(id, limit, continuationToken);

    const response: InventoryHistoryResponse = {
      productId: id,
      productName: product.name,
      entries: entries.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        timestamp: e.timestamp,
        online: e.online,
        stores: e.stores.map((s) => ({ storeId: s.storeId, available: s.available })),
        durationInStockMs: e.durationInStockMs,
      })),
      pagination: {
        continuationToken: nextToken,
        hasMore: Boolean(nextToken),
      },
    };

    return { jsonBody: response };
  } catch (error) {
    context.error(`Error getting product history: ${error}`);
    return {
      status: 500,
      jsonBody: { error: { code: 'INTERNAL_ERROR', message: 'Failed to get product history' } },
    };
  }
}

// Helper function to convert MonitoredProduct to API response
function toProductResponse(product: MonitoredProduct): ProductResponse {
  return {
    id: product.id,
    retailer: product.retailer,
    sku: product.sku,
    name: product.name,
    isActive: product.isActive,
    priority: product.priority,
    storeLocations: product.storeLocations ?? [],
    currentStatus: product.currentStatus,
    lastCheckedAt: product.lastCheckedAt,
    lastStatusChangeAt: product.lastStatusChangeAt,
    imageUrl: product.imageUrl,
    productUrl: product.productUrl,
    addToCartUrl: product.addToCartUrl,
  };
}

// Register HTTP endpoints
app.http('listProducts', {
  methods: ['GET'],
  route: 'products',
  authLevel: 'anonymous',
  handler: withAuth(listProducts),
});

app.http('createProduct', {
  methods: ['POST'],
  route: 'products',
  authLevel: 'anonymous',
  handler: withAuth(createProduct),
});

app.http('getProduct', {
  methods: ['GET'],
  route: 'products/{id}',
  authLevel: 'anonymous',
  handler: withAuth(getProduct),
});

app.http('updateProduct', {
  methods: ['PATCH'],
  route: 'products/{id}',
  authLevel: 'anonymous',
  handler: withAuth(updateProduct),
});

app.http('deleteProduct', {
  methods: ['DELETE'],
  route: 'products/{id}',
  authLevel: 'anonymous',
  handler: withAuth(deleteProduct),
});

app.http('getProductHistory', {
  methods: ['GET'],
  route: 'products/{id}/history',
  authLevel: 'anonymous',
  handler: withAuth(getProductHistory),
});
