import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import Sidebar, { StaffTopBar } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { canAccess, defaultStaffPage, isStaff } from '../../utils/permissions';

export default function StaffLayout({ children, page }) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return <Navigate to="/login" replace />;
  if (!isStaff(user)) return <Navigate to="/" replace />;
  if (page && !canAccess(user, page)) {
    return <Navigate to={defaultStaffPage(user.role)} replace />;
  }

  return (
    <div className="min-h-screen bg-timber-50">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <StaffTopBar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
