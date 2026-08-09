import { Link } from 'react-router-dom';
import BrandLogo from '../BrandLogo';

export default function StoreFooter() {
  return (
    <footer className="mt-auto bg-timber-700 text-timber-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid md:grid-cols-3 gap-10">
        <div>
          <BrandLogo
            to="/"
            size="md"
            className="brightness-0 invert opacity-90"
          />
          <p className="mt-4 text-sm text-timber-300 max-w-xs">
            Premium boots and gear — crafted for the long haul, from city streets to trail ends.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Explore</h4>
          <div className="space-y-2 text-sm">
            <Link to="/shop" className="block hover:text-wheat">Shop</Link>
            <Link to="/about" className="block hover:text-wheat">About</Link>
            <Link to="/contact" className="block hover:text-wheat">Contact</Link>
            <Link to="/wishlist" className="block hover:text-wheat">Wishlist</Link>
          </div>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Help</h4>
          <div className="space-y-2 text-sm">
            <Link to="/returns" className="block hover:text-wheat">Returns</Link>
            <Link to="/privacy" className="block hover:text-wheat">Privacy</Link>
            <Link to="/terms" className="block hover:text-wheat">Terms</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 text-center text-xs text-timber-400 py-4">
        © {new Date().getFullYear()} OKZ. All rights reserved.
      </div>
    </footer>
  );
}
