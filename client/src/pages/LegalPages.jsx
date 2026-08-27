import { Link } from 'react-router-dom';

function Legal({ title, children }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 prose prose-timber">
      <h1 className="font-display text-4xl tracking-wide mb-6 sm:text-5xl">{title}</h1>
      <div className="space-y-4 text-timber-600 leading-relaxed">{children}</div>
      <Link to="/" className="btn-outline btn-sm mt-8 inline-flex">Back home</Link>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <Legal title="Privacy">
      <p>We collect your name, email, phone, and address to fulfill orders. We do not sell your data.</p>
    </Legal>
  );
}

export function TermsPage() {
  return (
    <Legal title="Terms">
      <p>By shopping at OKZ you agree to our checkout terms, product availability, and delivery timelines.</p>
    </Legal>
  );
}

export function ReturnsPage() {
  const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || '';
  const whatsappHref = WHATSAPP
    ? `https://wa.me/${String(WHATSAPP).replace(/\D/g, '')}?text=${encodeURIComponent(
        'Hi OKZ — I’d like help with a return or size exchange.'
      )}`
    : null;

  return (
    <div className="bg-[#faf8f4]">
      <section className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-wheat">Returns & exchanges</p>
        <h1 className="mt-3 font-display text-4xl tracking-wide text-timber-900 sm:text-6xl">
          Shop with confidence
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-timber-500 sm:text-lg">
          Wrong size, changed your mind, or something’s off? We’ll make it right — fast, fair, and
          without the runaround.
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            ['14 days', 'Return or exchange from the day you receive your order'],
            ['Free size swap', 'One free size exchange per item — we cover the return shipping'],
            ['WhatsApp help', 'Message us and we’ll walk you through it in minutes'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-timber-100 bg-white/90 p-5">
              <h2 className="font-display text-2xl tracking-wide text-timber-900">{t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-timber-500">{d}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 space-y-10 text-timber-600">
          <section>
            <h2 className="font-display text-3xl tracking-wide text-timber-900">What you can return</h2>
            <ul className="mt-4 list-disc space-y-2 ps-5 text-base leading-relaxed">
              <li>Unworn items in original packaging, with tags attached where applicable</li>
              <li>Items that arrived damaged, defective, or not as described — we replace or refund in full</li>
              <li>Wrong size — start a free size exchange within 14 days</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-3xl tracking-wide text-timber-900">What we can’t accept</h2>
            <ul className="mt-4 list-disc space-y-2 ps-5 text-base leading-relaxed">
              <li>Worn, scuffed, or outdoor-used footwear (except manufacturing defects)</li>
              <li>Items without original packaging when packaging was part of the product</li>
              <li>Returns started after 14 days from delivery</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-3xl tracking-wide text-timber-900">How it works</h2>
            <ol className="mt-4 list-decimal space-y-3 ps-5 text-base leading-relaxed">
              <li>
                Message us on WhatsApp or{' '}
                <Link to="/contact" className="font-medium text-wheat-600 underline-offset-2 hover:underline">
                  Contact
                </Link>{' '}
                with your order number and what you need (exchange or refund).
              </li>
              <li>We’ll confirm eligibility and send pickup or drop-off instructions the same day when we can.</li>
              <li>
                Once we receive the item, we ship your new size or process your refund within{' '}
                <span className="font-semibold text-timber-800">3–5 business days</span>.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="font-display text-3xl tracking-wide text-timber-900">Refunds</h2>
            <div className="mt-4 space-y-3 text-base leading-relaxed">
              <p>
                Cash-on-delivery orders are refunded via InstaPay, wallet transfer, or store credit —
                whichever you prefer.
              </p>
              <p>
                Prepaid orders (InstaPay / Online Wallet) are refunded to the same method when possible.
              </p>
              <p>
                If we sent the wrong item or it arrived damaged, you get a{' '}
                <span className="font-semibold text-timber-800">full refund including shipping</span>, or a
                free replacement — your choice.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-3xl tracking-wide text-timber-900">Size exchanges</h2>
            <p className="mt-4 text-base leading-relaxed">
              Footwear fit matters. You get <span className="font-semibold text-timber-800">one free size
              exchange</span> per item within 14 days. We cover return shipping for that swap. Extra
              exchanges after that are welcome — return shipping may apply at cost.
            </p>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="btn-wheat min-h-12 inline-flex items-center px-6 py-3"
            >
              Start a return
            </a>
          ) : (
            <Link to="/contact" className="btn-wheat min-h-12 inline-flex items-center px-6 py-3">
              Start a return
            </Link>
          )}
          <Link to="/shop" className="btn-outline min-h-12 inline-flex items-center px-6 py-3">
            Keep shopping
          </Link>
        </div>
      </section>
    </div>
  );
}
