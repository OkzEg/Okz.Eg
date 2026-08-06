import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatMoney, orderStatusBadge, orderStatusLabel } from '../utils/helpers';

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
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      <h1 className="font-display text-5xl tracking-wide">Account</h1>
      <form onSubmit={save} className="card grid md:grid-cols-2 gap-4">
        {['name', 'email', 'phone', 'password', 'street', 'city', 'state', 'zip', 'country'].map((f) => (
          <div key={f} className={['street', 'password'].includes(f) ? 'md:col-span-2' : ''}>
            <label className="label capitalize">{f === 'password' ? 'New password (optional)' : f}</label>
            <input
              type={f === 'password' ? 'password' : f === 'email' ? 'email' : 'text'}
              className="input"
              value={form[f]}
              onChange={(e) => setForm({ ...form, [f]: e.target.value })}
              required={f !== 'password'}
            />
          </div>
        ))}
        <div className="md:col-span-2">
          <button type="submit" className="btn-wheat">Save changes</button>
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
                      <span className={orderStatusBadge[o.status]}>
                        {orderStatusLabel[o.status]}
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
