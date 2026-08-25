import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Users,
  Package,
  Lightbulb,
  Trash2,
  Plus,
} from 'lucide-react';
import api from '../../api/axios';
import StatCard from '../../components/ui/StatCard';
import Modal from '../../components/ui/Modal';
import { formatMoney, orderStatusBadge, orderStatusLabel } from '../../utils/helpers';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'shareholders', label: 'Shareholders' },
  { id: 'ledger', label: 'Custom expenses / revenue' },
];

const SHAREHOLDER_OPTIONS = [
  { id: 'ziad', name: 'Ziad' },
  { id: 'khaled', name: 'Khaled' },
  { id: 'omar', name: 'Omar' },
];

const emptyEntry = {
  kind: 'expense',
  funding: 'company',
  paidBy: 'omar',
  title: '',
  notes: '',
  amount: '',
  occurredAt: new Date().toISOString().slice(0, 10),
};

export default function StaffFinance() {
  const [tab, setTab] = useState('overview');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyEntry);
  const [saving, setSaving] = useState(false);

  const dateQuery = () => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    return q.toString();
  };

  const load = async () => {
    setLoading(true);
    try {
      const q = dateQuery();
      const [overviewRes, entriesRes] = await Promise.all([
        api.get(`/finance/overview?${q}`),
        api.get(`/finance/entries?${q}`),
      ]);
      setData(overviewRes.data);
      setEntries(entriesRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load finance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(emptyEntry);
    setModalOpen(true);
  };

  const saveEntry = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/finance/entries', {
        ...form,
        amount: Number(form.amount),
        paidBy: form.funding === 'advance' ? form.paidBy : null,
      });
      toast.success('Entry saved');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async (id) => {
    if (!window.confirm('Delete this finance entry?')) return;
    try {
      await api.delete(`/finance/entries/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const o = data?.overview;

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Finance</h1>
          <p className="page-subtitle">
            Revenue, product costs, custom ledger, and shareholder splits
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button type="button" className="btn-dark" onClick={load} disabled={loading}>
            Apply
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-timber-100 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? 'bg-timber-800 text-white'
                : 'bg-white text-timber-600 border border-timber-200 hover:bg-timber-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="card text-timber-400 text-sm py-12 text-center">Loading finance…</div>
      ) : null}

      {data && tab === 'overview' && o && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard title="Total revenue" value={formatMoney(o.totalRevenue)} icon={TrendingUp} tone="green" />
            <StatCard title="Total expenses" value={formatMoney(o.totalExpenses)} icon={TrendingDown} tone="red" />
            <StatCard title="Profit" value={formatMoney(o.profit)} icon={Wallet} tone="wheat" />
            <StatCard title="Margin" value={`${o.marginPercent}%`} icon={Package} tone="blue" />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="card space-y-2 text-sm">
              <h2 className="font-semibold text-timber-800">Revenue breakdown</h2>
              <Row label="Orders (gross)" value={formatMoney(o.orderRevenue)} />
              <Row label="Items subtotal" value={formatMoney(o.itemsRevenue)} />
              <Row label="Shipping charged" value={formatMoney(o.shippingRevenue)} />
              <Row label="Discounts" value={`−${formatMoney(o.discounts)}`} />
              <Row label="Custom revenue" value={formatMoney(o.customRevenue)} />
              <Row label="Collected (paid)" value={formatMoney(o.collected)} bold />
            </div>
            <div className="card space-y-2 text-sm">
              <h2 className="font-semibold text-timber-800">Expenses breakdown</h2>
              <Row label="Product COGS (auto)" value={formatMoney(o.cogs)} />
              <Row label="Company expenses" value={formatMoney(o.companyExpenses)} />
              <Row label="Shareholder advances" value={formatMoney(o.advanceExpenses)} />
              <Row label="Units sold" value={String(o.unitsSold)} />
              <p className="text-xs text-timber-400 pt-2">
                COGS = each sold item’s Cost × qty (default cost EGP 1,000).
              </p>
            </div>
            <div className="card space-y-2 text-sm">
              <h2 className="font-semibold text-timber-800">Profit per shareholder</h2>
              {(data.shareholders || []).map((s) => (
                <Row
                  key={s.id}
                  label={`${s.name} (${s.sharePercent}%)`}
                  value={formatMoney(s.profitShare)}
                />
              ))}
              <Row label="Orders counted" value={String(o.orderCount)} bold />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="font-semibold mb-4">Orders by status</h2>
              <ul className="space-y-2 text-sm">
                {Object.entries(data.byStatus || {}).map(([k, v]) => (
                  <li key={k} className="flex justify-between">
                    <span className={orderStatusBadge[k]}>{orderStatusLabel[k]}</span>
                    <span className="font-medium">{v}</span>
                  </li>
                ))}
                {!Object.keys(data.byStatus || {}).length && (
                  <li className="text-timber-400">No orders in range</li>
                )}
              </ul>
            </div>
            <div className="card">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-wheat" /> Suggestions
              </h2>
              <ul className="space-y-2 text-sm text-timber-600 list-disc pl-5">
                {(data.suggestions || []).map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {data && tab === 'shareholders' && (
        <div className="space-y-6">
          {o && (
            <div className="grid sm:grid-cols-2 gap-4">
              <StatCard title="Company profit" value={formatMoney(o.profit)} icon={Wallet} tone="wheat" />
              <StatCard
                title="Total revenue"
                value={formatMoney(o.totalRevenue)}
                icon={TrendingUp}
                tone="green"
              />
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            {(data.shareholders || []).map((s) => (
              <div key={s.id} className="card space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-wheat" />
                  <h2 className="font-semibold text-lg">{s.name}</h2>
                  <span className="ms-auto text-sm font-bold text-timber-500">{s.sharePercent}%</span>
                </div>
                <div className="rounded-xl bg-cream/70 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-timber-500">
                    Profit
                  </p>
                  <p className="mt-1 font-display text-3xl tracking-wide text-timber-900">
                    {formatMoney(s.profitShare)}
                  </p>
                  <p className="mt-1 text-xs text-timber-400">
                    {s.sharePercent}% of company profit
                    {o ? ` (${formatMoney(o.profit)})` : ''}
                  </p>
                </div>
                <Row label="Owed to them (advances)" value={formatMoney(s.owedToThem)} />
                <Row label="They owe others" value={formatMoney(s.theyOwe)} />
                <Row
                  label="Net reimbursement"
                  value={formatMoney(s.netReimbursement)}
                  bold
                />
                <Row
                  label="Profit + net reimbursement"
                  value={formatMoney((Number(s.profitShare) || 0) + (Number(s.netReimbursement) || 0))}
                  bold
                />
              </div>
            ))}
          </div>

          <div className="card">
            <h2 className="font-semibold mb-2">How reimbursements work</h2>
            <p className="text-sm text-timber-500 mb-4">
              If Omar pays an Uber from his pocket as a business advance, that amount is a company
              expense and the other shareholders repay him by their ownership shares (Ziad 40%,
              Khaled 30%). Shared company expenses (e.g. marketing paid together) are deducted from
              profit only — nobody is reimbursed.
            </p>
            <div className="table-wrapper !mx-0">
              <table className="table">
                <thead>
                  <tr>
                    <th>Expense</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.settlements || []).map((row, i) => (
                    <tr key={`${row.entryId}-${i}`}>
                      <td>{row.title}</td>
                      <td>{row.fromName}</td>
                      <td>{row.toName}</td>
                      <td>{formatMoney(row.amount)}</td>
                    </tr>
                  ))}
                  {!(data.settlements || []).length && (
                    <tr>
                      <td colSpan={4} className="text-center text-timber-400 py-8 text-sm">
                        No shareholder advances in this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-timber-500 max-w-2xl">
              <strong>Company expense</strong> — shared cost (marketing, rent). Deducted from
              revenue, not paid back.
              <br />
              <strong>Shareholder advance</strong> — one partner paid from their pocket. Deducted
              from revenue and reimbursed by the others according to ownership %.
            </p>
            <button type="button" className="btn-wheat w-full sm:w-auto" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add entry
            </button>
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Funding</th>
                  <th>Paid by</th>
                  <th>Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.occurredAt).toLocaleDateString()}</td>
                    <td>
                      <div className="font-medium">{e.title}</div>
                      {e.notes && <div className="text-xs text-timber-400 max-w-xs truncate">{e.notes}</div>}
                    </td>
                    <td className="capitalize">{e.kind}</td>
                    <td>{e.funding === 'advance' ? 'Shareholder advance' : 'Company'}</td>
                    <td className="capitalize">{e.paidBy || '—'}</td>
                    <td className={e.kind === 'expense' ? 'text-red-700' : 'text-green-700'}>
                      {e.kind === 'expense' ? '−' : '+'}
                      {formatMoney(e.amount)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-ghost btn-sm text-red-600"
                        onClick={() => removeEntry(e.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!entries.length && (
                  <tr>
                    <td colSpan={7} className="text-center text-timber-400 py-8 text-sm">
                      No custom entries yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add finance entry">
        <form onSubmit={saveEntry} className="space-y-4">
          <div>
            <label className="label">Kind</label>
            <select
              className="input"
              value={form.kind}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kind: e.target.value,
                  funding: e.target.value === 'revenue' ? 'company' : f.funding,
                }))
              }
            >
              <option value="expense">Expense</option>
              <option value="revenue">Revenue</option>
            </select>
          </div>
          {form.kind === 'expense' && (
            <div>
              <label className="label">Funding</label>
              <select
                className="input"
                value={form.funding}
                onChange={(e) => setForm({ ...form, funding: e.target.value })}
              >
                <option value="company">Company (shared — not reimbursed)</option>
                <option value="advance">Shareholder advance (reimburse payer)</option>
              </select>
            </div>
          )}
          {form.kind === 'expense' && form.funding === 'advance' && (
            <div>
              <label className="label">Paid by</label>
              <select
                className="input"
                value={form.paidBy}
                onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
              >
                {SHAREHOLDER_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Title</label>
            <input
              required
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Uber delivery / Marketing ads"
            />
          </div>
          <div>
            <label className="label">Amount (EGP)</label>
            <input
              required
              type="number"
              min="1"
              step="0.01"
              className="input"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={form.occurredAt}
              onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-wheat w-full" disabled={saving}>
            {saving ? 'Saving…' : 'Save entry'}
          </button>
        </form>
      </Modal>
    </>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? 'font-semibold text-timber-800 pt-1 border-t border-timber-100' : 'text-timber-600'}`}>
      <span>{label}</span>
      <span className="tabular-nums text-timber-900">{value}</span>
    </div>
  );
}
