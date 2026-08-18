import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Truck, AlertTriangle, Users,
  Images, Tag, Wallet, LogOut, Boxes, Store, LayoutGrid,
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
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-timber-800 to-timber-700 flex flex-col z-40 shadow-2xl">
      <div className="px-5 py-5 border-b border-white/10 bg-cream/95">
        <BrandLogo to="/staff" size="md" />
        <p className="text-timber-500 text-xs mt-2 capitalize">{user?.role} console</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {NAV.filter((item) => canAccess(user, item.page)).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
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
        <Link to="/" className="sidebar-link sidebar-link-inactive w-full">
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
    </aside>
  );
}
