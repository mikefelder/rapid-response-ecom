const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const API_KEY = import.meta.env.VITE_API_KEY || '';

interface ApiOptions {
  method?: string;
  body?: unknown;
}

async function apiRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
    throw new Error(error.error?.message || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Product types
export interface Product {
  id: string;
  retailer: string;
  sku: string;
  name: string;
  isActive: boolean;
  priority: 'high' | 'normal';
  storeLocations: Array<{
    storeId: string;
    storeName: string;
    zipCode: string;
  }>;
  currentStatus: {
    online: { available: boolean; quantity?: number };
    stores: Array<{ storeId: string; available: boolean }>;
  };
  lastCheckedAt: string;
  lastStatusChangeAt?: string;
  imageUrl?: string;
  productUrl: string;
  addToCartUrl: string;
}

export interface ProductListResponse {
  products: Product[];
  pagination: {
    total: number;
    hasMore: boolean;
  };
}

export interface HistoryEntry {
  id: string;
  eventType: 'in_stock' | 'out_of_stock';
  timestamp: string;
  online: boolean;
  stores: Array<{ storeId: string; available: boolean }>;
  durationInStockMs?: number;
}

export interface ProductHistoryResponse {
  productId: string;
  productName: string;
  entries: HistoryEntry[];
  pagination: {
    continuationToken?: string;
    hasMore: boolean;
  };
}

export interface UserPreferences {
  notifications: {
    sms: {
      enabled: boolean;
      phoneNumber?: string;
    };
    push: {
      enabled: boolean;
      subscriptionCount: number;
    };
  };
  monitoring: {
    defaultPollIntervalSeconds: number;
    highPriorityPollIntervalSeconds: number;
  };
}

// API functions
export const api = {
  // Products
  getProducts: () => apiRequest<ProductListResponse>('/products'),
  
  getProduct: (id: string) => apiRequest<Product>(`/products/${id}`),
  
  createProduct: (data: {
    retailer: string;
    sku: string;
    name: string;
    priority?: 'high' | 'normal';
    storeLocations?: Array<{ storeId: string; storeName: string; zipCode: string }>;
  }) => apiRequest<Product>('/products', { method: 'POST', body: data }),
  
  updateProduct: (id: string, data: Partial<{
    name: string;
    priority: 'high' | 'normal';
    isActive: boolean;
    storeLocations: Array<{ storeId: string; storeName: string; zipCode: string }>;
  }>) => apiRequest<Product>(`/products/${id}`, { method: 'PATCH', body: data }),
  
  deleteProduct: (id: string) => apiRequest<void>(`/products/${id}`, { method: 'DELETE' }),
  
  getProductHistory: (id: string, limit?: number) => 
    apiRequest<ProductHistoryResponse>(`/products/${id}/history${limit ? `?limit=${limit}` : ''}`),

  // Preferences
  getPreferences: () => apiRequest<UserPreferences>('/preferences'),
  
  updateSmsPreferences: (data: { enabled: boolean; phoneNumber?: string }) =>
    apiRequest<UserPreferences>('/preferences/notifications/sms', { method: 'PUT', body: data }),
  
  updatePushPreferences: (data: { enabled: boolean }) =>
    apiRequest<UserPreferences>('/preferences/notifications/push', { method: 'PUT', body: data }),

  // Health
  getHealth: () => apiRequest<{ status: string; timestamp: string }>('/health'),
};
