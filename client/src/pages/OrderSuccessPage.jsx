import { Link, useLocation, Navigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { formatMoney, INSTAPAY_URL } from '../utils/helpers';

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || '';

function SuccessMark() {
  return (
    <div className="success-mark relative mx-auto grid h-28 w-28 place-items-center sm:h-32 sm:w-32">
      <span className="absolute inset-0 rounded-full bg-wheat/15" aria-hidden />
      <span className="absolute inset-3 rounded-full bg-wheat/20" aria-hidden />
      <svg
        viewBox="0 0 96 96"
        className="relative h-20 w-20 sm:h-24 sm:w-24 drop-shadow-sm"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Order successful"
      >
        <circle cx="48" cy="48" r="44" fill="#b77239" />
        <circle cx="48" cy="48" r="44" fill="url(#okzGlow)" fillOpacity="0.4" />
        <circle cx="34" cy="40" r="5" fill="#faf6ef" />
        <circle cx="62" cy="40" r="5" fill="#faf6ef" />
        <path
          d="M30 55c5 10 13.5 15 18 15s13-5 18-15"
          stroke="#faf6ef"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <defs>
          <radialGradient id="okzGlow" cx="32%" cy="28%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#b77239" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
      <span className="success-mark__badge absolute -bottom-1 -end-1 grid h-10 w-10 place-items-center rounded-full bg-timber-800 shadow-md sm:h-11 sm:w-11">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="#faf6ef"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="success-mark__check"
          />
        </svg>
      </span>
    </div>
  );
}

export default function OrderSuccessPage() {
  const { state } = useLocation();
  const order = state?.order;

  if (!order) return <Navigate to="/" replace />;

  const name = order.customerName || order.guestName;
  const isInstaPay = order.paymentMethod === 'InstaPay';
  const isCod = order.paymentMethod === 'Cash on Delivery';
  const orderRef = order.id.slice(0, 8).toUpperCase();
  const whatsappHref = WHATSAPP
    ? `https://wa.me/${String(WHATSAPP).replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hi OKZ — I just placed order ${orderRef}. Can you confirm it?`
      )}`
    : null;

  return (
    <div className="relative min-h-[70vh] overflow-hidden bg-[#faf8f4]">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% 0%, rgba(183, 114, 57, 0.18), transparent 60%),
            radial-gradient(ellipse 40% 30% at 10% 80%, rgba(183, 114, 57, 0.08), transparent 50%)
          `,
        }}
      />

      <div className="relative z-10 mx-auto max-w-lg px-4 py-14 text-center sm:py-20">
        <SuccessMark />

        <p className="success-fade mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-wheat">
          Order received
        </p>
        <h1 className="success-fade success-fade--delay font-display mt-2 text-5xl tracking-wide text-timber-900 sm:text-6xl">
          Thank you{name ? `, ${name.split(' ')[0]}` : ''}
        </h1>
        <p className="success-fade success-fade--delay2 mx-auto mt-4 max-w-md text-base leading-relaxed text-timber-600 sm:text-lg">
          {isCod ? (
            <>
              You’re set — pay cash when it arrives. We’ll confirm your order within{' '}
              <span className="font-semibold text-timber-800">12 hours</span>, then ship in 2–3
              business days.
            </>
          ) : (
            <>
              Your order is in. We’ll confirm within{' '}
              <span className="font-semibold text-timber-800">12 hours</span>, then ship in 2–3
              business days.
            </>
          )}
        </p>

        <div className="success-fade success-fade--delay2 card mt-8 space-y-3 text-left text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-timber-500">Order</span>
            <span className="font-mono font-medium text-timber-800">{orderRef}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-timber-500">Payment</span>
            <span className="text-timber-800">
              {isCod ? 'Cash on delivery' : order.paymentMethod}
            </span>
          </div>
          <div className="flex justify-between gap-4 border-t border-timber-100 pt-3 text-base font-semibold text-timber-900">
            <span>Total</span>
            <span>{formatMoney(order.totalPrice)}</span>
          </div>
        </div>

        {isInstaPay && INSTAPAY_URL && (
          <div className="card mt-4 text-left">
            <a
              href={INSTAPAY_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-wheat inline-flex w-full sm:w-auto"
            >
              Open InstaPay
            </a>
          </div>
        )}

        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center justify-center gap-2 text-sm font-medium text-timber-700 underline-offset-2 hover:underline"
          >
            <MessageCircle className="h-4 w-4" />
            Message us on WhatsApp
          </a>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/shop" className="btn-wheat min-h-12 px-6 py-3">
            Continue shopping
          </Link>
          <Link to="/" className="btn-outline min-h-12 px-6 py-3">
            Home
          </Link>
        </div>
      </div>

      <style>{`
        .success-mark {
          animation: success-pop 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .success-mark__check {
          stroke-dasharray: 28;
          stroke-dashoffset: 28;
          animation: success-draw 0.4s ease 0.5s forwards;
        }
        .success-mark__badge {
          animation: success-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.35s both;
        }
        .success-fade {
          opacity: 0;
          transform: translateY(10px);
          animation: success-up 0.55s ease forwards;
        }
        .success-fade--delay { animation-delay: 0.12s; }
        .success-fade--delay2 { animation-delay: 0.22s; }

        @keyframes success-pop {
          from { opacity: 0; transform: scale(0.7); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes success-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes success-up {
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .success-mark,
          .success-mark__check,
          .success-fade {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            stroke-dashoffset: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
