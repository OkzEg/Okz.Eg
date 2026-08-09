import { Link } from 'react-router-dom';
import { MessageCircle, Phone, Truck } from 'lucide-react';

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || '';
const PHONE = import.meta.env.VITE_CONTACT_PHONE || '';

export default function ContactPage() {
  const whatsappHref = WHATSAPP
    ? `https://wa.me/${String(WHATSAPP).replace(/\D/g, '')}`
    : null;
  const phoneHref = PHONE ? `tel:${String(PHONE).replace(/\s+/g, '')}` : null;

  return (
    <div className="bg-[#faf8f4]">
      <section className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-wheat">Contact</p>
        <h1 className="mt-3 font-display text-5xl tracking-wide text-timber-900 sm:text-6xl">
          Let’s talk
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-timber-500 sm:text-lg">
          Questions about sizing, delivery, or an order? Reach out — we confirm every order within
          12 hours.
        </p>

        <div className="mt-10 space-y-3">
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-14 items-center gap-4 rounded-2xl border border-timber-200 bg-white px-5 py-4 transition hover:border-wheat"
            >
              <MessageCircle className="h-5 w-5 shrink-0 text-wheat" />
              <span>
                <span className="block text-sm font-semibold text-timber-800">WhatsApp</span>
                <span className="text-sm text-timber-500">{WHATSAPP}</span>
              </span>
            </a>
          )}
          {phoneHref && (
            <a
              href={phoneHref}
              className="flex min-h-14 items-center gap-4 rounded-2xl border border-timber-200 bg-white px-5 py-4 transition hover:border-wheat"
            >
              <Phone className="h-5 w-5 shrink-0 text-wheat" />
              <span>
                <span className="block text-sm font-semibold text-timber-800">Call us</span>
                <span className="text-sm text-timber-500">{PHONE}</span>
              </span>
            </a>
          )}
          {!whatsappHref && !phoneHref && (
            <div className="rounded-2xl border border-timber-200 bg-white px-5 py-5 text-sm text-timber-600">
              Place an order and we’ll contact you on the phone number you provide at checkout.
              Staff can also add WhatsApp/phone via env vars later.
            </div>
          )}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-timber-100 bg-white/80 p-5">
            <Truck className="h-5 w-5 text-wheat" />
            <h2 className="mt-3 font-display text-2xl tracking-wide text-timber-900">Delivery</h2>
            <p className="mt-2 text-sm text-timber-500">
              Orders ship in 2–3 business days after confirmation. Free shipping over EGP 2,000.
            </p>
          </div>
          <div className="rounded-2xl border border-timber-100 bg-white/80 p-5">
            <h2 className="font-display text-2xl tracking-wide text-timber-900">Returns</h2>
            <p className="mt-2 text-sm text-timber-500">
              Unworn items can be returned within 14 days.{' '}
              <Link to="/returns" className="font-medium text-wheat-500 underline-offset-2 hover:underline">
                Read the policy
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-10">
          <Link to="/shop" className="btn-wheat min-h-12 inline-flex px-6 py-3">
            Shop collection
          </Link>
        </div>
      </section>
    </div>
  );
}
