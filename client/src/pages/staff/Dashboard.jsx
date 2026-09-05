import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, ShoppingBag, AlertTriangle, Truck, TrendingUp, Users, BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import api from '../../api/axios';
import StatCard from '../../components/ui/StatCard';
import { useAuth } from '../../context/AuthContext';
import { formatMoney, orderStatusBadge, orderStatusLabel } from '../../utils/helpers';

const CHART_COLORS = ['#c8a96e', '#8b7355', '#a0522d', '#d4a574', '#6e686f', '#b8860b', '#cd853f', '#deb887'];
const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  out_for_delivery: '#8b5cf6',
  delivered: '#10b981',
  canceled: '#ef4444',
  problem: '#f97316',
};

function ChartCard({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-timber-100 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-wheat" />}
        <h3 className="font-semibold text-timber-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-timber-100 bg-white px-4 py-3 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-timber-500">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm" style={{ color: p.color }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const [finance, setFinance] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const tasks = [api.get('/orders').then((r) => (alive ? setOrders(r.data.slice(0, 8)) : null))];
    if (user.role === 'admin') {
      tasks.push(api.get('/orders/finance').then((r) => (alive ? setFinance(r.data) : null)));
      tasks.push(api.get('/orders/analytics?months=12').then((r) => (alive ? setAnalytics(r.data) : null)));
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

      {/* ── Analytics Charts (Admin only) ── */}
      {user.role === 'admin' && analytics && (
        <div className="space-y-6 mb-8">
          {/* Row 1: Revenue + Customer Growth */}
          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Monthly Revenue" icon={TrendingUp}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.monthlyRevenue}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c8a96e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#c8a96e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8b7355' }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#8b7355' }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip formatter={(v) => formatMoney(v)} />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#c8a96e"
                      strokeWidth={2.5}
                      fill="url(#revenueGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="New Customers" icon={Users}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.customerGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8b7355' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#8b7355' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="customers" name="New Customers" fill="#c8a96e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Row 2: Popular Sizes + Order Status */}
          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Most Popular Sizes" icon={BarChart3}>
              {analytics.popularSizes?.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.popularSizes} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe3" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#8b7355' }} allowDecimals={false} />
                      <YAxis type="category" dataKey="size" tick={{ fontSize: 12, fill: '#6e686f', fontWeight: 600 }} width={50} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="qty" name="Units Sold" radius={[0, 6, 6, 0]}>
                        {analytics.popularSizes.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-16 text-center text-sm text-timber-400">No size data yet.</p>
              )}
            </ChartCard>

            <ChartCard title="Order Status Breakdown" icon={Package}>
              {analytics.statusBreakdown?.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.statusBreakdown}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={50}
                        paddingAngle={3}
                        label={({ status, count }) => `${status.replace('_', ' ')} (${count})`}
                        labelLine={{ stroke: '#c8a96e', strokeWidth: 1 }}
                      >
                        {analytics.statusBreakdown.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#c8a96e'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-16 text-center text-sm text-timber-400">No orders yet.</p>
              )}
            </ChartCard>
          </div>

          {/* Row 3: Top Products + Revenue by Payment */}
          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Top Selling Products" icon={ShoppingBag}>
              {analytics.topProducts?.length > 0 ? (
                <div className="space-y-3">
                  {analytics.topProducts.map((p, i) => {
                    const maxQty = analytics.topProducts[0]?.qty || 1;
                    const pct = Math.round((p.qty / maxQty) * 100);
                    return (
                      <div key={p.id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium text-timber-700" style={{ maxWidth: '60%' }}>
                            {i + 1}. {p.name}
                          </span>
                          <span className="text-timber-500 tabular-nums">{p.qty} sold · {formatMoney(p.revenue)}</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-timber-100">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-16 text-center text-sm text-timber-400">No product data yet.</p>
              )}
            </ChartCard>

            <ChartCard title="Revenue by Payment Method" icon={TrendingUp}>
              {analytics.revenueByPayment?.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.revenueByPayment}
                        dataKey="revenue"
                        nameKey="method"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={50}
                        paddingAngle={3}
                        label={({ method, revenue }) => `${method} (${formatMoney(revenue)})`}
                        labelLine={{ stroke: '#c8a96e', strokeWidth: 1 }}
                      >
                        {analytics.revenueByPayment.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatMoney(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-16 text-center text-sm text-timber-400">No payment data yet.</p>
              )}
            </ChartCard>
          </div>
        </div>
      )}

      {/* ── Recent Orders Table ── */}
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
