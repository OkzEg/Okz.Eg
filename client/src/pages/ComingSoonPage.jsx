const ACCENT = '#b87c4c';
const INK = '#231f20';

export default function ComingSoonPage() {
  return (
    <main className="coming-soon relative min-h-[100dvh] overflow-hidden bg-white text-[color:var(--cs-ink)]">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 50% 38%, rgba(184, 124, 76, 0.10), transparent 70%),
            radial-gradient(ellipse 50% 40% at 50% 100%, rgba(35, 31, 32, 0.04), transparent 65%)
          `,
        }}
      />

      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-between px-5 py-8 sm:px-8 sm:py-10">
        <div className="coming-soon__mark h-1 w-10 rounded-full opacity-0 sm:w-12" style={{ background: ACCENT }} />

        <figure className="coming-soon__hero m-0 flex w-full max-w-3xl flex-1 flex-col items-center justify-center">
          <img
            src="/images/coming-soon.png"
            alt="OKZ — Coming Soon"
            className="coming-soon__art h-auto w-full max-h-[min(78dvh,720px)] object-contain select-none"
            draggable={false}
          />
          <figcaption className="sr-only">
            OKZ coming soon. Premium boots and gear.
          </figcaption>
        </figure>

        <p
          className="coming-soon__line max-w-sm text-center text-[11px] font-medium uppercase tracking-[0.28em] sm:text-xs"
          style={{ color: INK }}
        >
          Premium boots &amp; gear
        </p>
      </div>

      <style>{`
        .coming-soon {
          --cs-ink: ${INK};
          --cs-accent: ${ACCENT};
        }

        .coming-soon__mark {
          animation: cs-fade 1s ease 0.15s forwards;
        }

        .coming-soon__art {
          opacity: 0;
          transform: translateY(18px) scale(0.985);
          animation: cs-rise 1.15s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards;
          filter: drop-shadow(0 28px 50px rgba(35, 31, 32, 0.08));
        }

        .coming-soon__line {
          opacity: 0;
          letter-spacing: 0.28em;
          animation: cs-fade 1s ease 0.85s forwards, cs-breathe 4.5s ease-in-out 1.6s infinite;
        }

        @keyframes cs-rise {
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes cs-fade {
          to { opacity: 0.72; }
        }

        @keyframes cs-breathe {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.9; }
        }

        @media (prefers-reduced-motion: reduce) {
          .coming-soon__mark,
          .coming-soon__art,
          .coming-soon__line {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </main>
  );
}
