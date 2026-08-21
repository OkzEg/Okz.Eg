import { Link } from 'react-router-dom';
import BrandLogo from '../BrandLogo';

export default function StoreFooter() {
  return (
    <footer className="mt-auto bg-timber-700 text-timber-200 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:gap-10 sm:px-6 sm:py-14 md:grid-cols-3">
        <div className="md:col-span-1">
          <BrandLogo
            to="/"
            size="md"
            className="brightness-0 invert opacity-90"
          />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-timber-300">
            Premium boots and gear — crafted for the long haul, from city streets to trail ends.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:gap-10 md:col-span-2 md:grid-cols-2">
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">Explore</h4>
            <div className="space-y-2.5 text-sm">
              <Link to="/shop" className="block min-h-10 py-1 hover:text-wheat">Shop</Link>
              <Link to="/about" className="block min-h-10 py-1 hover:text-wheat">About</Link>
              <Link to="/contact" className="block min-h-10 py-1 hover:text-wheat">Contact</Link>
              <Link to="/wishlist" className="block min-h-10 py-1 hover:text-wheat">Wishlist</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">Help</h4>
            <div className="space-y-2.5 text-sm">
              <Link to="/returns" className="block min-h-10 py-1 hover:text-wheat">Returns</Link>
              <Link to="/privacy" className="block min-h-10 py-1 hover:text-wheat">Privacy</Link>
              <Link to="/terms" className="block min-h-10 py-1 hover:text-wheat">Terms</Link>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-timber-400">
        © {new Date().getFullYear()} OKZ. All rights reserved.
      </div>
    </footer>
  );
}
