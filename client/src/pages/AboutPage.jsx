import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { getImageUrl } from '../utils/helpers';

export default function AboutPage() {
  const [products, setProducts] = useState([]);
  const [slides, setSlides] = useState([]);

  useEffect(() => {
    api
      .get('/products')
      .then((r) => setProducts(Array.isArray(r.data) ? r.data : []))
      .catch(() => setProducts([]));
    api
      .get('/slides')
      .then((r) => setSlides(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSlides([]));
  }, []);

  const gallery = useMemo(() => {
    const fromProducts = products
      .flatMap((p) => (p.photos || []).slice(0, 2).map((src) => ({ src, alt: p.name })))
      .filter((p) => p.src);
    const fromSlides = slides
      .map((s) => ({ src: s.cloudinaryUrl, alt: s.title || 'OKZ' }))
      .filter((p) => p.src);
    const merged = [...fromSlides, ...fromProducts];
    const seen = new Set();
    return merged.filter((p) => {
      const url = getImageUrl(p.src);
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    }).slice(0, 9);
  }, [products, slides]);

  const hero = gallery[0];

  return (
    <div className="bg-[#faf8f4]">
      <section className="relative min-h-[70svh] overflow-hidden bg-timber-800">
        {hero && (
          <img
            src={getImageUrl(hero.src)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-55"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-timber-900/90 via-timber-800/55 to-timber-800/30" />
        <div className="relative mx-auto flex min-h-[70svh] max-w-7xl items-end px-5 pb-16 pt-28 sm:px-8 sm:pb-20">
          <div className="max-w-2xl text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-wheat">About OKZ</p>
            <h1 className="mt-3 font-display text-5xl tracking-wide sm:text-7xl">
              Built for the long haul.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-timber-200 sm:text-lg">
              OKZ makes premium boots and everyday gear meant to work hard and look sharp —
              from workshop floors to weekend roads across Egypt.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="font-display text-4xl tracking-wide text-timber-900 sm:text-5xl">
          Our story
        </h2>
        <div className="mt-6 space-y-4 text-base leading-relaxed text-timber-600 sm:text-lg">
          <p>
            We started OKZ with a simple brief: honest materials, clean design, and pieces you
            can rely on every day. No hype drops — just gear that earns its place in your rotation.
          </p>
          <p>
            Every pair is chosen for fit, finish, and lasting wear. We ship across Egypt with cash
            on delivery, InstaPay, and Online Wallet so checkout stays easy.
          </p>
        </div>
      </section>

      {gallery.length > 0 && (
        <section className="pb-6 sm:pb-10">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <h2 className="font-display text-4xl tracking-wide text-timber-900">In the wild</h2>
            <p className="mt-2 text-sm text-timber-500">A look at the craft behind the collection.</p>
          </div>
          <div className="mt-8 columns-2 gap-2 px-2 sm:columns-3 sm:gap-3 sm:px-4 md:px-6">
            {gallery.map((shot, i) => (
              <figure
                key={`${shot.src}-${i}`}
                className="mb-2 break-inside-avoid overflow-hidden bg-timber-100 sm:mb-3"
              >
                <img
                  src={getImageUrl(shot.src)}
                  alt={shot.alt}
                  className="w-full object-cover transition duration-700 hover:scale-[1.02]"
                  loading="lazy"
                />
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="border-y border-timber-100 bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 md:grid-cols-3">
          {[
            ['Materials first', 'Leather and finishes selected for lasting daily wear.'],
            ['Egypt-ready delivery', 'COD, InstaPay, and Online Wallet — confirmed within 12 hours.'],
            ['Easy returns', '14 days to return · one free size exchange per pair.'],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className="font-display text-2xl tracking-wide text-timber-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-timber-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 text-center sm:px-8 sm:py-20">
        <h2 className="font-display text-4xl tracking-wide text-timber-900 sm:text-5xl">
          Ready when you are
        </h2>
        <p className="mx-auto mt-3 max-w-md text-timber-500">
          Browse the full collection or get in touch — we’re here to help you find the right fit.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/shop" className="btn-wheat min-h-12 px-6 py-3">
            Shop collection
          </Link>
          <Link to="/contact" className="btn-outline min-h-12 px-6 py-3">
            Contact us
          </Link>
        </div>
      </section>
    </div>
  );
}
