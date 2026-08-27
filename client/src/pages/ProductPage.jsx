import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  formatMoney,
  optimizeImageUrl,
  getAvailableStock,
  PRODUCT_TYPES,
  FREE_SHIPPING_MIN,
} from '../utils/helpers';
import ProductReviews from '../components/store/ProductReviews';

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
  shoe: 'مقاسك مضبوط 100%؟ لو طلع مش مقاسك، الاستبدال مجاني',
  belt: 'Measure your usual waist and match the chart.',
  default: 'مقاسك مضبوط 100%؟ لو طلع مش مقاسك، الاستبدال مجاني',
};

function TrustRow({ itemPrice }) {
  const price = Number(itemPrice) || 0;
  const needsMore = price > 0 && price < FREE_SHIPPING_MIN;
  const remaining = Math.max(0, FREE_SHIPPING_MIN - price);

  return (
    <ul className="mt-5 space-y-2.5 rounded-2xl border border-timber-100 bg-white/80 px-4 py-3.5 text-sm text-timber-600">
      <li className="flex items-start gap-2.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-wheat" />
        <span dir="rtl" lang="ar" className="text-right leading-relaxed">
          معاينة المنتج وافحصه قبل ما تدفع للمندوب
        </span>
      </li>
      <li className="flex items-start gap-2.5">
        <Truck className="mt-0.5 h-4 w-4 shrink-0 text-wheat" />
        <span dir="rtl" lang="ar" className="text-right leading-relaxed">
          الشحن ٨٠ ج.م للقاهرة والجيزة · توصيل خلال ٢-٣ أيام
          {needsMore ? (
            <span className="block mt-1 text-xs text-timber-500" dir="ltr">
              +{formatMoney(remaining)} for free shipping
            </span>
          ) : null}
        </span>
      </li>
      <li className="flex items-start gap-2.5">
        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-wheat" />
        <span dir="rtl" lang="ar" className="text-right leading-relaxed">
          مقاسك مضبوط 100%؟ لو طلع مش مقاسك، الاستبدال مجاني ·{' '}
          <Link to="/returns" className="font-semibold text-timber-800 underline-offset-2 hover:underline">
            سياسة الإرجاع
          </Link>
        </span>
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
  const [sizeError, setSizeError] = useState(false);
  const sizeSectionRef = useRef(null);
  const stickySizeRef = useRef(null);

  useEffect(() => {
    api.get(`/products/${id}`).then((r) => {
      setProduct(r.data);
      setColor(r.data.colors?.[0] || '');
      setSize('');
      setSizeError(false);
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
  const needsSize = Boolean(product.sizes?.length);
  const availableStock = getAvailableStock(product, size || null);
  const lowStock = size && availableStock > 0 && availableStock <= 5;
  const sizeGuide = sizeGuideByType[product.type] || sizeGuideByType.default;
  const care = careByType[product.type] || careByType.default;
  const fitTip = fitTipByType[product.type] || fitTipByType.default;
  const liked = isSaved(product.id);
  const hasStickySizes = needsSize;

  const pickSize = (s) => {
    setSize(s);
    setSizeError(false);
  };

  const guardSize = () => {
    if (!needsSize || size) return true;
    setSizeError(true);
    stickySizeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    sizeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast.error('من فضلك اختر المقاس أولاً');
    return false;
  };

  const add = (goCheckout = false) => {
    if (needsSize && !guardSize()) return;
    if (availableStock < 1) return toast.error('Out of stock');
    if (product.colors?.length && !color) return toast.error('Select a color');
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

  const sizeChipClass = (s, outOfSize) => {
    if (outOfSize) {
      return 'cursor-not-allowed border-timber-100 bg-timber-50 text-timber-300 line-through';
    }
    if (size === s) return 'border-timber-800 bg-timber-800 text-white';
    if (sizeError) return 'border-wheat bg-wheat-50 text-timber-800 size-guard-pulse';
    return 'border-timber-200 bg-white text-timber-800 hover:border-timber-500';
  };

  return (
    <div
      className={`bg-[#faf8f4] lg:pb-0 ${
        hasStickySizes
          ? 'pb-[calc(9.75rem+env(safe-area-inset-bottom))]'
          : 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]'
      }`}
    >
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
                  width={1200}
                  height={1200}
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-contain object-center"
                />
              ) : (
                <div className="grid h-full place-items-center text-timber-400">No photo</div>
              )}
              {product.isSaleActive && (
                <span className="absolute left-4 top-4 rounded-full border border-wheat-300 bg-wheat-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-timber-800">
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

            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="text-2xl font-semibold tabular-nums text-timber-900">
                {formatMoney(price)}
              </span>
              {product.isSaleActive && product.salePrice != null && (
                <span className="text-base text-timber-400 line-through">
                  {formatMoney(product.price)}
                </span>
              )}
            </div>
            <p
              dir="rtl"
              lang="ar"
              className="mt-2 inline-flex items-center rounded-full bg-wheat-50 px-2.5 py-1 text-[11px] font-semibold text-timber-800"
            >
              معاينة المنتج وافحصه قبل ما تدفع للمندوب
            </p>
            <p dir="rtl" lang="ar" className="mt-2 text-sm text-timber-500">
              الشحن ٨٠ ج.م للقاهرة والجيزة · توصيل خلال ٢-٣ أيام
            </p>

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

            {needsSize && (
              <div ref={sizeSectionRef} className="mt-7">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-timber-700">
                    Size / المقاس
                  </span>
                  <button
                    type="button"
                    className="text-xs uppercase tracking-wider text-timber-500 underline-offset-2 hover:underline"
                    onClick={() => setOpenSection('size')}
                  >
                    Size chart
                  </button>
                </div>
                <p dir="rtl" lang="ar" className="mb-3 text-sm text-timber-500 text-right">
                  {fitTip}
                </p>
                {sizeError && (
                  <p
                    dir="rtl"
                    lang="ar"
                    className="mb-2 text-sm font-semibold text-wheat-600"
                    role="alert"
                  >
                    من فضلك اختر المقاس أولاً
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => {
                    const sizeStock = getAvailableStock(product, s);
                    const outOfSize = sizeStock < 1;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => !outOfSize && pickSize(s)}
                        disabled={outOfSize}
                        className={`min-w-[3rem] rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${sizeChipClass(
                          s,
                          outOfSize
                        )}`}
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
                  onClick={() => setQty((q) => Math.min(availableStock || 1, q + 1))}
                  disabled={(needsSize && !size) || qty >= availableStock}
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
            {size && availableStock < 1 && (
              <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-red-600">
                Out of stock
              </p>
            )}

            <div className="mt-6 hidden gap-3 lg:flex">
              <button
                type="button"
                className="btn-outline flex-1 py-3.5 text-sm font-bold uppercase tracking-[0.14em]"
                onClick={() => add(false)}
              >
                <ShoppingCart className="h-4 w-4" />
                Add to cart
              </button>
              <button
                type="button"
                className="btn-wheat flex-1 py-3.5 text-sm font-bold tracking-[0.04em]"
                onClick={() => add(true)}
                dir="rtl"
                lang="ar"
              >
                شراء الآن — الدفع عند الاستلام
              </button>
            </div>

            <TrustRow itemPrice={price} />

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
                <p dir="rtl" lang="ar" className="text-sm leading-relaxed text-right">
                  الشحن ٨٠ ج.م للقاهرة والجيزة · توصيل خلال ٢-٣ أيام · باقي المحافظات ١١٠ ج.م ·
                  مجاني فوق {formatMoney(FREE_SHIPPING_MIN)}
                </p>
                <p dir="rtl" lang="ar" className="mt-2 text-sm text-timber-500 text-right">
                  معاينة المنتج وافحصه قبل ما تدفع للمندوب
                </p>
              </Accordion>
            </div>
          </div>
        </div>

        <ProductReviews productId={product.id} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-timber-200 bg-cream/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-md sm:px-4 lg:hidden">
        <div className="mx-auto max-w-7xl space-y-2">
          {needsSize && (
            <div ref={stickySizeRef}>
              {sizeError && (
                <p
                  dir="rtl"
                  lang="ar"
                  className="mb-1.5 text-center text-xs font-semibold text-wheat-600"
                  role="alert"
                >
                  من فضلك اختر المقاس أولاً
                </p>
              )}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {product.sizes.map((s) => {
                  const sizeStock = getAvailableStock(product, s);
                  const outOfSize = sizeStock < 1;
                  return (
                    <button
                      key={`sticky-${s}`}
                      type="button"
                      onClick={() => !outOfSize && pickSize(s)}
                      disabled={outOfSize}
                      className={`min-h-10 min-w-[2.75rem] shrink-0 rounded-lg border px-2.5 text-sm font-semibold transition ${sizeChipClass(
                        s,
                        outOfSize
                      )}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-timber-900">{product.name}</p>
              <p className="text-sm tabular-nums text-timber-600">
                {formatMoney(price)}
                {size ? ` · ${size}` : needsSize ? ' · اختر المقاس' : ''}
              </p>
            </div>
            <button
              type="button"
              className="btn-outline shrink-0 px-2.5 py-3"
              onClick={() => add(false)}
              aria-label="Add to cart"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="btn-wheat min-h-12 max-w-[58%] shrink-0 px-3 py-2.5 text-[12px] font-bold leading-snug sm:max-w-none sm:px-4 sm:text-[13px]"
              onClick={() => add(true)}
              dir="rtl"
              lang="ar"
            >
              <span className="sm:hidden">شراء الآن · COD</span>
              <span className="hidden sm:inline">شراء الآن — الدفع عند الاستلام</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
