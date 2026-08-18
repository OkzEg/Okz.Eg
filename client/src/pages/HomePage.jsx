import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import HeroSlideshow from '../components/store/HeroSlideshow';
import ProductCard from '../components/store/ProductCard';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    const loadProducts = () => {
      api
        .get('/products?limit=8')
        .then((r) => setProducts(r.data))
        .catch(() => setProducts([]))
        .finally(() => setLoadingProducts(false));
    };

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(loadProducts, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }

    const t = setTimeout(loadProducts, 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      <HeroSlideshow />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-4xl text-timber-900 tracking-wide">Featured</h2>
            <p className="text-timber-500 mt-1">Handpicked pieces from the floor</p>
          </div>
          <Link to="/shop" className="btn-outline btn-sm">
            View all
          </Link>
        </div>
        {loadingProducts ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square rounded-xl bg-timber-100" />
                <div className="mt-3 h-4 w-3/4 rounded bg-timber-100" />
                <div className="mt-2 h-3 w-1/2 rounded bg-timber-50" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-timber-500 text-sm">No products yet — check back soon.</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-timber-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid md:grid-cols-3 gap-8 text-center">
          {[
            ['Premium leather', 'Materials selected for lasting wear'],
            ['Trail to town', 'Styles that move with your day'],
            ['Cash on delivery', 'Pay when your order arrives'],
          ].map(([t, d]) => (
            <div key={t}>
              <h3 className="font-display text-2xl tracking-wide text-wheat">{t}</h3>
              <p className="mt-2 text-timber-300 text-sm">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
