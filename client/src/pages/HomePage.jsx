import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import HeroSlideshow from '../components/store/HeroSlideshow';
import ProductCard from '../components/store/ProductCard';

function ProductGrid({ products, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 md:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square rounded-xl bg-timber-100" />
            <div className="mt-3 h-4 w-3/4 rounded bg-timber-100" />
            <div className="mt-2 h-3 w-1/2 rounded bg-timber-50" />
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) return null;

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 md:gap-6">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const [bestSellers, setBestSellers] = useState([]);
  const [ourProducts, setOurProducts] = useState([]);
  const [loadingBest, setLoadingBest] = useState(true);
  const [loadingOurs, setLoadingOurs] = useState(true);

  useEffect(() => {
    const load = () => {
      api
        .get('/products?collection=best-sellers&limit=8')
        .then((r) => setBestSellers(Array.isArray(r.data) ? r.data : []))
        .catch(() => setBestSellers([]))
        .finally(() => setLoadingBest(false));
      api
        .get('/products?collection=our-products&limit=8')
        .then((r) => setOurProducts(Array.isArray(r.data) ? r.data : []))
        .catch(() => setOurProducts([]))
        .finally(() => setLoadingOurs(false));
    };

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(load, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }

    const t = setTimeout(load, 80);
    return () => clearTimeout(t);
  }, []);

  const showBest = loadingBest || bestSellers.length > 0;
  const showOurs = loadingOurs || ourProducts.length > 0;

  return (
    <div>
      <HeroSlideshow />

      {showBest && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
            <div>
              <h2 className="font-display text-3xl text-timber-900 tracking-wide sm:text-4xl">Best sellers</h2>
              <p className="text-timber-500 mt-1 text-sm sm:text-base">The pieces customers keep coming back for</p>
            </div>
            <Link to="/shop" className="btn-outline btn-sm">
              View all
            </Link>
          </div>
          <ProductGrid products={bestSellers} loading={loadingBest} />
        </section>
      )}

      {showOurs && (
        <section className={`max-w-7xl mx-auto px-4 sm:px-6 ${showBest ? 'pb-10 sm:pb-16' : 'py-10 sm:py-16'}`}>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
            <div>
              <h2 className="font-display text-3xl text-timber-900 tracking-wide sm:text-4xl">New collection</h2>
              <p className="text-timber-500 mt-1 text-sm sm:text-base">Fresh pieces just added to the floor</p>
            </div>
            <Link to="/shop" className="btn-outline btn-sm">
              Shop all
            </Link>
          </div>
          <ProductGrid products={ourProducts} loading={loadingOurs} />
        </section>
      )}

      {!showBest && !showOurs && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <p className="text-timber-500 text-sm">No products yet — check back soon.</p>
        </section>
      )}

      <section className="bg-timber-700 text-white py-14 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid md:grid-cols-3 gap-8 text-center">
          {[
            ['Cash on delivery', 'Pay when your order arrives — no account needed'],
            ['Ships in 2–3 days', 'Cairo & Giza EGP 80 · free over EGP 3,000'],
            ['14-day returns', 'Free size exchange · easy WhatsApp support'],
          ].map(([t, d]) => (
            <div key={t}>
              <h3 className="font-display text-2xl tracking-wide text-wheat">{t}</h3>
              <p className="mt-2 text-timber-300 text-sm">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex justify-center px-4">
          <Link to="/shop" className="btn-wheat px-8 py-3.5 text-sm font-bold uppercase tracking-[0.14em]">
            Shop the collection
          </Link>
        </div>
      </section>
    </div>
  );
}
