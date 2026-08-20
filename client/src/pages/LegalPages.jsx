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
  return (
    <Legal title="Returns">
      <p>Unworn items may be returned within 14 days. Contact Ops via your order if there is a delivery issue.</p>
    </Legal>
  );
}
