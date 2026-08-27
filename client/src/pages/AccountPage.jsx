import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatMoney, customerOrderStatusBadge, customerOrderStatusLabel } from '../utils/helpers';
import AddressFields from '../components/store/AddressFields';

export default function AccountPage() {
  const { user, updateUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zip: user?.address?.zip || '',
    country: user?.address?.country || '',
    password: '',
  });

  useEffect(() => {
    if (user?.role === 'customer') {
      api.get('/orders/mine').then((r) => setOrders(r.data)).catch(() => {});
    }
  }, [user]);

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: {
          street: form.street,
          city: form.city,
          state: form.state,
          zip: form.zip,
          country: form.country,
        },
      };
      if (form.password) payload.password = form.password;
      const { data } = await api.put('/auth/profile', payload);
      updateUser(data);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 sm:space-y-10">
      <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Account</h1>
      <form onSubmit={save} className="card grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Name</label>
          <input
            required
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            required
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            required
            type="tel"
            className="input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div>
          <label className="label">New password (optional)</label>
          <input
            type="password"
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <AddressFields
            idPrefix="account"
            values={form}
            onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="btn-wheat w-full sm:w-auto">Save changes</button>
        </div>
      </form>

      {user?.role === 'customer' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Orders</h2>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/order/${o.id}`} className="text-wheat-500 font-medium">
                        #{o.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td>{formatMoney(o.totalPrice)}</td>
                    <td>
                      <span className={customerOrderStatusBadge[o.status]}>
                        {customerOrderStatusLabel[o.status]}
                      </span>
                    </td>
                  </tr>
                ))}
                {!orders.length && (
                  <tr>
                    <td colSpan={4} className="text-center text-timber-400 py-8">
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
