import { CosmosClient, Container, Database } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import type { MonitoredProduct, InventoryHistoryEntry, UserPreferences } from '@rapid-response-shopper/shared';

/**
 * Cosmos DB client wrapper for the API
 */
export class CosmosDbClient {
  private client: CosmosClient;
  private database: Database | null = null;
  private containers: Map<string, Container> = new Map();

  private readonly databaseName: string;

  constructor() {
    const endpoint = process.env.COSMOS_ENDPOINT;
    if (!endpoint) {
      throw new Error('COSMOS_ENDPOINT environment variable is required');
    }

    this.databaseName = process.env.COSMOS_DATABASE_NAME ?? 'rapid-response-shopper';

    // Use managed identity in production, emulator key locally
    if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
      this.client = new CosmosClient({
        endpoint,
        key: process.env.COSMOS_KEY ?? 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==',
      });
    } else {
      this.client = new CosmosClient({
        endpoint,
        aadCredentials: new DefaultAzureCredential(),
      });
    }
  }

  async initialize(): Promise<void> {
    this.database = this.client.database(this.databaseName);
  }

  get products(): Container {
    return this.getContainer('products');
  }

  get inventoryHistory(): Container {
    return this.getContainer('inventory-history');
  }

  get userPreferences(): Container {
    return this.getContainer('user-preferences');
  }

  private getContainer(name: string): Container {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    let container = this.containers.get(name);
    if (!container) {
      container = this.database.container(name);
      this.containers.set(name, container);
    }
    return container;
  }

  // Product operations
  async getAllProducts(): Promise<MonitoredProduct[]> {
    const { resources } = await this.products.items.query<MonitoredProduct>({
      query: 'SELECT * FROM c ORDER BY c.createdAt DESC',
    }).fetchAll();
    return resources;
  }

  async getProduct(id: string): Promise<MonitoredProduct | null> {
    try {
      const { resource } = await this.products.item(id, id).read<MonitoredProduct>();
      return resource ?? null;
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 404) {
        return null;
      }
      throw error;
    }
  }

  async createProduct(product: MonitoredProduct): Promise<void> {
    await this.products.items.create(product);
  }

  async updateProduct(product: MonitoredProduct): Promise<void> {
    await this.products.item(product.id, product.id).replace(product);
  }

  async deleteProduct(id: string): Promise<void> {
    await this.products.item(id, id).delete();
  }

  // History operations
  async getProductHistory(
    productId: string,
    limit = 50,
    continuationToken?: string
  ): Promise<{ entries: InventoryHistoryEntry[]; continuationToken?: string }> {
    const query = {
      query: 'SELECT * FROM c WHERE c.productId = @productId ORDER BY c.timestamp DESC',
      parameters: [{ name: '@productId', value: productId }],
    };

    const iterator = this.inventoryHistory.items.query<InventoryHistoryEntry>(query, {
      maxItemCount: limit,
      continuationToken,
    });

    const response = await iterator.fetchNext();
    return {
      entries: response.resources,
      continuationToken: response.continuationToken,
    };
  }

  // User preferences operations
  async getUserPreferences(): Promise<UserPreferences | null> {
    try {
      const { resource } = await this.userPreferences.item('default', 'default').read<UserPreferences>();
      return resource ?? null;
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 404) {
        return null;
      }
      throw error;
    }
  }

  async updateUserPreferences(preferences: UserPreferences): Promise<void> {
    preferences.updatedAt = new Date().toISOString();
    await this.userPreferences.item('default', 'default').replace(preferences);
  }

  async createUserPreferences(preferences: UserPreferences): Promise<void> {
    await this.userPreferences.items.create(preferences);
  }
}

let instance: CosmosDbClient | null = null;

export async function getCosmosClient(): Promise<CosmosDbClient> {
  if (!instance) {
    instance = new CosmosDbClient();
    await instance.initialize();
  }
  return instance;
}
