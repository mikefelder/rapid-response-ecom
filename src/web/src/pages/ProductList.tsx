import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';

export default function ProductList() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: api.getProducts,
    refetchInterval: 30000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.updateProduct(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const products = data?.products ?? [];

  const handleToggleActive = (id: string, isActive: boolean) => {
    toggleMutation.mutate({ id, isActive });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 border-red-200">
        <p className="text-red-700">Error loading products: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1">{products.length} products being monitored</p>
        </div>
        <Link to="/products/add" className="btn btn-primary">
          + Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button className="badge badge-gray hover:bg-gray-200">All</button>
        <button className="badge hover:bg-green-100">In Stock</button>
        <button className="badge hover:bg-red-100">Out of Stock</button>
        <button className="badge hover:bg-yellow-100">High Priority</button>
      </div>

      {/* Product list */}
      {products.length === 0 ? (
        <div className="card text-center py-12">
          <span className="text-6xl mb-4 block">📦</span>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No products yet</h2>
          <p className="text-gray-500 mb-6">
            Start monitoring high-demand products to get instant notifications when they're in stock.
          </p>
          <Link to="/products/add" className="btn btn-primary">
            Add your first product
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
