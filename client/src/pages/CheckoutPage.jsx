import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatMoney } from '../utils/helpers';

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const addr = user?.address || {};
  const [form, setForm] = useState({
    street: addr.street || '',
    city: addr.city || '',
    state: addr.state || '',
    zip: addr.zip || '',
    country: addr.country || 'Egypt',
    paymentMethod: 'Cash on Delivery',
    couponCode: '',
  });
  const [loading, setLoading] = useState(false);
  const shipping = subtotal >= 2000 || subtotal === 0 ? 0 : 75;

  const submit = async (e) => {
    e.preventDefault();
    if (!items.length) return toast.error('Cart is empty');
    setLoading(true);
    try {
      const { data } = await api.post('/orders', {
        orderItems: items.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          color: i.color,
          size: i.size,
        })),
        paymentMethod: form.paymentMethod,
        shippingAddress: {
          street: form.street,
          city: form.city,
          state: form.state,
          zip: form.zip,
          country: form.country,
        },
        couponCode: form.couponCode || undefined,
      });
      clear();
      toast.success('Order placed');
      navigate(`/order/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-display text-5xl text-timber-900 tracking-wide mb-8">Checkout</h1>
      <form onSubmit={submit} className="card space-y-4">
        <div className="form-grid grid md:grid-cols-2 gap-4">
          {['street', 'city', 'state', 'zip', 'country'].map((field) => (
            <div key={field} className={field === 'street' ? 'md:col-span-2' : ''}>
              <label className="label capitalize">{field}</label>
              <input
                required
                className="input"
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div>
          <label className="label">Payment</label>
          <select
            className="input"
            value={form.paymentMethod}
            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
          >
            <option>Cash on Delivery</option>
            <option>Card on Delivery</option>
          </select>
        </div>
        <div>
          <label className="label">Promo code</label>
          <input
            className="input"
            value={form.couponCode}
            onChange={(e) => setForm({ ...form, couponCode: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="flex justify-between font-semibold border-t border-timber-100 pt-4">
          <span>Estimated total</span>
          <span>{formatMoney(subtotal + shipping)}</span>
        </div>
        <button type="submit" className="btn-wheat w-full" disabled={loading}>
          {loading ? 'Placing…' : 'Place order'}
        </button>
      </form>
    </div>
  );
}
