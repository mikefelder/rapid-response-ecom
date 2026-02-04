import type { RetailerId, StoreLocation, InventoryStatus } from '../models/index.js';
import type {
  IInventoryProvider,
  InventoryCheckResult,
  InventoryProviderConfig,
} from './inventory-provider.interface.js';

/**
 * Best Buy API response types
 */
interface BestBuyProduct {
  sku: number;
  name: string;
  salePrice: number;
  url: string;
  image: string;
  addToCartUrl: string;
  onlineAvailability: boolean;
  onlineAvailabilityText: string;
  inStoreAvailability: boolean;
  inStoreAvailabilityText: string;
}

interface BestBuyProductResponse {
  products: BestBuyProduct[];
  total: number;
}

interface BestBuyStoreAvailability {
  store: {
    storeId: string;
    name: string;
    address: string;
    city: string;
    region: string;
    postalCode: string;
  };
  inStorePickup: boolean;
  friendsAndFamilyPickup: boolean;
}

interface BestBuyStoreResponse {
  stores: BestBuyStoreAvailability[];
}

interface BestBuyStore {
  storeId: string;
  name: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  distance: number;
}

interface BestBuyStoreSearchResponse {
  stores: BestBuyStore[];
}

/**
 * Best Buy inventory provider implementation
 *
 * Uses the Best Buy Products API to check inventory availability.
 * @see https://bestbuyapis.github.io/api-documentation/
 */
export class BestBuyInventoryProvider implements IInventoryProvider {
  readonly retailerId: RetailerId = 'bestbuy';
  readonly retailerName = 'Best Buy';

  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.bestbuy.com/v1';
  private readonly rateLimit: { requestsPerSecond: number; requestsPerDay?: number };

  constructor(config: InventoryProviderConfig) {
    this.apiKey = config.apiKey;
    this.rateLimit = config.rateLimit ?? { requestsPerSecond: 5 };
  }

  /**
   * Check inventory for a product at Best Buy
   */
  async checkInventory(
    sku: string,
    storeLocations?: StoreLocation[]
  ): Promise<InventoryCheckResult> {
    // Fetch product details and online availability
    const productData = await this.fetchProductDetails(sku);

    if (!productData) {
      throw new Error(`Product not found: ${sku}`);
    }

    // Build inventory status
    const status: InventoryStatus = {
      online: {
        available: productData.onlineAvailability,
        lastKnownAvailable: productData.onlineAvailability
          ? new Date().toISOString()
          : undefined,
      },
      stores: [],
    };

    // Check store availability if locations provided
    if (storeLocations && storeLocations.length > 0) {
      const storeIds = storeLocations.map((loc) => loc.storeId);
      const storeAvailability = await this.fetchStoreAvailability(sku, storeIds);

      status.stores = storeAvailability.map((sa) => ({
        storeId: sa.store.storeId,
        available: sa.inStorePickup,
        lastKnownAvailable: sa.inStorePickup ? new Date().toISOString() : undefined,
      }));
    }

    return {
      status,
      productUrl: this.getProductUrl(sku),
      addToCartUrl: this.getAddToCartUrl(sku),
      imageUrl: productData.image,
      productName: productData.name,
    };
  }

  /**
   * Generate Best Buy add-to-cart URL
   */
  getAddToCartUrl(sku: string): string {
    return `https://api.bestbuy.com/click/-/${sku}/cart`;
  }

  /**
   * Generate Best Buy product page URL
   */
  getProductUrl(sku: string): string {
    return `https://www.bestbuy.com/site/${sku}.p`;
  }

  /**
   * Validate that a SKU exists at Best Buy
   */
  async validateSku(sku: string): Promise<boolean> {
    try {
      const product = await this.fetchProductDetails(sku);
      return product !== null;
    } catch {
      return false;
    }
  }

  /**
   * Find Best Buy stores near a ZIP code
   */
  async findStores(zipCode: string, maxResults = 10): Promise<StoreLocation[]> {
    const url = new URL(`${this.baseUrl}/stores(area(${zipCode},25))`);
    url.searchParams.set('apiKey', this.apiKey);
    url.searchParams.set('format', 'json');
    url.searchParams.set('pageSize', maxResults.toString());
    url.searchParams.set('show', 'storeId,name,address,city,region,postalCode,distance');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Best Buy API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as BestBuyStoreSearchResponse;

    return data.stores.map((store) => ({
      storeId: store.storeId,
      storeName: store.name,
      address: `${store.address}, ${store.city}, ${store.region}`,
      zipCode: store.postalCode,
    }));
  }

  /**
   * Fetch product details from Best Buy API
   */
  private async fetchProductDetails(sku: string): Promise<BestBuyProduct | null> {
    const url = new URL(`${this.baseUrl}/products(sku=${sku})`);
    url.searchParams.set('apiKey', this.apiKey);
    url.searchParams.set('format', 'json');
    url.searchParams.set(
      'show',
      'sku,name,salePrice,url,image,addToCartUrl,onlineAvailability,onlineAvailabilityText,inStoreAvailability,inStoreAvailabilityText'
    );

    const response = await fetch(url.toString());

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Best Buy API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as BestBuyProductResponse;

    if (data.total === 0 || !data.products || data.products.length === 0) {
      return null;
    }

    return data.products[0];
  }

  /**
   * Fetch store availability for a product
   */
  private async fetchStoreAvailability(
    sku: string,
    storeIds: string[]
  ): Promise<BestBuyStoreAvailability[]> {
    // Best Buy API allows checking multiple stores at once
    const storeFilter = storeIds.join(',');
    const url = new URL(`${this.baseUrl}/products/${sku}/stores.json`);
    url.searchParams.set('apiKey', this.apiKey);
    url.searchParams.set('storeIds', storeFilter);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Best Buy API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as BestBuyStoreResponse;
    return data.stores ?? [];
  }
}
