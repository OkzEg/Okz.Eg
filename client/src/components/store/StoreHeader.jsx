import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, ShoppingBag, User, X, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { isStaff } from '../../utils/permissions';
import BrandLogo from '../BrandLogo';

const NAV = [
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function StoreHeader() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const overHero = pathname === '/';
  const solid = !overHero || scrolled;

  useEffect(() => {
    if (!overHero) {
      setScrolled(false);
      return undefined;
    }
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [overHero]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const linkCls = solid
    ? 'text-timber-600 hover:text-timber-800'
    : 'text-white/90 hover:text-white';

  return (
    <>
      <header
        className={`${overHero ? 'fixed' : 'sticky'} top-0 inset-x-0 z-50 transition-all duration-300 ${
          solid
            ? 'bg-cream/90 shadow-[0_1px_0_rgba(43,38,44,0.08)] backdrop-blur-md'
            : 'bg-transparent'
        }`}
      >
        <div className="bg-timber-800 px-3 py-2 text-center text-[10px] font-medium uppercase leading-snug tracking-[0.12em] text-cream sm:px-4 sm:text-[11px] sm:tracking-[0.18em]">
          <span className="sm:hidden">COD · Ships 2–3 days · Free over EGP 3,000</span>
          <span className="hidden sm:inline">
            Cash on delivery · Ships in 2–3 days · Free shipping over EGP 3,000 · Guest checkout
          </span>
        </div>
        <div className="relative mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-2 px-4 sm:h-[96px] sm:gap-4 sm:px-8">
          <div className="relative z-10 max-w-[42%] shrink-0 sm:max-w-none">
            <BrandLogo
              size="header"
              className="transition-[filter] duration-300"
              style={
                overHero && !scrolled
                  ? { filter: 'brightness(0) invert(1)' }
                  : undefined
              }
            />
          </div>

          <nav className="pointer-events-none absolute inset-x-0 hidden items-center justify-center gap-7 xl:gap-8 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `pointer-events-auto text-[12.5px] xl:text-[13px] font-bold uppercase tracking-[0.18em] transition-colors ${
                    isActive && solid ? 'text-wheat' : linkCls
                  }`
                }
                end={item.to === '/shop' ? false : true}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="relative z-10 flex items-center gap-1 sm:gap-3">
            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className={`relative grid h-10 w-10 place-items-center rounded-full transition sm:h-11 sm:w-11 ${
                solid
                  ? 'text-timber-700 hover:bg-timber-100'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Heart className="h-5 w-5" strokeWidth={1.8} />
              {wishCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-wheat px-1 text-[10px] font-bold text-white">
                  {wishCount}
                </span>
              )}
            </Link>
            <Link
              to="/cart"
              aria-label="Cart"
              className={`relative grid h-10 w-10 place-items-center rounded-full transition sm:h-11 sm:w-11 ${
                solid
                  ? 'text-timber-700 hover:bg-timber-100'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={1.8} />
              {count > 0 && (
                <span className="absolute -top-0.5 -end-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-wheat px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>

            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                {isStaff(user) && (
                  <Link
                    to="/staff"
                    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                      solid
                        ? 'border-timber-200 text-timber-700 hover:bg-timber-50'
                        : 'border-white/30 text-white hover:bg-white/10'
                    }`}
                  >
                    Staff
                  </Link>
                )}
                <Link
                  to="/account"
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    solid
                      ? 'border-timber-200 bg-white/70 text-timber-700 hover:bg-white'
                      : 'border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/15'
                  }`}
                >
                  <User size={18} strokeWidth={1.8} />
                  <span className="hidden md:inline">{user.name.split(' ')[0]}</span>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className={`rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                    solid ? 'text-timber-500 hover:text-timber-800' : 'text-white/80 hover:text-white'
                  }`}
                >
                  Log out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className={`hidden sm:inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition ${
                  solid
                    ? 'border-timber-200 bg-timber-700 text-white hover:bg-timber-800'
                    : 'border-white/25 bg-white/15 text-white backdrop-blur-sm hover:bg-white/20'
                }`}
              >
                <User size={18} strokeWidth={1.8} />
                Sign in
              </Link>
            )}

            <button
              type="button"
              className={`lg:hidden grid h-11 w-11 place-items-center rounded-full transition ${
                solid ? 'text-timber-700 hover:bg-timber-100' : 'text-white hover:bg-white/10'
              }`}
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={24} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-timber-900/50"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute end-0 top-0 flex h-full w-[min(100%,20rem)] flex-col bg-cream shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex h-16 items-center justify-between border-b border-timber-100 px-4 sm:h-[72px] sm:px-5">
              <BrandLogo size="md" to="/" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="grid h-10 w-10 place-items-center text-timber-700"
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-5 py-6">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="block border-b border-timber-100/80 py-3.5 text-[13px] font-bold uppercase tracking-[0.16em] text-timber-700"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/wishlist"
                onClick={() => setMobileOpen(false)}
                className="block border-b border-timber-100/80 py-3.5 text-[13px] font-bold uppercase tracking-[0.16em] text-timber-700"
              >
                Wishlist{wishCount > 0 ? ` (${wishCount})` : ''}
              </Link>
              <Link
                to="/cart"
                onClick={() => setMobileOpen(false)}
                className="block border-b border-timber-100/80 py-3.5 text-[13px] font-bold uppercase tracking-[0.16em] text-timber-700"
              >
                Cart{count > 0 ? ` (${count})` : ''}
              </Link>
              {user ? (
                <>
                  <Link
                    to="/account"
                    onClick={() => setMobileOpen(false)}
                    className="block border-b border-timber-100/80 py-3.5 text-[13px] font-bold uppercase tracking-[0.16em] text-timber-700"
                  >
                    Account
                  </Link>
                  {isStaff(user) && (
                    <Link
                      to="/staff"
                      onClick={() => setMobileOpen(false)}
                      className="block border-b border-timber-100/80 py-3.5 text-[13px] font-bold uppercase tracking-[0.16em] text-timber-700"
                    >
                      Staff
                    </Link>
                  )}
                  <button
                    type="button"
                    className="block w-full border-b border-timber-100/80 py-3.5 text-start text-[13px] font-bold uppercase tracking-[0.16em] text-timber-500"
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                  >
                    Log out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block border-b border-timber-100/80 py-3.5 text-[13px] font-bold uppercase tracking-[0.16em] text-timber-700"
                >
                  Sign in
                </Link>
              )}
            </nav>
            <div className="border-t border-timber-100 p-5">
              <Link
                to="/shop"
                onClick={() => setMobileOpen(false)}
                className="btn-wheat block w-full py-3 text-center font-semibold uppercase tracking-wider"
              >
                Shop collection
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
