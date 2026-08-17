import { Link } from 'react-router-dom';

const BG = '#f5f1e8';
const ACCENT = '#b87c4c';
const INK = '#231f20';

export default function ComingSoonPage() {
  return (
    <main
      className="coming-soon relative min-h-[100dvh] overflow-hidden text-[color:var(--cs-ink)]"
      style={{ backgroundColor: BG }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="coming-soon__orb coming-soon__orb--a" />
        <div className="coming-soon__orb coming-soon__orb--b" />
        <div className="coming-soon__orb coming-soon__orb--c" />
        <div className="coming-soon__grain" />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-between px-5 py-8 sm:px-8 sm:py-10">
        <div className="coming-soon__mark h-1 w-10 rounded-full opacity-0 sm:w-12" style={{ background: ACCENT }} />

        <figure className="coming-soon__hero m-0 flex w-full max-w-3xl flex-1 flex-col items-center justify-center">
          <div className="coming-soon__art-wrap w-full">
            <img
              src="/images/coming-soon.png"
              alt="OKZ — Coming Soon"
              className="coming-soon__art h-auto w-full max-h-[min(78dvh,720px)] object-contain select-none"
              draggable={false}
            />
          </div>
          <figcaption className="sr-only">OKZ coming soon. Premium boots and gear.</figcaption>
        </figure>

        <div className="coming-soon__footer flex flex-col items-center">
          <p
            className="coming-soon__line max-w-sm text-center text-[11px] font-medium uppercase tracking-[0.28em] sm:text-xs"
            style={{ color: INK }}
          >
            Premium boots &amp; gear
          </p>

          <Link
            to="/login"
            className="coming-soon__admin mt-6 text-[10px] font-medium uppercase tracking-[0.22em] text-timber-400/80 transition hover:text-timber-600"
          >
            Admin
          </Link>
        </div>
      </div>

      <style>{`
        .coming-soon {
          --cs-ink: ${INK};
          --cs-accent: ${ACCENT};
          --cs-bg: ${BG};
        }

        .coming-soon__orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(64px);
          opacity: 0.45;
        }

        .coming-soon__orb--a {
          top: 8%;
          left: -8%;
          width: min(42vw, 320px);
          height: min(42vw, 320px);
          background: rgba(184, 124, 76, 0.28);
          animation: cs-drift-a 18s ease-in-out infinite;
        }

        .coming-soon__orb--b {
          top: 42%;
          right: -12%;
          width: min(48vw, 360px);
          height: min(48vw, 360px);
          background: rgba(184, 124, 76, 0.18);
          animation: cs-drift-b 22s ease-in-out infinite;
        }

        .coming-soon__orb--c {
          bottom: -6%;
          left: 28%;
          width: min(36vw, 280px);
          height: min(36vw, 280px);
          background: rgba(35, 31, 32, 0.06);
          animation: cs-drift-c 20s ease-in-out infinite;
        }

        .coming-soon__grain {
          position: absolute;
          inset: 0;
          opacity: 0.35;
          background-image: radial-gradient(rgba(35, 31, 32, 0.05) 0.6px, transparent 0.6px);
          background-size: 3px 3px;
          animation: cs-grain 8s steps(6) infinite;
        }

        .coming-soon__mark {
          animation: cs-mark-in 1.1s ease 0.1s forwards, cs-pulse 3.2s ease-in-out 1.4s infinite;
        }

        .coming-soon__art-wrap {
          opacity: 0;
          animation: cs-rise 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.25s forwards;
        }

        .coming-soon__art {
          animation: cs-float 6s ease-in-out 1.5s infinite;
          filter: drop-shadow(0 28px 50px rgba(35, 31, 32, 0.08));
        }

        .coming-soon__line {
          opacity: 0;
          letter-spacing: 0.28em;
          animation: cs-line-in 1s ease 0.9s forwards, cs-breathe 4.5s ease-in-out 1.8s infinite;
        }

        .coming-soon__admin {
          opacity: 0;
          animation: cs-line-in 0.9s ease 1.15s forwards;
        }

        @keyframes cs-drift-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(28px, 18px) scale(1.08); }
        }

        @keyframes cs-drift-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-24px, 22px) scale(0.94); }
        }

        @keyframes cs-drift-c {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(16px, -20px) scale(1.06); }
        }

        @keyframes cs-grain {
          0% { transform: translate(0, 0); }
          100% { transform: translate(2px, -2px); }
        }

        @keyframes cs-rise {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes cs-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes cs-mark-in {
          from { opacity: 0; transform: scaleX(0.4); }
          to { opacity: 1; transform: scaleX(1); }
        }

        @keyframes cs-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(184, 124, 76, 0.35); }
          50% { opacity: 0.85; box-shadow: 0 0 0 6px rgba(184, 124, 76, 0); }
        }

        @keyframes cs-line-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 0.72; transform: translateY(0); }
        }

        @keyframes cs-breathe {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.9; }
        }

        @media (prefers-reduced-motion: reduce) {
          .coming-soon__orb,
          .coming-soon__grain,
          .coming-soon__mark,
          .coming-soon__art-wrap,
          .coming-soon__art,
          .coming-soon__line,
          .coming-soon__admin {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </main>
  );
}
