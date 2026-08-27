import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/store/ProductCard';
import EmptyState from '../components/ui/EmptyState';
import api from '../api/axios';

export default function WishlistPage() {
  const { items, clear, replaceAll } = useWishlist();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!items.length) return undefined;
    let cancelled = false;

    const refresh = async () => {
      setRefreshing(true);
      try {
        const updated = await Promise.all(
          items.map(async (item) => {
            try {
              const { data } = await api.get(`/products/${item.id}`);
              return data;
            } catch {
              return item;
            }
          })
        );
        if (!cancelled) replaceAll(updated.filter(Boolean));
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    };

    refresh();
    return () => {
      cancelled = true;
    };
    // Refresh once when the page mounts / saved ids change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.id).join(',')]);

  if (!items.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <EmptyState
          title="Your wishlist is empty"
          subtitle="Tap the heart on any product to save it here."
          action={
            <Link to="/shop" className="btn-wheat">
              Browse shop
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
        <div>
          <h1 className="font-display text-4xl text-timber-800 tracking-wide sm:text-5xl">
            Wishlist
          </h1>
          <p className="mt-1 text-sm text-timber-500">
            {items.length} saved {items.length === 1 ? 'item' : 'items'}
            {refreshing ? ' · updating…' : ''}
          </p>
        </div>
        <button type="button" className="btn-outline btn-sm" onClick={clear}>
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:gap-6 lg:grid-cols-4">
        {items.map((item) => (
          <ProductCard
            key={item.id}
            product={{
              id: item.id,
              name: item.name,
              photos: item.photos?.length ? item.photos : item.image ? [item.image] : [],
              price: item.originalPrice ?? item.price,
              salePrice: item.salePrice,
              isSaleActive: item.isSaleActive,
              type: item.type,
              colors: item.colors || [],
              sizes: item.sizes || [],
              sizeStock: item.sizeStock || {},
              stock: item.stock,
            }}
          />
        ))}
      </div>
    </div>
  );
}
