import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function Dashboard() {
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: api.getProducts,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 60000,
  });

  const products = productsData?.products ?? [];
  const inStockCount = products.filter(p => 
    p.currentStatus.online.available || p.currentStatus.stores.some(s => s.available)
  ).length;
  const activeCount = products.filter(p => p.isActive).length;
  const highPriorityCount = products.filter(p => p.priority === 'high').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Monitor your high-demand products</p>
        </div>
        <Link to="/products/add" className="btn btn-primary">
          + Add Product
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={products.length}
          icon="📦"
          color="blue"
        />
        <StatCard
          title="In Stock"
          value={inStockCount}
          icon="✅"
          color="green"
        />
        <StatCard
          title="Actively Monitoring"
          value={activeCount}
          icon="👁"
          color="purple"
        />
        <StatCard
          title="High Priority"
          value={highPriorityCount}
          icon="⚡"
          color="yellow"
        />
      </div>

      {/* Quick status */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${health?.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
          <span className="text-gray-700">
            {health?.status === 'healthy' ? 'All systems operational' : 'System degraded'}
          </span>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Monitored Products</h2>
          <Link to="/products" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View all →
          </Link>
        </div>

        {productsLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No products being monitored yet</p>
            <Link to="/products/add" className="btn btn-primary">
              Add your first product
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {products.slice(0, 5).map((product) => {
              const isAvailable = product.currentStatus.online.available || 
                product.currentStatus.stores.some(s => s.available);
              return (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="font-medium text-gray-900">{product.name}</span>
                    <span className="text-gray-500 text-sm">{product.retailer}</span>
                  </div>
                  <span className={`badge ${isAvailable ? 'badge-green' : 'badge-red'}`}>
                    {isAvailable ? 'In Stock' : 'Out of Stock'}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    yellow: 'bg-yellow-50 text-yellow-700',
  }[color] ?? 'bg-gray-50 text-gray-700';

  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses}`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{title}</p>
        </div>
      </div>
    </div>
  );
}
