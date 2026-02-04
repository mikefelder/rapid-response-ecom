import { CosmosClient, Container, Database } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import type { MonitoredProduct, InventoryHistoryEntry, UserPreferences } from '@rapid-response-shopper/shared';

/**
 * Cosmos DB client wrapper for the Rapid Response Shopper database
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

    // Use managed identity in production, connection string locally
    if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
      // Local development with emulator
      this.client = new CosmosClient({
        endpoint,
        key: process.env.COSMOS_KEY ?? 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==',
      });
    } else {
      // Production with managed identity
      this.client = new CosmosClient({
        endpoint,
        aadCredentials: new DefaultAzureCredential(),
      });
    }
  }

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    this.database = this.client.database(this.databaseName);
  }

  /**
   * Get the products container
   */
  get products(): Container {
    return this.getContainer('products');
  }

  /**
   * Get the inventory history container
   */
  get inventoryHistory(): Container {
    return this.getContainer('inventory-history');
  }

  /**
   * Get the user preferences container
   */
  get userPreferences(): Container {
    return this.getContainer('user-preferences');
  }

  private getContainer(name: string): Container {
    if (!this.database) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    let container = this.containers.get(name);
    if (!container) {
      container = this.database.container(name);
      this.containers.set(name, container);
    }
    return container;
  }

  // ============================================================================
  // Product Operations
  // ============================================================================

  /**
   * Get all active products for monitoring
   */
  async getActiveProducts(): Promise<MonitoredProduct[]> {
    const query = {
      query: 'SELECT * FROM c WHERE c.isActive = true',
    };

    const { resources } = await this.products.items.query<MonitoredProduct>(query).fetchAll();
    return resources;
  }

  /**
   * Get a product by ID
   */
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

  /**
   * Update a product
   */
  async updateProduct(product: MonitoredProduct): Promise<void> {
    product.updatedAt = new Date().toISOString();
    await this.products.item(product.id, product.id).replace(product);
  }

  /**
   * Create a new product
   */
  async createProduct(product: MonitoredProduct): Promise<void> {
    await this.products.items.create(product);
  }

  // ============================================================================
  // Inventory History Operations
  // ============================================================================

  /**
   * Add an inventory history entry
   */
  async addHistoryEntry(entry: InventoryHistoryEntry): Promise<void> {
    await this.inventoryHistory.items.create(entry);
  }

  /**
   * Get the most recent history entry for a product
   */
  async getLatestHistoryEntry(productId: string): Promise<InventoryHistoryEntry | null> {
    const query = {
      query: 'SELECT TOP 1 * FROM c WHERE c.productId = @productId ORDER BY c.timestamp DESC',
      parameters: [{ name: '@productId', value: productId }],
    };

    const { resources } = await this.inventoryHistory.items
      .query<InventoryHistoryEntry>(query)
      .fetchAll();

    return resources[0] ?? null;
  }

  /**
   * Get inventory history for a product
   */
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

  // ============================================================================
  // User Preferences Operations
  // ============================================================================

  /**
   * Get user preferences (single-user system uses "default" ID)
   */
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

  /**
   * Update user preferences
   */
  async updateUserPreferences(preferences: UserPreferences): Promise<void> {
    preferences.updatedAt = new Date().toISOString();
    await this.userPreferences.item('default', 'default').replace(preferences);
  }

  /**
   * Create default user preferences
   */
  async createDefaultPreferences(): Promise<UserPreferences> {
    const now = new Date().toISOString();
    const defaults: UserPreferences = {
      id: 'default',
      notifications: {
        sms: { enabled: false },
        push: { enabled: false, subscriptions: [] },
      },
      monitoring: {
        defaultPollIntervalSeconds: 30,
        highPriorityPollIntervalSeconds: 10,
      },
      apiKeyReferences: {},
      createdAt: now,
      updatedAt: now,
    };

    await this.userPreferences.items.create(defaults);
    return defaults;
  }
}

// Singleton instance
let cosmosClientInstance: CosmosDbClient | null = null;

/**
 * Get the shared Cosmos DB client instance
 */
export async function getCosmosClient(): Promise<CosmosDbClient> {
  if (!cosmosClientInstance) {
    cosmosClientInstance = new CosmosDbClient();
    await cosmosClientInstance.initialize();
  }
  return cosmosClientInstance;
}
