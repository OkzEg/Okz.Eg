import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import {
  getSlideAspectRatio,
  optimizeImageUrl,
  preloadImage,
} from '../../utils/helpers';

const HERO_WIDTH = 1600;
const SLIDE_MS = 5500;

const slideSrc = (slide) => optimizeImageUrl(slide?.cloudinaryUrl, { width: HERO_WIDTH });

export default function HeroSlideshow() {
  const [slides, setSlides] = useState([]);
  const [index, setIndex] = useState(0);
  const [readyIds, setReadyIds] = useState(() => new Set());
  const [ratios, setRatios] = useState({});
  const preloaded = useRef(new Set());

  useEffect(() => {
    let cancelled = false;

    api
      .get('/slides')
      .then((r) => {
        if (cancelled) return;
        const list = Array.isArray(r.data) ? r.data : [];
        setSlides(list);

        list.forEach((slide, i) => {
          const src = slideSrc(slide);
          if (!src || preloaded.current.has(src)) return;
          preloaded.current.add(src);

          preloadImage(src)
            .then((img) => {
              if (cancelled || !img) return;
              setReadyIds((prev) => new Set(prev).add(slide.id));
              setRatios((prev) => ({
                ...prev,
                [slide.id]:
                  getSlideAspectRatio(slide) ||
                  img.naturalWidth / img.naturalHeight ||
                  16 / 9,
              }));
            })
            .catch(() => {});

          if (i === 0) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
          }
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = slides[index];
  const placeholderRatio = useMemo(() => {
    const first = slides[0];
    return getSlideAspectRatio(first) || ratios[first?.id] || 16 / 9;
  }, [slides, ratios]);

  const currentRatio = slide
    ? getSlideAspectRatio(slide) || ratios[slide.id] || placeholderRatio
    : placeholderRatio;

  const onImageLoad = (s, e) => {
    setReadyIds((prev) => new Set(prev).add(s.id));
    if (!getSlideAspectRatio(s)) {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      if (naturalWidth > 0 && naturalHeight > 0) {
        setRatios((prev) => ({
          ...prev,
          [s.id]: naturalWidth / naturalHeight,
        }));
      }
    }
  };

  return (
    <section className="relative w-full overflow-hidden bg-timber-800">
      <div
        className="relative mx-auto w-full max-h-[85svh] transition-[aspect-ratio] duration-500 ease-out"
        style={{ aspectRatio: currentRatio }}
      >
        {!slides.length && (
          <div className="absolute inset-0 animate-pulse bg-timber-700" aria-hidden />
        )}

        {slides.map((s, i) => {
          const active = i === index;
          const src = slideSrc(s);
          const isReady = readyIds.has(s.id);

          return (
            <img
              key={s.id}
              src={src}
              alt={s.title}
              width={s.width || undefined}
              height={s.height || undefined}
              fetchPriority={i === 0 ? 'high' : 'low'}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              onLoad={(e) => onImageLoad(s, e)}
              className={`absolute inset-0 mx-auto block h-full w-full object-contain transition-opacity duration-700 ${
                active && isReady ? 'opacity-70' : 'opacity-0'
              }`}
            />
          );
        })}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-timber-800/95 via-timber-700/55 to-timber-800/20" />
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-end sm:items-center">
        <div className="pointer-events-auto relative mx-auto w-full max-w-7xl px-5 pb-10 pt-28 sm:px-8 sm:pb-16 sm:pt-32">
          <div className="max-w-xl text-white">
            <h1 className="font-display text-5xl leading-[0.95] tracking-wide sm:text-7xl">
              {slide?.title || 'Built for the long haul.'}
            </h1>
            <p className="mt-4 max-w-md text-balance text-base text-timber-200 sm:mt-5 sm:text-lg">
              {slide?.description ||
                'Premium boots, belts, and gear from OKZ — ready for work and weekend.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
              <Link to="/shop" className="btn-wheat btn-lg">
                Shop collection
              </Link>
              <Link
                to="/shop?type=shoe"
                className="btn-outline btn-lg border-white/30 text-white hover:bg-white/10"
              >
                Explore boots
              </Link>
            </div>
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2 sm:bottom-6">
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
  );
}
