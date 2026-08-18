import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ChevronDown,
  Heart,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import api from '../api/axios';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { formatMoney, optimizeImageUrl, getAvailableStock, PRODUCT_TYPES, FREE_SHIPPING_MIN } from '../utils/helpers';

function Accordion({ title, open, onToggle, children }) {
  return (
    <div className="border-b border-timber-200">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-timber-800">
          {title}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-timber-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="pb-5 text-sm leading-relaxed text-timber-600">{children}</div>}
    </div>
  );
}

const sizeGuideByType = {
  shoe: [
    ['EU', '40', '41', '42', '43', '44', '45'],
    ['US Men', '7', '8', '8.5', '9.5', '10.5', '11.5'],
    ['UK', '6', '7', '8', '9', '10', '11'],
  ],
  belt: [
    ['Size', 'S', 'M', 'L', 'XL'],
    ['Waist (cm)', '75–85', '85–95', '95–105', '105–115'],
  ],
  default: [
    ['Tip', 'Measure against a pair you already own.'],
    ['Fit', 'True to size — size up for thicker socks or wider feet.'],
  ],
};

const careByType = {
  shoe: [
    'Wipe with a soft dry cloth after wear',
    'Condition leather every few weeks',
    'Avoid prolonged soaking or machine wash',
    'Air dry away from direct heat',
    'Store with cedar trees when possible',
  ],
  socks: [
    'Wash cold 30°C max',
    'Wash inside out',
    'Gentle cycle only',
    'Do not tumble dry',
    'Air dry only',
  ],
  default: [
    'Spot clean when needed',
    'Keep away from harsh chemicals',
    'Store in a cool, dry place',
    'Avoid prolonged direct sunlight',
  ],
};

const fitTipByType = {
  shoe: 'True to size — size up for thicker socks or wider feet.',
  belt: 'Measure your usual waist and match the chart.',
  default: 'True to size for most customers.',
};

