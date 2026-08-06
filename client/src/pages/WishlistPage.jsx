import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/store/ProductCard';
import EmptyState from '../components/ui/EmptyState';
import { toast } from 'react-toastify';

export default function WishlistPage() {
  const { items, remove, clear } = useWishlist();
  const { addItem } = useCart();

  if (!items.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <EmptyState
          title="Your wishlist is empty"
          subtitle="Tap the heart on any product to save it here."
          action={<Link to="/shop" className="btn-wheat">Browse shop</Link>}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl text-timber-800 tracking-wide">Wishlist</h1>
          <p className="mt-1 text-sm text-timber-500">
            {items.length} saved {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <button type="button" className="btn-outline btn-sm" onClick={clear}>
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {items.map((item) => (
          <div key={item.id} className="relative">
            <ProductCard
              product={{
                id: item.id,
                name: item.name,
                photos: item.photos?.length ? item.photos : [item.image],
                price: item.originalPrice ?? item.price,
                salePrice: item.salePrice,
                isSaleActive: item.isSaleActive,
                type: item.type,
                colors: item.colors,
                stock: item.stock,
              }}
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="btn-wheat btn-sm flex-1"
                disabled={item.stock < 1}
                onClick={() => {
                  addItem(
                    {
                      id: item.id,
                      name: item.name,
                      photos: item.photos?.length ? item.photos : [item.image],
                      price: item.originalPrice ?? item.price,
                      salePrice: item.salePrice,
                      isSaleActive: item.isSaleActive,
                      stock: item.stock,
                    },
                    1
                  );
                  toast.success('Added to cart');
                }}
              >
                {item.stock < 1 ? 'Out of stock' : 'Add to cart'}
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm text-red-600"
                aria-label="Remove from wishlist"
                onClick={() => remove(item.id)}
              >
                <Heart className="h-4 w-4 fill-red-500 text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
