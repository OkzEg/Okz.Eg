import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Trash2 } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { formatMoney, orderStatusBadge, orderStatusLabel } from '../../utils/helpers';

const NEXT = {
  pending: ['confirmed', 'canceled'],
  confirmed: ['out_for_delivery', 'canceled', 'problem'],
  out_for_delivery: ['delivered', 'problem', 'canceled'],
  problem: ['confirmed', 'out_for_delivery', 'canceled'],
  delivered: [],
  canceled: [],
};

export default function StaffDeliveries() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const load = () =>
    api.get('/orders' + (filter ? `?status=${filter}` : '')).then((r) => setOrders(r.data));

  useEffect(() => { load(); }, [filter]);

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/orders/${id}/status`, { status });
      toast.success(`Marked ${orderStatusLabel[status]}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

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
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between mb-6">
        <div>
          <h1 className="page-title">Deliveries</h1>
          <p className="page-subtitle">Track and advance order fulfillment</p>
        </div>
        <select className="input w-full sm:w-48" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {Object.keys(orderStatusLabel).map((s) => (
            <option key={s} value={s}>{orderStatusLabel[s]}</option>
          ))}
        </select>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Total</th>
              <th>Receipt</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="font-mono text-xs">{o.id.slice(0, 8)}</td>
                <td>{o.customerName || o.user?.name || 'Guest'}</td>
                <td>{o.customerPhone || o.user?.phone || '—'}</td>
                <td className="max-w-[180px] truncate">
                  {o.shippingAddress?.city}, {o.shippingAddress?.street}
                </td>
                <td>{formatMoney(o.totalPrice)}</td>
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
                <td>
                  <div className="flex flex-wrap gap-1 items-center">
                    {(NEXT[o.status] || []).map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="btn-outline btn-sm"
                        onClick={() => setStatus(o.id, s)}
                      >
                        {orderStatusLabel[s]}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                      title="Delete order"
                      disabled={deletingId === o.id}
                      onClick={() => remove(o)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
