import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Trash2 } from 'lucide-react';
import api from '../../api/axios';
import { formatMoney, orderStatusBadge, orderStatusLabel } from '../../utils/helpers';

export default function StaffOrders() {
  const [orders, setOrders] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  const load = () => api.get('/orders').then((r) => setOrders(r.data));

  useEffect(() => {
    load();
  }, []);

  const remove = async (order) => {
    const label = order.id.slice(0, 8);
    if (!window.confirm(`Delete order ${label}? This cannot be undone.`)) return;
    setDeletingId(order.id);
    try {
      await api.delete(`/orders/${order.id}`);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      toast.success('Order deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="page-title">Orders</h1>
        <p className="page-subtitle">Full order list — delete removes the order and related records</p>
      </div>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Date</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="font-mono text-xs">{o.id.slice(0, 8)}</td>
                <td>{o.user?.name}</td>
                <td>{o.items?.length || 0}</td>
                <td>{formatMoney(o.totalPrice)}</td>
                <td>{o.paymentMethod}</td>
                <td><span className={orderStatusBadge[o.status]}>{orderStatusLabel[o.status]}</span></td>
                <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    type="button"
                    className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                    title="Delete order"
                    disabled={deletingId === o.id}
                    onClick={() => remove(o)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-timber-400 py-8 text-sm">
                  No orders yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
