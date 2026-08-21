import { Link } from 'react-router-dom';
import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, ShoppingCart } from 'lucide-react';
import { toast } from 'react-toastify';
import { optimizeImageUrl, formatMoney, PRODUCT_TYPES, getAvailableStock } from '../../utils/helpers';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';

export default function ProductCard({ product }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const { isSaved, toggle } = useWishlist();
  const { addItem } = useCart();
  const liked = isSaved(product.id);
  const photos = (product.photos || []).filter(Boolean);
  const price =
    product.isSaleActive && product.salePrice != null ? product.salePrice : product.price;
  const typeLabel =
    PRODUCT_TYPES.find((t) => t.value === product.type)?.label ||
    product.type.replace('_', ' ');
  const defaultSize = product.sizes?.length
    ? product.sizes.find((s) => getAvailableStock(product, s) > 0)
    : null;
  const canAdd = product.sizes?.length
    ? Boolean(defaultSize)
    : (Number(product.stock) || 0) >= 1;

  const touchStartX = useRef(null);
  const swiped = useRef(false);

  const prev = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!photos.length) return;
    setPhotoIndex((i) => (i - 1 + photos.length) % photos.length);
  };

  const next = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!photos.length) return;
    setPhotoIndex((i) => (i + 1) % photos.length);
  };

  const onTouchStart = (e) => {
    if (photos.length < 2) return;
    touchStartX.current = e.changedTouches[0].clientX;
    swiped.current = false;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current == null || photos.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 28) return;
    swiped.current = true;
    setPhotoIndex((i) =>
      dx < 0 ? (i + 1) % photos.length : (i - 1 + photos.length) % photos.length
    );
  };

  const addToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canAdd) return toast.error('Out of stock');
    const size = defaultSize || null;
    const color = product.colors?.[0] || null;
    const stock = getAvailableStock(product, size);
    addItem({ ...product, stock }, 1, color, size);
    toast.success(
      <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>{size ? `Added size ${size}` : 'Added to cart'}</span>
        <Link to="/cart" className="font-semibold underline underline-offset-2">
          View cart
        </Link>
      </span>
    );
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-timber-200/80 bg-white sm:rounded-[16px] sm:transition-all sm:duration-300 sm:hover:-translate-y-0.5 sm:hover:border-wheat-200 sm:hover:shadow-[0_24px_50px_-30px_rgba(61,46,34,0.35)]">
      <div
        className="relative aspect-square overflow-hidden bg-timber-100 touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Link
          to={`/product/${product.id}`}
          className="absolute inset-0"
          onClick={(e) => {
            if (swiped.current) {
              e.preventDefault();
              swiped.current = false;
            }
          }}
        >
          {photos.length ? (
            <img
              src={optimizeImageUrl(photos[photoIndex], { width: 640 })}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain object-center sm:transition sm:duration-500 sm:group-hover:scale-[1.03]"
              draggable={false}
            />
          ) : (
            <span className="grid h-full w-full place-items-center text-xs text-timber-400 sm:text-sm">
              No photo
            </span>
          )}
        </Link>

        {product.isSaleActive && (
          <span className="pointer-events-none absolute start-2 top-2 rounded-full border border-wheat-300 bg-wheat-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-timber-800 sm:start-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[10px]">
            Sale
          </span>
        )}

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute start-1.5 top-1/2 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 shadow-sm transition group-hover:opacity-100 sm:grid"
              aria-label="Previous photo"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute end-1.5 top-1/2 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 shadow-sm transition group-hover:opacity-100 sm:grid"
              aria-label="Next photo"
            >
              <ChevronRight size={16} />
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-1.5 flex justify-center gap-1 sm:bottom-2 sm:gap-1.5">
              {photos.slice(0, 6).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 w-1 rounded-full sm:h-1.5 sm:w-1.5 ${
                    i === photoIndex ? 'bg-timber-800 sm:bg-white' : 'bg-timber-800/30 sm:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        <button
          type="button"
          aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle(product);
          }}
          className="absolute end-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-white/95 shadow-sm sm:end-3 sm:top-3 sm:h-9 sm:w-9"
        >
          <Heart
            className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${liked ? 'fill-red-500 text-red-500' : 'text-timber-800'}`}
          />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 p-2.5 sm:gap-1 sm:p-3.5">
        <Link
          to={`/product/${product.id}`}
          className="line-clamp-2 text-[13px] font-semibold leading-snug text-timber-800 sm:text-[15px]"
        >
          {product.name}
        </Link>
        <p className="hidden truncate text-[13px] text-timber-400 sm:block">
          {typeLabel}
          {product.colors?.length ? ` · ${product.colors.slice(0, 2).join(' · ')}` : ''}
        </p>
        {product.stock < 1 ? (
          <p className="text-[11px] text-red-600 sm:text-[13px]">Out of stock</p>
        ) : product.stock <= 5 ? (
          <p className="text-[11px] font-medium text-amber-700 sm:text-[13px]">
            Only {product.stock} left
          </p>
        ) : (
          <p className="hidden text-[13px] text-timber-400 sm:block">In stock</p>
        )}

        <div className="mt-auto flex items-end justify-between gap-1.5 pt-1.5 sm:items-center sm:gap-2 sm:pt-2">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold tabular-nums leading-tight text-timber-800 sm:text-[19px]">
              {formatMoney(price)}
            </p>
            {product.isSaleActive && product.salePrice != null && (
              <p className="truncate text-[11px] text-timber-400 line-through sm:text-[12.5px]">
                {formatMoney(product.price)}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={!canAdd}
            onClick={addToCart}
            aria-label="Add to cart"
            title={canAdd ? 'Add to cart' : 'Out of stock'}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-timber-200 bg-white text-timber-800 shadow-sm sm:h-10 sm:w-10 sm:transition sm:hover:scale-105 sm:hover:border-timber-400 sm:hover:bg-cream disabled:cursor-not-allowed disabled:border-timber-100 disabled:bg-timber-50 disabled:text-timber-300 disabled:hover:scale-100"
          >
            <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
