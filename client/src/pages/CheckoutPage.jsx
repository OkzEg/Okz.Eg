import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Truck, ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  formatMoney,
  getImageUrl,
  calcShipping,
  FREE_SHIPPING_MIN,
  PAYMENT_METHODS,
  INSTAPAY_HANDLE,
  VODAFONE_CASH_NUMBER,
} from '../utils/helpers';

const ADDRESS_FIELDS = [
  { key: 'street', label: 'Street address', span: true },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'Governorate' },
  { key: 'zip', label: 'Postal code' },
  { key: 'country', label: 'Country' },
];

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const orderPlacedRef = useRef(false);
  const addr = user?.address || {};
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    street: addr.street || '',
    city: addr.city || '',
    state: addr.state || '',
    zip: addr.zip || '',
    country: addr.country || 'Egypt',
    paymentMethod: 'Cash on Delivery',
    couponCode: '',
  });
  const [loading, setLoading] = useState(false);
  const shipping = calcShipping(subtotal);
  const total = subtotal + shipping;

  useEffect(() => {
    // After a successful place-order we clear the cart — don't bounce to empty cart.
    if (!items.length && !orderPlacedRef.current && !loading) {
      navigate('/cart', { replace: true });
    }
  }, [items.length, navigate, loading]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!items.length) return toast.error('Cart is empty');
    if (!form.name.trim() || !form.phone.trim()) {
      return toast.error('Name and phone are required');
    }

    const shippingAddress = {
      street: form.street,
      city: form.city,
      state: form.state,
      zip: form.zip,
      country: form.country,
    };

    const orderItems = items.map((i) => ({
      productId: i.productId,
      qty: i.qty,
      color: i.color,
      size: i.size,
    }));

    setLoading(true);
    try {
      let data;
      if (user) {
        ({ data } = await api.post('/orders', {
          orderItems,
          paymentMethod: form.paymentMethod,
          shippingAddress,
          couponCode: form.couponCode || undefined,
        }));
        if (form.phone && form.phone !== user.phone) {
          try {
            await api.put('/auth/profile', { phone: form.phone });
          } catch {
            /* non-blocking */
          }
        }
      } else {
        ({ data } = await api.post('/orders/guest', {
          orderItems,
          paymentMethod: form.paymentMethod,
          shippingAddress,
          couponCode: form.couponCode || undefined,
          guestName: form.name.trim(),
          guestPhone: form.phone.trim(),
          guestEmail: form.email.trim() || undefined,
        }));
      }

      orderPlacedRef.current = true;
      navigate('/order-success', { state: { order: data }, replace: true });
      clear();
      toast.success('Order placed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  if (!items.length && !orderPlacedRef.current) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-5xl text-timber-900 tracking-wide mb-8">Checkout</h1>

      <form onSubmit={submit} className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <div className="card space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-timber-700">
              Contact
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Full name</label>
                <input required className="input" value={form.name} onChange={set('name')} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  required
                  type="tel"
                  className="input"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="01xxxxxxxxx"
                />
              </div>
              <div>
                <label className="label">Email {user ? '' : '(optional)'}</label>
                <input
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={set('email')}
                  disabled={Boolean(user)}
                />
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-timber-700">
              Shipping address
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {ADDRESS_FIELDS.map(({ key, label, span }) => (
                <div key={key} className={span ? 'md:col-span-2' : ''}>
                  <label className="label">{label}</label>
                  <input
                    required={key === 'street' || key === 'city' || key === 'country'}
                    className="input"
                    value={form[key]}
                    onChange={set(key)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="card space-y-4">
            <div>
              <label className="label">Payment</label>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((method) => {
                  const selected = form.paymentMethod === method.value;
                  return (
                    <label
                      key={method.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition ${
                        selected
                          ? 'border-wheat bg-wheat-50/60'
                          : 'border-timber-200 bg-white hover:border-timber-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        className="mt-1 h-4 w-4 border-timber-300 text-wheat focus:ring-wheat"
                        checked={selected}
                        onChange={() => setForm({ ...form, paymentMethod: method.value })}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-timber-800">
                          {method.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-timber-500">{method.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {form.paymentMethod === 'InstaPay' && (
                <p className="mt-3 rounded-lg bg-cream px-3 py-2.5 text-sm text-timber-600">
                  {INSTAPAY_HANDLE
                    ? <>Send to InstaPay: <span className="font-semibold text-timber-800">{INSTAPAY_HANDLE}</span>. Include your order phone in the note.</>
                    : 'After you place the order, we’ll share our InstaPay details by phone.'}
                </p>
              )}
              {form.paymentMethod === 'Vodafone Cash' && (
                <p className="mt-3 rounded-lg bg-cream px-3 py-2.5 text-sm text-timber-600">
                  {VODAFONE_CASH_NUMBER
                    ? <>Send to Vodafone Cash: <span className="font-semibold text-timber-800">{VODAFONE_CASH_NUMBER}</span>. Include your name in the transfer note.</>
                    : 'After you place the order, we’ll share our Vodafone Cash number by phone.'}
                </p>
              )}
            </div>
            <div>
              <label className="label">Promo code</label>
              <input
                className="input"
                value={form.couponCode}
                onChange={set('couponCode')}
                placeholder="Optional"
              />
            </div>
          </div>

          {!user && (
            <p className="text-sm text-timber-500">
              Checking out as guest.{' '}
              <Link to="/login?redirect=/checkout" className="text-wheat-500 underline-offset-2 hover:underline">
                Sign in
              </Link>{' '}
              if you already have an account.
            </p>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="card space-y-4 lg:sticky lg:top-28">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-timber-700">
                Order summary
              </h2>
              <Link to="/cart" className="text-xs uppercase tracking-wider text-timber-500 underline-offset-2 hover:underline">
                Edit cart
              </Link>
            </div>

            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {items.map((item) => (
                <li
                  key={`${item.productId}-${item.color}-${item.size}`}
                  className="flex gap-3"
                >
                  <img
                    src={getImageUrl(item.image)}
                    alt=""
                    className="h-14 w-14 rounded-lg object-contain object-center bg-timber-100"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-timber-500">
                      {[item.color, item.size && `Size ${item.size}`, `×${item.qty}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <p className="text-sm font-medium tabular-nums">
                    {formatMoney(item.price * item.qty)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="space-y-2 border-t border-timber-100 pt-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>
                  {shipping === 0
                    ? 'Free'
                    : `${formatMoney(shipping)} · free over ${formatMoney(FREE_SHIPPING_MIN)}`}
                </span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-timber-100 pt-3">
                <span>Total</span>
                <span>{formatMoney(total)}</span>
              </div>
            </div>

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

            <button type="submit" className="btn-wheat w-full py-3.5" disabled={loading}>
              {loading ? 'Placing…' : 'Place order'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