function TrustRow() {
  return (
    <ul className="mt-4 space-y-2 text-sm text-timber-500">
      <li className="flex items-center gap-2">
        <Truck className="h-4 w-4 shrink-0 text-timber-400" />
        Ships in 2–3 business days · Cash on delivery
      </li>
      <li className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0 text-timber-400" />
        Free shipping on orders over {formatMoney(FREE_SHIPPING_MIN)}
      </li>
      <li className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 shrink-0 text-timber-400" />
        <Link to="/returns" className="underline-offset-2 hover:underline">
          14-day returns
        </Link>{' '}
        on unworn items
      </li>
    </ul>
  );
}

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isSaved, toggle } = useWishlist();
  const [product, setProduct] = useState(null);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [activePhoto, setActivePhoto] = useState(0);
  const [openSection, setOpenSection] = useState('details');

  useEffect(() => {
    api.get(`/products/${id}`).then((r) => {
      setProduct(r.data);
      setColor(r.data.colors?.[0] || '');
      const firstInStock = r.data.sizes?.find((s) => getAvailableStock(r.data, s) > 0);
      setSize(firstInStock || r.data.sizes?.[0] || '');
      setActivePhoto(0);
      setQty(1);
    });
  }, [id]);

  useEffect(() => {
    setQty(1);
  }, [size]);

  const detailBullets = useMemo(() => {
    if (!product?.description) return [];
    return product.description
      .split(/\n|•|\u2022/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [product]);

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-timber-400">Loading…</div>
    );
  }

  const price =
    product.isSaleActive && product.salePrice != null ? product.salePrice : product.price;
  const photos = product.photos?.length ? product.photos : [''];
  const typeLabel =
    PRODUCT_TYPES.find((t) => t.value === product.type)?.label ||
    product.type.replace('_', ' ');
  const availableStock = getAvailableStock(product, size);
  const lowStock = availableStock > 0 && availableStock <= 5;
  const sizeGuide = sizeGuideByType[product.type] || sizeGuideByType.default;
  const care = careByType[product.type] || careByType.default;
  const fitTip = fitTipByType[product.type] || fitTipByType.default;
  const liked = isSaved(product.id);
  const canAdd = availableStock >= 1;

  const add = (goCheckout = false) => {
    if (availableStock < 1) return toast.error('Out of stock');
    if (product.colors?.length && !color) return toast.error('Select a color');
    if (product.sizes?.length && !size) return toast.error('Select a size');
    addItem({ ...product, stock: availableStock }, qty, color || null, size || null);
    if (goCheckout) {
      navigate('/checkout');
      return;
    }
    toast.success(
      <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>Added to cart</span>
        <Link to="/cart" className="font-semibold underline underline-offset-2">
          View cart
        </Link>
        <Link to="/checkout" className="font-semibold underline underline-offset-2">
          Checkout
        </Link>
      </span>
    );
  };

  const toggleSection = (key) =>
    setOpenSection((current) => (current === key ? '' : key));

  return (
    <div className="bg-[#faf8f4] pb-24 lg:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <nav className="mb-6 text-xs uppercase tracking-wider text-timber-400">
          <Link to="/shop" className="hover:text-timber-700">
            Shop
          </Link>
          <span className="mx-2">/</span>
          <span className="text-timber-600">{typeLabel}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="space-y-3">
            <div className="relative aspect-square overflow-hidden rounded-[16px] border border-timber-200/70 bg-timber-100 shadow-[0_18px_40px_-28px_rgba(61,46,34,0.45)]">
              {photos[activePhoto] ? (
                <img
                  src={optimizeImageUrl(photos[activePhoto], { width: 1200 })}
                  alt={product.name}
                  decoding="async"
                  className="h-full w-full object-contain object-center"
                />
              ) : (
                <div className="grid h-full place-items-center text-timber-400">No photo</div>
              )}
              {product.isSaleActive && (
                <span className="absolute left-4 top-4 rounded-full bg-timber-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-wheat">
                  Sale
                </span>
              )}
              <button
                type="button"
                onClick={() => toggle(product)}
                className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/95 shadow-sm"
                aria-label={liked ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <Heart
                  className={`h-5 w-5 ${liked ? 'fill-wheat text-wheat' : 'text-timber-700'}`}
                />
              </button>
            </div>

            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((p, i) => (
                  <button
                    key={`${p}-${i}`}
                    type="button"
                    onClick={() => setActivePhoto(i)}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      i === activePhoto
                        ? 'border-timber-800'
                        : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={optimizeImageUrl(p, { width: 160 })}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain object-center bg-timber-50"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-timber-400">
              {typeLabel}
            </p>
            <h1 className="mt-2 font-display text-4xl tracking-wide text-timber-900 sm:text-5xl">
              {product.name}
            </h1>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-2xl font-semibold tabular-nums text-timber-900">
                {formatMoney(price)}
              </span>
              {product.isSaleActive && product.salePrice != null && (
                <span className="text-base text-timber-400 line-through">
                  {formatMoney(product.price)}
                </span>
              )}
            </div>

            {product.colors?.length > 0 && (
              <div className="mt-8">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-timber-700">
                    Color
                  </span>
                  <span className="text-sm text-timber-500">{color}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        color === c
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
              <div className="mt-7">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-timber-700">
                    Size
                  </span>
                  <button
                    type="button"
                    className="text-xs uppercase tracking-wider text-timber-500 underline-offset-2 hover:underline"
                    onClick={() => setOpenSection('size')}
                  >
                    Size chart
                  </button>
                </div>
                <p className="mb-3 text-sm text-timber-500">{fitTip}</p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => {
                    const sizeStock = getAvailableStock(product, s);
                    const outOfSize = sizeStock < 1;
                    return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => !outOfSize && setSize(s)}
                      disabled={outOfSize}
                      className={`min-w-[3rem] rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                        outOfSize
                          ? 'cursor-not-allowed border-timber-100 bg-timber-50 text-timber-300 line-through'
                          : size === s
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

            <div className="mt-7">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-timber-700">
                Quantity
              </span>
              <div className="inline-flex items-center rounded-xl border border-timber-200 bg-white">
                <button
                  type="button"
                  className="px-3 py-2.5 text-timber-700 hover:bg-timber-50"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums">
                  {qty}
                </span>
                <button
                  type="button"
                  className="px-3 py-2.5 text-timber-700 hover:bg-timber-50"
                  onClick={() =>
                    setQty((q) => Math.min(availableStock || 1, q + 1))
                  }
                  disabled={qty >= availableStock}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {lowStock && (
              <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-amber-700">
                Low stock — only {availableStock} left
              </p>
            )}
            {availableStock < 1 && (
              <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-red-600">
                Out of stock
              </p>
            )}
            {availableStock > 5 && (
              <p className="mt-4 text-sm text-timber-500">In stock</p>
            )}

            <div className="mt-6 hidden gap-3 lg:flex">
              <button
                type="button"
                className="btn-outline flex-1 py-3.5 text-sm font-bold uppercase tracking-[0.14em]"
                onClick={() => add(false)}
                disabled={!canAdd}
              >
                <ShoppingCart className="h-4 w-4" />
                Add to cart
              </button>
              <button
                type="button"
                className="btn-wheat flex-1 py-3.5 text-sm font-bold uppercase tracking-[0.14em]"
                onClick={() => add(true)}
                disabled={!canAdd}
              >
                Buy now
              </button>
            </div>

            <TrustRow />

            <div className="mt-10 border-t border-timber-200">
              <Accordion
                title="Product details"
                open={openSection === 'details'}
                onToggle={() => toggleSection('details')}
              >
                {detailBullets.length > 1 ? (
                  <ul className="space-y-2">
                    {detailBullets.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-timber-400" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{product.description}</p>
                )}
              </Accordion>

              <Accordion
                title="Size chart"
                open={openSection === 'size'}
                onToggle={() => toggleSection('size')}
              >
                {Array.isArray(sizeGuide[0]) && sizeGuide[0].length > 2 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[280px] text-left text-xs">
                      <tbody>
                        {sizeGuide.map((row) => (
                          <tr key={row[0]} className="border-b border-timber-100">
                            {row.map((cell, i) => (
                              <td
                                key={`${row[0]}-${i}`}
                                className={`px-2 py-2 ${
                                  i === 0 ? 'font-semibold text-timber-800' : 'text-timber-600'
                                }`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {sizeGuide.map(([label, value]) => (
                      <li key={label}>
                        <span className="font-semibold text-timber-800">{label}: </span>
                        {value}
                      </li>
                    ))}
                  </ul>
                )}
                {product.sizes?.length > 0 && (
                  <p className="mt-3 text-timber-500">
                    Available sizes: {product.sizes.join(', ')}
                  </p>
                )}
              </Accordion>

              <Accordion
                title="Care instructions"
                open={openSection === 'care'}
                onToggle={() => toggleSection('care')}
              >
                <ul className="space-y-2">
                  {care.map((line) => (
                    <li key={line} className="uppercase tracking-wide text-[12px]">
                      {line}
                    </li>
                  ))}
                </ul>
              </Accordion>

              <Accordion
                title="Delivery"
                open={openSection === 'delivery'}
                onToggle={() => toggleSection('delivery')}
              >
                <p className="uppercase tracking-wide text-[12px]">
                  Orders take 2–3 business days
                </p>
                <p className="mt-2 text-timber-500">
                  Cash on delivery, InstaPay, and Vodafone Cash available at checkout. Free shipping on
                  orders over EGP 2,000.
                </p>
              </Accordion>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky ATC */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-timber-200 bg-cream/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-timber-900">{product.name}</p>
            <p className="text-sm tabular-nums text-timber-600">{formatMoney(price)}</p>
          </div>
          <button
            type="button"
            className="btn-outline shrink-0 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em]"
            onClick={() => add(false)}
            disabled={!canAdd}
            aria-label="Add to cart"
          >
            <ShoppingCart className="h-4 w-4" />
            Cart
          </button>
          <button
            type="button"
            className="btn-wheat shrink-0 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em]"
            onClick={() => add(true)}
            disabled={!canAdd}
          >
            Buy now
          </button>
        </div>
      </div>
    </div>
  );
}
