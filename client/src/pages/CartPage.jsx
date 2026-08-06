import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatMoney, getImageUrl } from '../utils/helpers';
import EmptyState from '../components/ui/EmptyState';

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const shipping = subtotal >= 2000 || subtotal === 0 ? 0 : 75;

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
      <h1 className="font-display text-5xl text-timber-900 tracking-wide mb-8">Cart</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={`${item.productId}-${item.color}-${item.size}`}
              className="card flex gap-4 items-center !p-4"
            >
              <img
                src={getImageUrl(item.image)}
                alt=""
                className="w-20 h-20 rounded-lg object-cover bg-timber-100"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{item.name}</h3>
                <p className="text-sm text-timber-500">
                  {[item.color, item.size && `Size ${item.size}`].filter(Boolean).join(' · ') || '—'}
                </p>
                <p className="font-medium mt-1">{formatMoney(item.price)}</p>
              </div>
              <input
                type="number"
                min={1}
                className="input w-20"
                value={item.qty}
                onChange={(e) =>
                  updateQty(item.productId, item.color, item.size, Number(e.target.value) || 1)
                }
              />
              <button
                type="button"
                className="btn-ghost btn-sm text-red-600"
                onClick={() => removeItem(item.productId, item.color, item.size)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="card h-fit space-y-3">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : formatMoney(shipping)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t border-timber-100 pt-3">
            <span>Total</span>
            <span>{formatMoney(subtotal + shipping)}</span>
          </div>
          <button
            type="button"
            className="btn-wheat w-full"
            onClick={() => {
              if (!user) return navigate('/login?redirect=/checkout');
              navigate('/checkout');
            }}
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
