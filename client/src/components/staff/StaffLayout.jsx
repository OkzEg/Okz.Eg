import { Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { canAccess, defaultStaffPage, isStaff } from '../../utils/permissions';

export default function StaffLayout({ children, page }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (!isStaff(user)) return <Navigate to="/" replace />;
  if (page && !canAccess(user, page)) {
    return <Navigate to={defaultStaffPage(user.role)} replace />;
  }

  return (
    <div className="min-h-screen bg-timber-50">
      <Sidebar />
      <main className="ml-64 p-6 md:p-8 min-h-screen">{children}</main>
    </div>
  );
}
