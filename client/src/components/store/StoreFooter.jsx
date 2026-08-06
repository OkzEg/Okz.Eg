import { Link } from 'react-router-dom';

export default function StoreFooter() {
  return (
    <footer className="mt-auto bg-timber-700 text-timber-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid md:grid-cols-3 gap-10">
        <div>
          <p className="mt-0 text-sm text-timber-300 max-w-xs">
            Premium boots and gear — crafted for the long haul, from city streets to trail ends.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Shop</h4>
          <div className="space-y-2 text-sm">
            <Link to="/shop?type=shoe" className="block hover:text-wheat">Boots & Shoes</Link>
            <Link to="/shop?type=belt" className="block hover:text-wheat">Belts</Link>
            <Link to="/shop?type=wallet" className="block hover:text-wheat">Wallets</Link>
            <Link to="/shop?type=bundle" className="block hover:text-wheat">Bundles</Link>
          </div>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Help</h4>
          <div className="space-y-2 text-sm">
            <Link to="/wishlist" className="block hover:text-wheat">Wishlist</Link>
            <Link to="/privacy" className="block hover:text-wheat">Privacy</Link>
            <Link to="/terms" className="block hover:text-wheat">Terms</Link>
            <Link to="/returns" className="block hover:text-wheat">Returns</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 text-center text-xs text-timber-400 py-4">
        © {new Date().getFullYear()} OKZ. All rights reserved.
      </div>
    </footer>
  );
}
