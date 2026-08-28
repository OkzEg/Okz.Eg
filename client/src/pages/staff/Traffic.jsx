import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '../../api/axios';

const formatTime = (iso) => {
  try {
    return new Date(iso).toLocaleString('en-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
};

const shortUa = (ua) => {
  if (!ua) return '—';
  if (ua.length <= 72) return ua;
  return `${ua.slice(0, 72)}…`;
};

export default function StaffTraffic() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: payload } = await api.get('/traffic/today');
      setData(payload);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load traffic log');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Traffic log</h1>
          <p className="page-subtitle">
            API requests logged from when this feature was deployed. Requests through{' '}
            <span className="font-medium">www.okz-eg.store</span> should show visitor IPs in the
            forwarded-for chain; direct Railway hits show the proxy IP.
          </p>
        </div>
        <button type="button" className="btn-outline btn-sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-4">
              <p className="text-xs uppercase tracking-wide text-timber-500">Today (UTC)</p>
              <p className="mt-1 text-2xl font-semibold text-timber-900">{data.total}</p>
              <p className="text-xs text-timber-500">total API requests</p>
            </div>
            <div className="card p-4">
              <p className="text-xs uppercase tracking-wide text-timber-500">Showing</p>
              <p className="mt-1 text-2xl font-semibold text-timber-900">{data.returned}</p>
              <p className="text-xs text-timber-500">most recent rows</p>
            </div>
            <div className="card p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-timber-500 mb-2">Top paths</p>
              <ul className="space-y-1 text-sm text-timber-700">
                {data.topPaths?.length ? (
                  data.topPaths.map((row) => (
                    <li key={row.path} className="flex justify-between gap-3">
                      <span className="truncate font-mono text-xs">{row.path}</span>
                      <span className="shrink-0 font-semibold">{row.count}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-timber-400">No requests yet</li>
                )}
              </ul>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Status</th>
                  <th>IP</th>
                  <th>User agent</th>
                  <th>Referer</th>
                </tr>
              </thead>
              <tbody>
                {data.logs?.length ? (
                  data.logs.map((row) => (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap text-xs">{formatTime(row.createdAt)}</td>
                      <td className="font-mono text-xs">{row.method}</td>
                      <td className="max-w-[14rem] truncate font-mono text-xs" title={row.path}>
                        {row.path}
                      </td>
                      <td>{row.status ?? '—'}</td>
                      <td className="whitespace-nowrap text-xs" title={row.forwardedFor || row.ip}>
                        {row.ip || '—'}
                      </td>
                      <td className="max-w-[12rem] truncate text-xs" title={row.userAgent || ''}>
                        {shortUa(row.userAgent)}
                      </td>
                      <td className="max-w-[10rem] truncate text-xs" title={row.referer || ''}>
                        {row.referer || '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-timber-400">
                      No traffic logged yet today. Earlier visits were not recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
