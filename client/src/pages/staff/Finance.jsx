import { useEffect, useState } from 'react';
import { ShoppingBag, Package, Wallet } from 'lucide-react';
import api from '../../api/axios';
import StatCard from '../../components/ui/StatCard';
import { formatMoney, orderStatusBadge, orderStatusLabel } from '../../utils/helpers';

export default function StaffFinance() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);

  const load = () => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    api.get(`/orders/finance?${q}`).then((r) => setData(r.data));
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <div className="mb-6">
        <h1 className="page-title">Finance</h1>
        <p className="page-subtitle">Revenue and order performance</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button type="button" className="btn-dark" onClick={load}>Apply</button>
      </div>

      {data && (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <StatCard title="Gross revenue" value={formatMoney(data.revenue)} icon={Wallet} tone="green" />
            <StatCard title="Collected (paid)" value={formatMoney(data.paid)} icon={ShoppingBag} tone="blue" />
            <StatCard title="Orders" value={data.orderCount} icon={Package} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="font-semibold mb-4">By status</h2>
              <ul className="space-y-2 text-sm">
                {Object.entries(data.byStatus || {}).map(([k, v]) => (
                  <li key={k} className="flex justify-between">
                    <span className={orderStatusBadge[k]}>{orderStatusLabel[k]}</span>
                    <span className="font-medium">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h2 className="font-semibold mb-4">Recent</h2>
              <div className="space-y-2 text-sm">
                {(data.recentOrders || []).map((o) => (
                  <div key={o.id} className="flex justify-between">
                    <span className="font-mono text-xs">{o.id.slice(0, 8)}</span>
                    <span>{formatMoney(o.totalPrice)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
