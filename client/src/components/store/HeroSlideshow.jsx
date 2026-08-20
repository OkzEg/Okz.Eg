import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api/axios';
import { getSlideAspectRatio, optimizeImageUrl } from '../../utils/helpers';

const SLIDE_MS = 6000;
const SWIPE_PX = 48;

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
    <section className="w-full bg-timber-900 pt-[6.75rem] sm:pt-[8.25rem]">
      {/* Full photo — no crop, no gradient overlay */}
      <div
        className="relative mx-auto w-full overflow-hidden bg-timber-900"
        style={{
          aspectRatio: currentRatio,
          maxHeight: 'min(78svh, 860px)',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {!slides.length && (
          <div className="absolute inset-0 animate-pulse bg-timber-800" aria-hidden />
        )}

        {slides.map((s, i) => {
          const active = i === index;
          const src = srcFor(s, 1400);
          return (
            <img
              key={s.id}
              src={src}
              srcSet={`${srcFor(s, 720)} 720w, ${srcFor(s, 1080)} 1080w, ${srcFor(s, 1400)} 1400w, ${srcFor(s, 1800)} 1800w`}
              sizes="100vw"
              alt={s.title || 'OKZ'}
              width={s.width || undefined}
              height={s.height || undefined}
              fetchPriority={i === 0 ? 'high' : 'low'}
              decoding="async"
              draggable={false}
              onLoad={(e) => onImageLoad(s, e)}
              className={`absolute inset-0 m-auto h-full w-full object-contain object-center transition-opacity duration-700 ease-out ${
                active ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            />
          );
        })}

        {slides.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => go(index - 1)}
              className="absolute start-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white transition hover:bg-black/50 sm:start-4 sm:h-11 sm:w-11"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => go(index + 1)}
              className="absolute end-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white transition hover:bg-black/50 sm:end-4 sm:h-11 sm:w-11"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            </button>

            <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-2 sm:bottom-4">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === index}
                  onClick={() => go(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? 'w-7 bg-wheat' : 'w-1.5 bg-white/55 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Copy under the photo so the image stays fully visible */}
      <div className="border-b border-timber-100 bg-[#faf8f4]">
        <div
          key={slide?.id || 'fallback'}
          className="hero-copy mx-auto flex max-w-7xl flex-col items-center px-5 py-8 text-center sm:px-8 sm:py-10 md:items-start md:text-start"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-wheat">OKZ</p>
          <h1 className="mt-2 font-display text-4xl leading-[0.95] tracking-wide text-timber-900 sm:text-5xl md:text-6xl">
            {slide?.title || 'Built for the long haul.'}
          </h1>
          <p className="mt-3 max-w-xl text-balance text-sm leading-relaxed text-timber-500 sm:mt-4 sm:text-base">
            {slide?.description ||
              'Premium boots, belts, and gear from OKZ — ready for work and weekend.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <Link to="/shop" className="btn-wheat btn-lg min-h-12 px-6">
              Shop collection
            </Link>
            <Link to="/shop?type=shoe" className="btn-outline btn-lg min-h-12 px-6">
              Explore boots
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .hero-copy {
          animation: hero-copy-in 0.45s ease both;
        }
        @keyframes hero-copy-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-copy { animation: none; }
        }
      `}</style>
    </section>
  );
}
