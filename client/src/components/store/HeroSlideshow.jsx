import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { getSlideAspectRatio, optimizeImageUrl } from '../../utils/helpers';

const SLIDE_MS = 5500;
const SWIPE_PX = 40;

const srcFor = (slide, width) => optimizeImageUrl(slide?.cloudinaryUrl, { width });

export default function HeroSlideshow() {
  const [slides, setSlides] = useState([]);
  const [index, setIndex] = useState(0);
  const [ratios, setRatios] = useState({});
  const touchStartX = useRef(null);
  const pauseUntil = useRef(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/slides')
      .then((r) => {
        if (!cancelled) setSlides(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const t = setInterval(() => {
      if (Date.now() < pauseUntil.current) return;
      setIndex((i) => (i + 1) % slides.length);
    }, SLIDE_MS);
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

  const go = (next) => {
    if (slides.length < 2) return;
    pauseUntil.current = Date.now() + SLIDE_MS;
    setIndex((i) => (next + slides.length) % slides.length);
  };

  const onImageLoad = (s, e) => {
    if (getSlideAspectRatio(s)) return;
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) {
      setRatios((prev) => ({ ...prev, [s.id]: naturalWidth / naturalHeight }));
    }
  };

  const onTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_PX) return;
    go(index + (dx < 0 ? 1 : -1));
  };

  return (
    <section className="relative w-full overflow-hidden bg-timber-800">
      <div
        className="relative mx-auto w-full min-h-[62svh] max-h-[85svh] sm:min-h-0"
        style={{ aspectRatio: currentRatio }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {!slides.length && (
          <div className="absolute inset-0 animate-pulse bg-timber-700" aria-hidden />
        )}

        {slides.map((s, i) => {
          const active = i === index;
          const src = srcFor(s, 1200);
          return (
            <img
              key={s.id}
              src={src}
              srcSet={`${srcFor(s, 800)} 800w, ${srcFor(s, 1200)} 1200w, ${srcFor(s, 1600)} 1600w`}
              sizes="100vw"
              alt={s.title}
              width={s.width || undefined}
              height={s.height || undefined}
              fetchPriority={i === 0 ? 'high' : 'low'}
              decoding="async"
              draggable={false}
              onLoad={(e) => onImageLoad(s, e)}
              className={`absolute inset-0 mx-auto block h-full w-full object-cover md:object-contain transition-opacity duration-500 ${
                active ? 'opacity-80 md:opacity-70' : 'opacity-0'
              }`}
            />
          );
        })}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-timber-900/90 via-timber-800/45 to-timber-800/20 md:bg-gradient-to-r md:from-timber-800/95 md:via-timber-700/55 md:to-timber-800/20" />

        <div className="absolute inset-0 flex items-end md:items-center">
          <div className="relative mx-auto w-full max-w-7xl px-5 pb-14 pt-24 sm:px-8 sm:pb-16 md:pt-32">
            <div className="max-w-xl text-white">
              <h1 className="font-display text-4xl leading-[0.95] tracking-wide sm:text-6xl md:text-7xl">
                {slide?.title || 'Built for the long haul.'}
              </h1>
              <p className="mt-3 max-w-md text-balance text-sm text-timber-200 sm:mt-5 sm:text-lg">
                {slide?.description ||
                  'Premium boots, belts, and gear from OKZ — ready for work and weekend.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-3 sm:mt-8">
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
                onClick={() => go(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-8 bg-wheat' : 'w-2 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
