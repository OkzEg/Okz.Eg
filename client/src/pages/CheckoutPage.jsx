import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ImagePlus, Truck, ShieldCheck, Wallet, X } from 'lucide-react';
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
  ONLINE_WALLET_NUMBER,
  isDigitalPayment,
} from '../utils/helpers';

const MAX_RECEIPT_BYTES = 3 * 1024 * 1024;
const TURNSTILE_SITE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();
const EGYPT_PHONE_RE = /^(?:\+?20)?0?1[0125]\d{8}$/;

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const orderPlacedRef = useRef(false);
  const placingRef = useRef(false);
  const receiptInputRef = useRef(null);
  const turnstileRef = useRef(null);
  const turnstileWidgetId = useRef(null);
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
    website: '',
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [loading, setLoading] = useState(false);
  const shipping = calcShipping(subtotal, form.state);
  const total = subtotal + shipping;
  const needsReceipt = isDigitalPayment(form.paymentMethod);

  useEffect(() => {
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

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current) return undefined;

    const renderWidget = () => {
      if (!window.turnstile || !turnstileRef.current || turnstileWidgetId.current != null) return;
      turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken(''),
      });
    };

    if (window.turnstile) {
      renderWidget();
      return undefined;
    }

    const existing = document.querySelector('script[data-okz-turnstile]');
    if (existing) {
      existing.addEventListener('load', renderWidget);
      return () => existing.removeEventListener('load', renderWidget);
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.dataset.okzTurnstile = '1';
    script.addEventListener('load', renderWidget);
    document.head.appendChild(script);
    return () => script.removeEventListener('load', renderWidget);
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const setAddress = (patch) => setForm((current) => ({ ...current, ...patch }));

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
      toast.error('Receipt image must be under 3 MB');
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
    if (placingRef.current || orderPlacedRef.current) return;
    if (!items.length) return toast.error('Cart is empty');
    if (!form.name.trim() || !form.phone.trim()) {
      return toast.error('Name and phone are required');
    }
    if (!EGYPT_PHONE_RE.test(form.phone.replace(/\s+/g, ''))) {
      return toast.error('Enter a valid Egyptian mobile (01xxxxxxxxx)');
    }
    if (!form.street.trim() || !form.state.trim()) {
      return toast.error('Governorate and detailed address are required');
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return toast.error('Enter a valid email or leave it blank');
    }
    if (needsReceipt && !receiptFile) {
      return toast.error('Upload your transaction receipt screenshot before placing the order');
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      return toast.error('Complete the security check before placing the order');
    }

    const shippingAddress = {
      street: form.street,
      city: form.city || form.state,
      state: form.state,
      zip: form.zip,
      country: form.country || 'Egypt',
    };

    const orderItems = items.map((i) => ({
      productId: i.productId,
      qty: i.qty,
      color: i.color,
      size: i.size,
    }));

    placingRef.current = true;
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
        couponCode: String(form.couponCode || '').trim() || undefined,
        paymentReceiptUrl,
        website: form.website,
        turnstileToken: turnstileToken || undefined,
      };

      let data;
      if (user) {
        ({ data } = await api.post('/orders', {
          ...payload,
          contactName: form.name.trim(),
          contactPhone: form.phone.trim(),
          contactEmail: form.email.trim() || undefined,
        }));
        if (form.phone && form.phone !== user.phone) {
          try {
            await api.put('/auth/profile', { phone: form.phone });
          } catch {}
        }
      } else {
        ({ data } = await api.post('/orders/guest', {
          ...payload,
          guestName: form.name.trim(),
          guestPhone: form.phone.trim(),
          guestEmail: form.email.trim() || undefined,
        }));
      }

      orderPlacedRef.current = true;
      navigate('/order-success', { state: { order: data }, replace: true });
      clear();
      toast.success('Order placed — we will confirm it shortly');
    } catch (err) {
      placingRef.current = false;
      setTurnstileToken('');
      if (window.turnstile && turnstileWidgetId.current != null) {
        try {
          window.turnstile.reset(turnstileWidgetId.current);
        } catch {}
      }
      toast.error(err.response?.data?.message || err.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  if (!items.length && !orderPlacedRef.current) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="font-display text-4xl text-timber-900 tracking-wide mb-6 sm:mb-8 sm:text-5xl">Checkout</h1>

      <form onSubmit={submit} className="grid lg:grid-cols-5 gap-8" autoComplete="on">
        <div
          aria-hidden="true"
          style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}
        >
          <label htmlFor="checkout-website">Website</label>
          <input
            id="checkout-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={set('website')}
          />
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-xl border border-wheat-200 bg-wheat-50/70 px-4 py-3 text-sm text-timber-700">
            <p className="font-semibold text-timber-900">
              Inspect before you pay the courier
            </p>
            <p className="mt-1 text-timber-600">
              Cash on delivery is selected by default — no account needed.
            </p>
          </div>

          <div className="card space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-timber-700">
              Delivery details
            </h2>
            <div className="grid gap-4">
              <div>
                <label className="label">Full name</label>
                <input
                  required
                  className="input"
                  value={form.name}
                  onChange={set('name')}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="label">Mobile number</label>
                <input
                  required
                  type="tel"
                  className="input"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="01xxxxxxxxx"
                  pattern="^(?:\+?20)?0?1[0125]\d{8}$"
                  title="Egyptian mobile: 01xxxxxxxxx"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
            </div>
            <AddressFields
              idPrefix="checkout"
              values={form}
              onChange={setAddress}
              compact
            />
            <details className="rounded-lg border border-timber-100 bg-cream/40 px-3 py-2">
              <summary className="cursor-pointer text-sm text-timber-500">
                Email (optional) — for order confirmation
              </summary>
              <div className="mt-3">
                <input
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={set('email')}
                  disabled={Boolean(user)}
                  placeholder="name@email.com"
                  autoComplete="email"
                />
              </div>
            </details>
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
                          {method.value === 'Cash on Delivery' ? (
                            <span className="ms-2 rounded-full bg-wheat-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-timber-800">
                              Recommended
                            </span>
                          ) : null}
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
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-timber-300 bg-transparent px-4 py-2.5 text-sm font-semibold text-timber-800 hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-wheat focus:ring-offset-2 sm:w-auto"
                    >
                      <Wallet className="h-4 w-4" strokeWidth={2} />
                      InstaPay
                    </a>
                  ) : INSTAPAY_HANDLE ? (
                    <p>
                      Send to InstaPay:{' '}
                      <span className="font-semibold text-timber-800">{INSTAPAY_HANDLE}</span>
                    </p>
                  ) : null}
                </div>
              )}
              {form.paymentMethod === 'Online Wallet' && (
                <p className="mt-3 rounded-lg bg-cream px-3 py-2.5 text-sm text-timber-600">
                  {ONLINE_WALLET_NUMBER
                    ? <>Send to Online Wallet: <span className="font-semibold text-timber-800">{ONLINE_WALLET_NUMBER}</span>. Include your name in the transfer note, then upload the receipt below.</>
                    : 'Transfer via Online Wallet, then upload your receipt below. We’ll confirm once we review it.'}
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
                  accept="image/jpeg,image/png,image/webp,image/gif"
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

            <details className="rounded-lg border border-timber-100 bg-cream/40 px-3 py-2">
              <summary className="cursor-pointer text-sm text-timber-500">
                Promo code (optional)
              </summary>
              <div className="mt-3">
                <input
                  className="input"
                  value={form.couponCode}
                  onChange={set('couponCode')}
                  placeholder="Optional"
                />
              </div>
            </details>

            {TURNSTILE_SITE_KEY ? (
              <div className="pt-1">
                <div ref={turnstileRef} />
              </div>
            ) : null}
          </div>

          {!user && (
            <p className="text-sm text-timber-500">
              Ordering as a guest.{' '}
              <Link to="/login?redirect=/checkout" className="text-wheat-500 underline-offset-2 hover:underline">
                Already have an account? Sign in
              </Link>
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
              <p className="flex items-start gap-2">
                <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {form.paymentMethod === 'Cash on Delivery'
                    ? 'Pay cash on delivery · Cairo & Giza EGP 80 · ships in 2–3 days'
                    : 'We’ll confirm payment, then ship in 2–3 days'}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Inspect before you pay ·{' '}
                  <Link to="/returns" className="underline-offset-2 hover:underline">
                    free size exchange
                  </Link>
                </span>
              </p>
            </div>

            <button
              type="submit"
              className="btn-wheat w-full py-3.5"
              disabled={
                loading ||
                (needsReceipt && !receiptFile) ||
                (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)
              }
            >
              {loading
                ? 'Placing…'
                : form.paymentMethod === 'Cash on Delivery'
                  ? 'Place COD order'
                  : 'Place order'}
            </button>
            {needsReceipt && !receiptFile && (
              <p className="text-center text-xs text-timber-500">
                Upload a payment receipt to enable Place order
              </p>
            )}
            {!needsReceipt && (
              <p className="text-center text-xs text-timber-500">
                No payment now — you pay when the order arrives
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
