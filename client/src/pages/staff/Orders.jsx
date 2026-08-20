import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Trash2 } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { formatMoney, orderStatusBadge, orderStatusLabel } from '../../utils/helpers';

export default function StaffOrders() {
  const [orders, setOrders] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

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
              <th>Receipt</th>
              <th>Status</th>
              <th>Date</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="font-mono text-xs">{o.id.slice(0, 8)}</td>
                <td>{o.customerName || o.user?.name || 'Guest'}</td>
                <td>{o.items?.length || 0}</td>
                <td>{formatMoney(o.totalPrice)}</td>
                <td>{o.paymentMethod}</td>
                <td>
                  {o.paymentReceiptUrl ? (
                    <button
                      type="button"
                      className="block rounded-md border border-timber-200 overflow-hidden hover:ring-2 hover:ring-wheat focus:outline-none focus:ring-2 focus:ring-wheat"
                      onClick={() => setPreviewUrl(o.paymentReceiptUrl)}
                      title="Preview receipt"
                    >
                      <img
                        src={o.paymentReceiptUrl}
                        alt="Payment receipt"
                        className="h-12 w-12 object-cover bg-timber-50"
                      />
                    </button>
                  ) : (
                    <span className="text-timber-400 text-xs">—</span>
                  )}
                </td>
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
                <td colSpan={9} className="text-center text-timber-400 py-8 text-sm">
                  No orders yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={Boolean(previewUrl)}
        onClose={() => setPreviewUrl('')}
        title="Payment receipt"
        wide
      >
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Payment receipt full size"
            className="mx-auto max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
          />
        )}
      </Modal>
    </>
  );
}
