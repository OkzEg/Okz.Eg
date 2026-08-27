import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Minus, Pencil, Plus, Truck, ShieldCheck, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Modal from '../components/ui/Modal';
import {
  formatMoney,
  getImageUrl,
  getAvailableStock,
  calcShipping,
  FREE_SHIPPING_MIN,
} from '../utils/helpers';
import EmptyState from '../components/ui/EmptyState';

export default function CartPage() {
  const { items, updateQty, updateItem, removeItem, subtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const governorate = user?.address?.state;
  const shipping = calcShipping(subtotal, governorate);
  const remaining = Math.max(0, FREE_SHIPPING_MIN - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_MIN) * 100);

  const [editing, setEditing] = useState(null);
  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [editColor, setEditColor] = useState(null);
  const [editSize, setEditSize] = useState(null);
  const [editQty, setEditQty] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setProduct(null);
      return;
    }
    let cancelled = false;
    setLoadingProduct(true);
    setEditColor(editing.color || null);
    setEditSize(editing.size || null);
    setEditQty(editing.qty || 1);
    api
      .get(`/products/${editing.productId}`)
      .then((r) => {
        if (cancelled) return;
        const p = r.data;
        setProduct(p);
        const colors = p.colors || [];
        const sizes = p.sizes || [];
        setEditColor((prev) =>
          colors.length ? (colors.includes(prev) ? prev : colors[0]) : null
        );
        setEditSize((prev) =>
          sizes.length ? (sizes.includes(prev) ? prev : sizes[0]) : null
        );
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Could not load product options');
          setEditing(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProduct(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editing]);

  const availableStock = product ? getAvailableStock(product, editSize) : 0;

  useEffect(() => {
    if (!product) return;
    setEditQty((q) => Math.min(Math.max(1, q), Math.max(1, availableStock || 1)));
  }, [product, editSize, availableStock]);

  const saveEdit = () => {
    if (!editing || !product) return;
    if (product.colors?.length && !editColor) {
      toast.error('Select a color');
      return;
    }
    if (product.sizes?.length && !editSize) {
      toast.error('Select a size');
      return;
    }
    if (availableStock < 1) {
      toast.error('Selected option is out of stock');
      return;
    }
    setSaving(true);
    updateItem(
      { productId: editing.productId, color: editing.color, size: editing.size },
      {
        color: editColor,
        size: editSize,
        qty: Math.min(editQty, availableStock),
        stock: availableStock,
        image: product.photos?.[0] || editing.image,
      }
    );
    toast.success('Cart item updated');
    setSaving(false);
    setEditing(null);
  };

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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
        <h1 className="font-display text-4xl text-timber-900 tracking-wide sm:text-5xl">Cart</h1>
        <Link to="/shop" className="text-xs font-bold uppercase tracking-[0.16em] text-timber-500 hover:text-wheat">
          Continue shopping
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={`${item.productId}-${item.color}-${item.size}`}
              className="card flex flex-col gap-3 !p-3 sm:flex-row sm:items-center sm:gap-4 sm:!p-4"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Link to={`/product/${item.productId}`} className="shrink-0">
                  <img
                    src={getImageUrl(item.image)}
                    alt=""
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-contain object-center bg-timber-100"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${item.productId}`}
                    className="font-semibold truncate block hover:text-wheat text-sm sm:text-base"
                  >
                    {item.name}
                  </Link>
                  <p className="text-sm text-timber-500">
                    {[item.color, item.size && `Size ${item.size}`].filter(Boolean).join(' · ') || '—'}
                  </p>
                  <p className="font-medium mt-1">{formatMoney(item.price)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
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
                  className="btn-ghost btn-sm shrink-0 text-timber-700 hover:bg-timber-50"
                  onClick={() => setEditing(item)}
                  aria-label="Edit item"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
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
            Checkout — pay on delivery
          </button>

          <div className="space-y-2 text-xs text-timber-500">
            <p className="flex items-start gap-2">
              <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Cairo & Giza shipping EGP 80 · delivers in 2–3 days · guest checkout OK
              </span>
            </p>
            <p className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Wrong size? Free exchange ·{' '}
                <Link to="/returns" className="underline-offset-2 hover:underline">
                  Returns policy
                </Link>
              </span>
            </p>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Edit · ${editing.name}` : 'Edit item'}
      >
        {loadingProduct ? (
          <p className="py-8 text-center text-sm text-timber-400">Loading options…</p>
        ) : product ? (
          <div className="space-y-5">
            {product.colors?.length > 0 && (
              <div>
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-timber-700">
                  Color
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        editColor === c
                          ? 'border-timber-800 bg-timber-800 text-white'
                          : 'border-timber-200 bg-white text-timber-800 hover:border-timber-500'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.sizes?.length > 0 && (
              <div>
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-timber-700">
                  Size
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => {
                    const sizeStock = getAvailableStock(product, s);
                    const outOfSize = sizeStock < 1;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => !outOfSize && setEditSize(s)}
                        disabled={outOfSize}
                        className={`min-w-[3rem] rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                          outOfSize
                            ? 'cursor-not-allowed border-timber-100 bg-timber-50 text-timber-300 line-through'
                            : editSize === s
                              ? 'border-timber-800 bg-timber-800 text-white'
                              : 'border-timber-200 bg-white text-timber-800 hover:border-timber-500'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-timber-700">
                Quantity
              </span>
              <div className="inline-flex items-center rounded-xl border border-timber-200 bg-white">
                <button
                  type="button"
                  className="px-3 py-2.5 text-timber-700 hover:bg-timber-50"
                  onClick={() => setEditQty((q) => Math.max(1, q - 1))}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums">
                  {editQty}
                </span>
                <button
                  type="button"
                  className="px-3 py-2.5 text-timber-700 hover:bg-timber-50 disabled:opacity-40"
                  onClick={() =>
                    setEditQty((q) => Math.min(availableStock || 1, q + 1))
                  }
                  disabled={editQty >= availableStock}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-xs text-timber-400">
                {availableStock > 0 ? `${availableStock} in stock` : 'Out of stock'}
              </p>
            </div>

            <button
              type="button"
              className="btn-wheat w-full py-3"
              onClick={saveEdit}
              disabled={saving || availableStock < 1}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
