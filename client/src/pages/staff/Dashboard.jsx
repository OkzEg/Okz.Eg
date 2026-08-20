import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, AlertTriangle, Truck } from 'lucide-react';
import api from '../../api/axios';
import StatCard from '../../components/ui/StatCard';
import { useAuth } from '../../context/AuthContext';
import { formatMoney, orderStatusBadge, orderStatusLabel } from '../../utils/helpers';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [finance, setFinance] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const tasks = [api.get('/orders').then((r) => (alive ? setOrders(r.data.slice(0, 8)) : null))];
    if (user.role === 'admin') {
      tasks.push(api.get('/orders/finance').then((r) => (alive ? setFinance(r.data) : null)));
    }
    Promise.allSettled(tasks).finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [user.role]);

  return (
    <>
      <div className="mb-6">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back, {user.name}</p>
      </div>

      {user.role === 'admin' && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {loading && !finance ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl border border-timber-100 bg-white animate-pulse" />
            ))
          ) : finance ? (
            <>
              <StatCard title="Revenue" value={formatMoney(finance.revenue)} icon={ShoppingBag} tone="green" />
              <StatCard title="Orders" value={finance.orderCount} icon={Package} tone="blue" />
              <StatCard
                title="Out for delivery"
                value={finance.byStatus?.out_for_delivery || 0}
                icon={Truck}
                tone="wheat"
              />
              <StatCard
                title="Low stock items"
                value={finance.lowStock?.length || 0}
                icon={AlertTriangle}
                tone="red"
              />
            </>
          ) : null}
        </div>
      )}

      {user.role === 'ops' && (
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {loading ? (
            [1, 2].map((i) => (
              <div key={i} className="h-24 rounded-xl border border-timber-100 bg-white animate-pulse" />
            ))
          ) : (
            <>
              <StatCard
                title="Active deliveries"
                value={orders.filter((o) => ['confirmed', 'out_for_delivery'].includes(o.status)).length}
                icon={Truck}
              />
              <StatCard
                title="Problems"
                value={orders.filter((o) => o.status === 'problem').length}
                icon={AlertTriangle}
                tone="red"
              />
            </>
          )}
        </div>
      )}

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-lg">Recent orders</h2>
          <Link to="/staff/deliveries" className="btn-outline btn-sm">View deliveries</Link>
        </div>
        <div className="table-wrapper !border-0 !rounded-none">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && orders.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-timber-400 text-sm py-8 text-center">
                    Loading orders…
                  </td>
                </tr>
              )}
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="font-mono text-xs">{o.id.slice(0, 8)}</td>
                  <td>{o.user?.name}</td>
                  <td>{formatMoney(o.totalPrice)}</td>
                  <td><span className={orderStatusBadge[o.status]}>{orderStatusLabel[o.status]}</span></td>
                </tr>
              ))}
              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-timber-400 text-sm py-8 text-center">
                    No orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {finance?.lowStock?.length > 0 && (
        <div className="card mt-6">
          <h2 className="font-semibold text-lg mb-4">Low stock</h2>
          <ul className="space-y-2">
            {finance.lowStock.map((p) => (
              <li key={p.id} className="flex justify-between text-sm">
                <span>{p.name}</span>
                <span className="text-red-600 font-medium">{p.stock} left</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
