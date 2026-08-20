import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ImagePlus, Truck, ShieldCheck, X } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import AddressFields from '../components/store/AddressFields';
import {
  formatMoney,
  getImageUrl,
  calcShipping,
  FREE_SHIPPING_MIN,
  PAYMENT_METHODS,
  INSTAPAY_HANDLE,
  INSTAPAY_URL,
  VODAFONE_CASH_NUMBER,
  isDigitalPayment,
} from '../utils/helpers';

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const orderPlacedRef = useRef(false);
  const receiptInputRef = useRef(null);
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
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const shipping = calcShipping(subtotal, form.state);
  const total = subtotal + shipping;
  const needsReceipt = isDigitalPayment(form.paymentMethod);

  useEffect(() => {
    // After a successful place-order we clear the cart — don't bounce to empty cart.
    if (!items.length && !orderPlacedRef.current && !loading) {
      navigate('/cart', { replace: true });
    }
  }, [items.length, navigate, loading]);

  useEffect(() => {
    if (!receiptFile) {
      setReceiptPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(receiptFile);
    setReceiptPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const setAddress = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const clearReceipt = () => {
    setReceiptFile(null);
    if (receiptInputRef.current) receiptInputRef.current.value = '';
  };

  const onPaymentChange = (method) => {
    setForm((current) => ({ ...current, paymentMethod: method }));
    if (!isDigitalPayment(method)) clearReceipt();
  };

  const onReceiptPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Receipt must be an image screenshot');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      toast.error('Receipt image must be under 8 MB');
      e.target.value = '';
      return;
    }
    setReceiptFile(file);
  };

  const uploadReceipt = async () => {
    const body = new FormData();
    body.append('image', receiptFile);
    const { data } = await api.post('/upload/receipt', body);
    if (!data?.url) throw new Error('Receipt upload failed');
    return data.url;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!items.length) return toast.error('Cart is empty');
    if (!form.name.trim() || !form.phone.trim()) {
      return toast.error('Name and phone are required');
    }
    if (!form.email.trim()) {
      return toast.error('Email is required');
    }
    if (needsReceipt && !receiptFile) {
      return toast.error('Upload your transaction receipt screenshot before placing the order');
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
      let paymentReceiptUrl;
      if (needsReceipt) {
        paymentReceiptUrl = await uploadReceipt();
      }

      const payload = {
        orderItems,
        paymentMethod: form.paymentMethod,
        shippingAddress,
        couponCode: form.couponCode || undefined,
        paymentReceiptUrl,
      };

      let data;
      if (user) {
        ({ data } = await api.post('/orders', payload));
        if (form.phone && form.phone !== user.phone) {
          try {
            await api.put('/auth/profile', { phone: form.phone });
          } catch {
            /* non-blocking */
          }
        }
      } else {
        ({ data } = await api.post('/orders/guest', {
          ...payload,
          guestName: form.name.trim(),
          guestPhone: form.phone.trim(),
          guestEmail: form.email.trim(),
        }));
      }

      orderPlacedRef.current = true;
      navigate('/order-success', { state: { order: data }, replace: true });
      clear();
      toast.success('Order placed');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  if (!items.length && !orderPlacedRef.current) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="font-display text-4xl text-timber-900 tracking-wide mb-6 sm:mb-8 sm:text-5xl">Checkout</h1>

      <form onSubmit={submit} className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <div className="card space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-timber-700">
              Contact
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
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
                <label className="label">Email</label>
                <input
                  required
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
            <AddressFields
              idPrefix="checkout"
              values={form}
              onChange={setAddress}
            />
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
                        onChange={() => onPaymentChange(method.value)}
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
                <div className="mt-3 space-y-3 rounded-lg bg-cream px-3 py-3 text-sm text-timber-600">
                  <p>
                    Open InstaPay, complete the transfer, then upload your receipt below. Include your
                    order phone in the note.
                  </p>
                  {INSTAPAY_URL ? (
                    <a
                      href={INSTAPAY_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-wheat inline-flex w-full sm:w-auto"
                    >
                      Open InstaPay
                    </a>
                  ) : INSTAPAY_HANDLE ? (
                    <p>
                      Send to InstaPay:{' '}
                      <span className="font-semibold text-timber-800">{INSTAPAY_HANDLE}</span>
                    </p>
                  ) : null}
                </div>
              )}
              {form.paymentMethod === 'Vodafone Cash' && (
                <p className="mt-3 rounded-lg bg-cream px-3 py-2.5 text-sm text-timber-600">
                  {VODAFONE_CASH_NUMBER
                    ? <>Send to Vodafone Cash: <span className="font-semibold text-timber-800">{VODAFONE_CASH_NUMBER}</span>. Include your name in the transfer note, then upload the receipt below.</>
                    : 'Transfer via Vodafone Cash, then upload your receipt below. We’ll confirm once we review it.'}
                </p>
              )}
            </div>

            {needsReceipt && (
              <div className="space-y-3 rounded-xl border border-dashed border-timber-300 bg-cream/50 p-4">
                <div>
                  <p className="text-sm font-semibold text-timber-800">Transaction receipt</p>
                  <p className="mt-1 text-xs text-timber-500">
                    Upload a clear screenshot of your payment confirmation. Required before placing
                    the order.
                  </p>
                </div>
                <input
                  ref={receiptInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={onReceiptPick}
                />
                {receiptPreview ? (
                  <div className="relative inline-block">
                    <img
                      src={receiptPreview}
                      alt="Payment receipt preview"
                      className="h-40 w-auto max-w-full rounded-lg border border-timber-200 object-contain bg-white"
                    />
                    <button
                      type="button"
                      className="absolute -end-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-timber-800 text-white shadow"
                      onClick={clearReceipt}
                      aria-label="Remove receipt"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="btn-outline btn-sm mt-3"
                      onClick={() => receiptInputRef.current?.click()}
                    >
                      Replace screenshot
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-outline w-full sm:w-auto"
                    onClick={() => receiptInputRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                    Upload receipt screenshot
                  </button>
                )}
              </div>
            )}

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
              <div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'Free' : formatMoney(shipping)}</span>
                </div>
                <p className="mt-1 text-xs text-timber-400">
                  {form.state === 'Cairo' || form.state === 'Giza'
                    ? 'Cairo & Giza EGP 80'
                    : form.state
                      ? 'Other governorates EGP 110'
                      : 'Cairo & Giza EGP 80 · other governorates EGP 110'}
                  {` · free over ${formatMoney(FREE_SHIPPING_MIN)}`}
                </p>
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

            <button
              type="submit"
              className="btn-wheat w-full py-3.5"
              disabled={loading || (needsReceipt && !receiptFile)}
            >
              {loading ? 'Placing…' : 'Place order'}
            </button>
            {needsReceipt && !receiptFile && (
              <p className="text-center text-xs text-timber-500">
                Upload a payment receipt to enable Place order
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
