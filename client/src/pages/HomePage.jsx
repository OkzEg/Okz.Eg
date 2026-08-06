import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import ProductCard from '../components/store/ProductCard';
import { getImageUrl } from '../utils/helpers';

export default function HomePage() {
  const [slides, setSlides] = useState([]);
  const [products, setProducts] = useState([]);
  const [index, setIndex] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    api.get('/slides').then((r) => setSlides(r.data)).catch(() => {});
    api
      .get('/products?limit=8')
      .then((r) => setProducts(r.data))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = slides[index];

  return (
    <div>
      <section className="relative min-h-[100svh] w-full overflow-hidden bg-timber-800">
        {slide && (
          <img
            key={slide.id}
            src={getImageUrl(slide.cloudinaryUrl)}
            alt={slide.title}
            className="absolute inset-0 w-full h-full object-cover opacity-70 animate-[fadeIn_0.8s_ease]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-timber-800/95 via-timber-700/60 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 min-h-[100svh] flex items-center">
          <div className="max-w-xl text-white pt-28 pb-20">
            <h1 className="font-display text-6xl sm:text-7xl leading-[0.95] tracking-wide">
              {slide?.title || 'Built for the long haul.'}
            </h1>
            <p className="mt-5 text-timber-200 text-lg max-w-md text-balance">
              {slide?.description ||
                'Premium boots, belts, and gear from OKZ — ready for work and weekend.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-wheat btn-lg">Shop collection</Link>
              <Link to="/shop?type=shoe" className="btn-outline btn-lg border-white/30 text-white hover:bg-white/10">
                Explore boots
              </Link>
            </div>
          </div>
        </div>
        {slides.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-8 bg-wheat' : 'w-2 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-4xl text-timber-900 tracking-wide">Featured</h2>
            <p className="text-timber-500 mt-1">Handpicked pieces from the floor</p>
          </div>
          <Link to="/shop" className="btn-outline btn-sm">View all</Link>
        </div>
        {loadingProducts ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/5] rounded-xl bg-timber-100" />
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

      <style>{`@keyframes fadeIn { from { opacity: 0.4; } to { opacity: 0.7; } }`}</style>
    </div>
  );
}
