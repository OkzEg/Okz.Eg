import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Truck, AlertTriangle, Users,
  Images, Tag, Wallet, LogOut, Boxes, Store, LayoutGrid, Menu, X, Activity, MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { canAccess } from '../../utils/permissions';
import BrandLogo from '../BrandLogo';

const NAV = [
  { path: '/staff/dashboard', label: 'Dashboard', icon: LayoutDashboard, page: 'dashboard' },
  { path: '/staff/products', label: 'Products', icon: Package, page: 'products' },
  { path: '/staff/homepage', label: 'Homepage', icon: LayoutGrid, page: 'homepage' },
  { path: '/staff/orders', label: 'Orders', icon: Boxes, page: 'orders' },
  { path: '/staff/deliveries', label: 'Deliveries', icon: Truck, page: 'deliveries' },
  { path: '/staff/problems', label: 'Problems', icon: AlertTriangle, page: 'problems' },
  { path: '/staff/users', label: 'Users', icon: Users, page: 'users' },
  { path: '/staff/slides', label: 'Slideshow', icon: Images, page: 'slides' },
  { path: '/staff/promotions', label: 'Promotions', icon: Tag, page: 'promotions' },
  { path: '/staff/finance', label: 'Finance', icon: Wallet, page: 'finance' },
  { path: '/staff/traffic', label: 'Traffic', icon: Activity, page: 'traffic' },
  { path: '/staff/reviews', label: 'Reviews', icon: MessageSquare, page: 'reviews' },
];

function NavPanel({ user, onNavigate, logout, navigate }) {
  return (
    <>
      <div className="px-5 py-5 border-b border-white/10 bg-cream/95">
        <BrandLogo to="/staff" size="md" />
        <p className="text-timber-500 text-xs mt-2 capitalize">{user?.role} console</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {NAV.filter((item) => canAccess(user, item.page)).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-2">
        <div className="px-3 text-xs text-timber-300 truncate">{user?.email}</div>
        <Link
          to="/"
          onClick={onNavigate}
          className="sidebar-link sidebar-link-inactive w-full"
        >
          <Store className="w-5 h-5" />
          <span>View store</span>
        </Link>
        <button
          type="button"
          className="sidebar-link sidebar-link-inactive w-full"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          <LogOut className="w-5 h-5" />
          <span>Log out</span>
        </button>
      </div>
    </>
  );
}

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <>
      <aside className="fixed top-0 left-0 z-40 hidden h-full w-64 flex-col bg-gradient-to-b from-timber-800 to-timber-700 shadow-2xl lg:flex">
        <NavPanel user={user} logout={logout} navigate={navigate} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-timber-900/50"
            aria-label="Close menu"
            onClick={onClose}
          />
          <aside className="absolute inset-y-0 start-0 flex h-full w-[min(100%,18rem)] flex-col bg-gradient-to-b from-timber-800 to-timber-700 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl">
            <div className="absolute end-3 top-4 z-10">
              <button
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavPanel
              user={user}
              logout={logout}
              navigate={navigate}
              onNavigate={onClose}
            />
          </aside>
        </div>
      )}
    </>
  );
}

export function StaffTopBar({ onMenu }) {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-timber-100 bg-cream/95 px-4 py-3 backdrop-blur-md lg:hidden">
      <button
        type="button"
        onClick={onMenu}
        className="grid h-11 w-11 place-items-center rounded-lg border border-timber-200 bg-white text-timber-700"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <BrandLogo to="/staff" size="sm" />
      <span className="ms-auto text-xs font-semibold uppercase tracking-wider text-timber-500">
        Admin
      </span>
    </div>
  );
}
