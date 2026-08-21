import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import api from '../api/axios';
import ProductCard from '../components/store/ProductCard';
import { PRODUCT_TYPES } from '../utils/helpers';
import EmptyState from '../components/ui/EmptyState';

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

function parseBound(raw) {
  const trimmed = String(raw ?? '').trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function FiltersPanel({
  embedded = false,
  onClose,
  selectedTypes,
  selectedColors,
  selectedSizes,
  availableColors,
  availableSizes,
  minInput,
  maxInput,
  onMinChange,
  onMaxChange,
  onPriceBlur,
  onToggleType,
  onToggleColor,
  onToggleSize,
  onClear,
}) {
  return (
    <div
      className={
        embedded
          ? 'flex h-full flex-col'
          : 'flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-2xl border border-timber-200/80 bg-white p-5 shadow-[0_12px_40px_rgba(61,46,34,0.08)]'
      }
    >
      <div className="mb-5 shrink-0">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-timber-400">
          Filters
        </p>
        <h2 className="mt-1.5 font-display text-2xl tracking-wide text-timber-800">
          Find your gear
        </h2>
        <p className="mt-1 text-[13px] text-timber-400">Results update as you filter.</p>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto pr-1">
        <div className="rounded-xl border border-timber-100 bg-cream/40 p-3.5">
          <label className="mb-2.5 block text-[10.5px] font-bold uppercase tracking-wider text-timber-500">
            Category
          </label>
          <div className="space-y-2.5">
            {PRODUCT_TYPES.map((t) => (
              <label
                key={t.value}
                className="flex cursor-pointer items-center gap-3 text-sm text-timber-700"
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(t.value)}
                  onChange={() => onToggleType(t.value)}
                  className="h-4 w-4 rounded border-timber-300 text-timber-800 focus:ring-wheat"
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        {availableColors.length > 0 && (
          <div className="rounded-xl border border-timber-100 bg-cream/40 p-3.5">
            <label className="mb-2.5 block text-[10.5px] font-bold uppercase tracking-wider text-timber-500">
              Colors
            </label>
            <div className="flex flex-wrap gap-2">
              {availableColors.map((c) => {
                const active = selectedColors.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onToggleColor(c)}
                    aria-pressed={active}
                    className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                      active
                        ? 'border-timber-800 bg-timber-800 text-white'
                        : 'border-timber-200 bg-white text-timber-700 hover:border-timber-500'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {availableSizes.length > 0 && (
          <div className="rounded-xl border border-timber-100 bg-cream/40 p-3.5">
            <label className="mb-2.5 block text-[10.5px] font-bold uppercase tracking-wider text-timber-500">
              Sizes
            </label>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((s) => {
                const active = selectedSizes.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onToggleSize(s)}
                    className={`min-w-[2.5rem] rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'border-timber-800 bg-timber-800 text-white'
                        : 'border-timber-200 bg-white text-timber-700 hover:border-timber-500'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-timber-100 bg-cream/40 p-3.5">
          <label className="mb-2.5 block text-[10.5px] font-bold uppercase tracking-wider text-timber-500">
            Price range (EGP)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="Min"
              className="w-full rounded-xl border border-timber-200 bg-white px-3.5 py-2.5 text-sm text-timber-800 placeholder:text-timber-300 focus:border-timber-500 focus:outline-none focus:ring-2 focus:ring-wheat/30"
              value={minInput}
              onChange={(e) => onMinChange(e.target.value)}
              onBlur={onPriceBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onPriceBlur();
                  e.currentTarget.blur();
                }
              }}
            />
            <input
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="Max"
              className="w-full rounded-xl border border-timber-200 bg-white px-3.5 py-2.5 text-sm text-timber-800 placeholder:text-timber-300 focus:border-timber-500 focus:outline-none focus:ring-2 focus:ring-wheat/30"
              value={maxInput}
              onChange={(e) => onMaxChange(e.target.value)}
              onBlur={onPriceBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onPriceBlur();
                  e.currentTarget.blur();
                }
              }}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          onClear();
          onClose?.();
        }}
        className="mt-5 w-full shrink-0 rounded-xl border border-timber-200 bg-white px-4 py-2.5 text-sm font-medium text-timber-600 transition hover:border-timber-500 hover:text-timber-800"
      >
        Clear filters
      </button>
    </div>
  );
}

export default function ShopPage() {
  const [params, setParams] = useSearchParams();
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileFilters, setMobileFilters] = useState(false);

  const selectedTypes = useMemo(() => {
    if (params.get('types')) return params.get('types').split(',').filter(Boolean);
    if (params.get('type')) return [params.get('type')];
    return [];
  }, [params]);

  const selectedColors = useMemo(
    () => (params.get('colors') ? params.get('colors').split(',').filter(Boolean) : []),
    [params]
  );
  const selectedSizes = useMemo(
    () => (params.get('sizes') ? params.get('sizes').split(',').filter(Boolean) : []),
    [params]
  );

  const sort = params.get('sort') || 'recommended';
  const [minInput, setMinInput] = useState(() => params.get('min') || '');
  const [maxInput, setMaxInput] = useState(() => params.get('max') || '');

  useEffect(() => {
    setLoading(true);
    api
      .get('/products')
      .then((r) => setAllProducts(r.data))
      .catch(() => setAllProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const patchParams = (updates) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || value == null || (Array.isArray(value) && value.length === 0)) {
        next.delete(key);
      } else if (Array.isArray(value)) {
        next.set(key, value.join(','));
      } else {
        next.set(key, String(value));
      }
    });
    setParams(next);
  };

  const applyPriceToUrl = () => {
    const min = parseBound(minInput);
    const max = parseBound(maxInput);
    patchParams({
      min: min == null ? '' : String(min),
      max: max == null ? '' : String(max),
    });
  };

  const toggleType = (value) => {
    const set = new Set(selectedTypes);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    const next = new URLSearchParams(params);
    next.delete('type');
    if (set.size) next.set('types', [...set].join(','));
    else next.delete('types');
    setParams(next);
  };

  const toggleInList = (key, current, value) => {
    const set = new Set(current);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    patchParams({ [key]: [...set] });
  };

  const clearFilters = () => {
    setParams(new URLSearchParams());
    setMinInput('');
    setMaxInput('');
  };

  const effectivePrice = (p) =>
    p.isSaleActive && p.salePrice != null ? Number(p.salePrice) : Number(p.price);

  const availableColors = useMemo(() => {
    const set = new Set();
    allProducts.forEach((p) => (p.colors || []).forEach((c) => set.add(c)));
    return [...set].sort();
  }, [allProducts]);

  const availableSizes = useMemo(() => {
    const set = new Set();
    allProducts.forEach((p) => (p.sizes || []).forEach((s) => set.add(s)));
    return [...set].sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return String(a).localeCompare(String(b));
    });
  }, [allProducts]);

  const products = useMemo(() => {
    let list = [...allProducts];

    if (selectedTypes.length) {
      list = list.filter((p) => selectedTypes.includes(p.type));
    }
    if (selectedColors.length) {
      list = list.filter((p) => (p.colors || []).some((c) => selectedColors.includes(c)));
    }
    if (selectedSizes.length) {
      list = list.filter((p) => (p.sizes || []).some((s) => selectedSizes.includes(s)));
    }

    let min = parseBound(minInput);
    let max = parseBound(maxInput);
    if (min != null && max != null && min > max) {
      const swap = min;
      min = max;
      max = swap;
    }
    if (min != null) {
      list = list.filter((p) => effectivePrice(p) >= min);
    }
    if (max != null) {
      list = list.filter((p) => effectivePrice(p) <= max);
    }

    switch (sort) {
      case 'price_asc':
        list.sort((a, b) => effectivePrice(a) - effectivePrice(b));
        break;
      case 'price_desc':
        list.sort((a, b) => effectivePrice(b) - effectivePrice(a));
        break;
      case 'newest':
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        list.sort(
          (a, b) =>
            (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) ||
            new Date(b.createdAt) - new Date(a.createdAt)
        );
    }

    return list;
  }, [
    allProducts,
    selectedTypes,
    selectedColors,
    selectedSizes,
    minInput,
    maxInput,
    sort,
  ]);

  const filterProps = {
    selectedTypes,
    selectedColors,
    selectedSizes,
    availableColors,
    availableSizes,
    minInput,
    maxInput,
    onMinChange: setMinInput,
    onMaxChange: setMaxInput,
    onPriceBlur: applyPriceToUrl,
    onToggleType: toggleType,
    onToggleColor: (c) => toggleInList('colors', selectedColors, c),
    onToggleSize: (s) => toggleInList('sizes', selectedSizes, s),
    onClear: clearFilters,
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#faf8f4]">
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <FiltersPanel {...filterProps} />
            </div>
          </aside>

          <section>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-4xl tracking-wide text-timber-800 sm:text-5xl">
                  All products
                </h1>
                <p className="mt-2 text-sm text-timber-400">
                  {loading
                    ? 'Loading…'
                    : `${products.length} item${products.length === 1 ? '' : 's'} available`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-timber-200 bg-white px-4 py-2 text-sm font-medium text-timber-700 shadow-sm lg:hidden"
                  onClick={() => setMobileFilters(true)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </button>

                <label className="relative inline-flex items-center">
                  <span className="sr-only">Sort</span>
                  <select
                    value={sort}
                    onChange={(e) => patchParams({ sort: e.target.value })}
                    className="appearance-none rounded-full border border-timber-200 bg-white py-2 pl-4 pr-10 text-sm text-timber-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-wheat/30"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        Sort: {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-timber-400" />
                </label>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse overflow-hidden rounded-[16px] border border-timber-100 bg-white"
                  >
                    <div className="aspect-square bg-timber-100" />
                    <div className="space-y-2 p-3.5">
                      <div className="h-4 w-4/5 rounded bg-timber-100" />
                      <div className="h-3 w-2/5 rounded bg-timber-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-2xl border border-timber-200/80 bg-white p-8 shadow-[0_12px_40px_rgba(61,46,34,0.06)]">
                <EmptyState
                  title="No products found"
                  subtitle="Try clearing filters or adjusting category, color, size, or price."
                  action={
                    <button type="button" onClick={clearFilters} className="btn-dark btn-sm">
                      Clear filters
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {mobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-timber-900/40" onClick={() => setMobileFilters(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,360px)] flex-col bg-[#f7f4ef] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-timber-800">Filters</span>
              <button type="button" className="rounded-full p-2 hover:bg-white" onClick={() => setMobileFilters(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-timber-200/80 bg-white p-4 shadow-sm">
              <FiltersPanel
                {...filterProps}
                embedded
                onClose={() => setMobileFilters(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
