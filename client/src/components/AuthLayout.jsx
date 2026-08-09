import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

/** Shared shell for login / signup — brand-led, phone-first. */
export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f7f3ec]">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 90% 55% at 50% -10%, rgba(183, 114, 57, 0.22), transparent 58%),
            radial-gradient(ellipse 60% 40% at 100% 100%, rgba(43, 38, 44, 0.06), transparent 55%),
            linear-gradient(180deg, #faf6ef 0%, #f3eee4 100%)
          `,
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between sm:mb-8">
          <BrandLogo size="lg" className="h-12 sm:h-14" />
          <Link
            to="/"
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full px-3 text-xs font-bold uppercase tracking-[0.16em] text-timber-500 transition hover:bg-white/60 hover:text-timber-800"
          >
            Home
          </Link>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <header className="mb-6 sm:mb-8">
            <h1 className="font-display text-[2.75rem] leading-none tracking-wide text-timber-900 sm:text-6xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-timber-500 sm:text-base">
                {subtitle}
              </p>
            )}
          </header>

          <div className="rounded-2xl border border-timber-200/70 bg-white/90 p-5 shadow-[0_24px_60px_-36px_rgba(43,38,44,0.45)] backdrop-blur-sm sm:p-7">
            {children}
          </div>

          {footer && <div className="mt-6 text-center text-sm text-timber-500">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
