import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Truck, ShieldCheck, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import {
  formatMoney,
  getImageUrl,
  calcShipping,
  FREE_SHIPPING_MIN,
} from '../utils/helpers';
import EmptyState from '../components/ui/EmptyState';

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const governorate = user?.address?.state;
  const shipping = calcShipping(subtotal, governorate);
  const remaining = Math.max(0, FREE_SHIPPING_MIN - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_MIN) * 100);

  if (!items.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <EmptyState
          title="Your cart is empty"
          subtitle="Find a pair that fits your trail."
          action={<Link to="/shop" className="btn-wheat">Browse shop</Link>}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-5xl text-timber-900 tracking-wide">Cart</h1>
        <Link to="/shop" className="text-xs font-bold uppercase tracking-[0.16em] text-timber-500 hover:text-wheat">
          Continue shopping
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={`${item.productId}-${item.color}-${item.size}`}
              className="card flex gap-4 items-center !p-4"
            >
              <Link to={`/product/${item.productId}`} className="shrink-0">
                <img
                  src={getImageUrl(item.image)}
                  alt=""
                  className="w-20 h-20 rounded-lg object-contain object-center bg-timber-100"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/product/${item.productId}`}
                  className="font-semibold truncate block hover:text-wheat"
                >
                  {item.name}
                </Link>
                <p className="text-sm text-timber-500">
                  {[item.color, item.size && `Size ${item.size}`].filter(Boolean).join(' · ') || '—'}
                </p>
                <p className="font-medium mt-1">{formatMoney(item.price)}</p>
              </div>
              <div className="inline-flex items-center rounded-xl border border-timber-200 bg-white">
                <button
                  type="button"
                  className="px-2.5 py-2 text-timber-700 hover:bg-timber-50"
                  onClick={() =>
                    updateQty(item.productId, item.color, item.size, Math.max(1, item.qty - 1))
                  }
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums">
                  {item.qty}
                </span>
                <button
                  type="button"
                  className="px-2.5 py-2 text-timber-700 hover:bg-timber-50"
                  onClick={() =>
                    updateQty(item.productId, item.color, item.size, item.qty + 1)
                  }
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                className="btn-ghost btn-sm shrink-0 text-red-600 hover:bg-red-50"
                onClick={() => removeItem(item.productId, item.color, item.size)}
                aria-label="Remove item"
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="card h-fit space-y-4 lg:sticky lg:top-28">
          <div className="rounded-xl bg-wheat-50/80 border border-wheat-100 p-3">
            {remaining > 0 ? (
              <>
                <p className="text-sm text-timber-700">
                  You’re <span className="font-semibold">{formatMoney(remaining)}</span> away from
                  free shipping
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-wheat transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm font-medium text-timber-700">You’ve unlocked free shipping</p>
            )}
          </div>

          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : formatMoney(shipping)}</span>
          </div>
          <p className="text-xs text-timber-400 -mt-2">
            Cairo & Giza EGP 80 · other governorates EGP 110 · free over{' '}
            {formatMoney(FREE_SHIPPING_MIN)}
          </p>
          <div className="flex justify-between font-bold text-lg border-t border-timber-100 pt-3">
            <span>Total</span>
            <span>{formatMoney(subtotal + shipping)}</span>
          </div>

          <button
            type="button"
            className="btn-wheat w-full py-3.5"
            onClick={() => navigate('/checkout')}
          >
            Checkout
          </button>

          <div className="space-y-2 text-xs text-timber-500">
            <p className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 shrink-0" />
              Ships in 2–3 business days · Cash on delivery
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <Link to="/returns" className="underline-offset-2 hover:underline">
                14-day returns
              </Link>{' '}
              on unworn items
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
