import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { optimizeImageUrl, formatMoney, PRODUCT_TYPES } from '../../utils/helpers';
import { useWishlist } from '../../context/WishlistContext';

export default function ProductCard({ product }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const { isSaved, toggle } = useWishlist();
  const liked = isSaved(product.id);
  const photos = (product.photos || []).filter(Boolean);
  const price =
    product.isSaleActive && product.salePrice != null ? product.salePrice : product.price;
  const typeLabel =
    PRODUCT_TYPES.find((t) => t.value === product.type)?.label ||
    product.type.replace('_', ' ');
  const colorLabel =
    product.colors?.length > 0 ? product.colors.slice(0, 2).join(' · ') : 'Standard';

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

  return (
    <Link
      to={`/product/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-[16px] border border-timber-200/80 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-wheat-200 hover:shadow-[0_24px_50px_-30px_rgba(61,46,34,0.35)]"
    >
      <div className="relative aspect-square overflow-hidden bg-timber-100">
        {photos.length ? (
          <img
            src={optimizeImageUrl(photos[photoIndex], { width: 640 })}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain object-center transition duration-500 group-hover:scale-[1.03]"
            draggable={false}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-sm text-timber-400">
            No photo
          </div>
        )}

        {product.isSaleActive && (
          <span className="absolute start-3 top-3 rounded-full bg-timber-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-wheat">
            Sale
          </span>
        )}

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute start-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 shadow-sm transition group-hover:opacity-100"
              aria-label="Previous photo"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute end-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 shadow-sm transition group-hover:opacity-100"
              aria-label="Next photo"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {photos.slice(0, 6).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${
                    i === photoIndex ? 'bg-white' : 'bg-white/50'
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
          className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-sm transition hover:scale-105"
        >
          <Heart
            className={`h-4 w-4 ${liked ? 'fill-red-500 text-red-500' : 'text-timber-800'}`}
          />
        </button>
      </div>

      <div className="flex flex-col gap-1 p-3.5">
        <h3 className="text-[15px] font-semibold leading-snug text-timber-800 line-clamp-2">
          {product.name}
        </h3>
        <p className="text-[13px] text-timber-400">
          {typeLabel} · {colorLabel}
        </p>
        <p
          className={`text-[13px] ${
            product.stock < 1
              ? 'text-red-600'
              : product.stock <= 5
                ? 'font-medium text-amber-700'
                : 'text-timber-400'
          }`}
        >
          {product.stock < 1
            ? 'Out of stock'
            : product.stock <= 5
              ? `Only ${product.stock} left`
              : 'In stock'}
        </p>

        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[19px] font-semibold tabular-nums text-timber-800">
            {formatMoney(price)}
          </span>
          {product.isSaleActive && product.salePrice != null && (
            <span className="text-[12.5px] text-timber-400 line-through">
              {formatMoney(product.price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
