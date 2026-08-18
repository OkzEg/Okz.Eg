import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import { getImageUrl } from '../../utils/helpers';

function CollectionList({
  title,
  hint,
  products,
  selected,
  orderKey,
  flagKey,
  onAdd,
  onRemove,
  onOrder,
}) {
  const [pick, setPick] = useState('');
  const available = products.filter((p) => !p[flagKey]);
  const rows = [...selected].sort(
    (a, b) => (Number(a[orderKey]) || 0) - (Number(b[orderKey]) || 0)
  );

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="font-semibold text-lg text-timber-800">{title}</h2>
        <p className="text-sm text-timber-500 mt-1">{hint}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-timber-400">None yet — add a product below.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-timber-100 bg-cream/40 p-2"
            >
              <img
                src={getImageUrl(p.photos?.[0])}
                alt=""
                className="h-12 w-12 rounded object-cover bg-timber-100"
              />
              <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
              <label className="flex items-center gap-2 text-xs text-timber-500">
                Order
                <input
                  type="number"
                  className="input !w-16 !py-1.5"
                  defaultValue={p[orderKey] ?? 0}
                  key={`${p.id}-${p[orderKey]}`}
                  onBlur={(e) => onOrder(p.id, e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn-ghost btn-sm text-red-600"
                onClick={() => onRemove(p.id)}
                aria-label={`Remove ${p.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <select
          className="input flex-1"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
        >
          <option value="">Add a product…</option>
          {available.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-wheat btn-sm whitespace-nowrap"
          disabled={!pick}
          onClick={() => {
            onAdd(pick);
            setPick('');
          }}
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
    </div>
  );
}

export default function StaffHomepage() {
  const [products, setProducts] = useState([]);

  const load = () =>
    api.get('/products').then((r) => setProducts(Array.isArray(r.data) ? r.data : []));

  useEffect(() => {
    load();
  }, []);

  const patch = async (id, data) => {
    try {
      await api.put(`/products/${id}`, data);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const bestSellers = products.filter((p) => p.isBestSeller);
  const homeProducts = products.filter((p) => p.isHomeProduct);
  const shopRows = [...products].sort(
    (a, b) =>
      (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) ||
      new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <>
      <div className="mb-6">
        <h1 className="page-title">Homepage</h1>
        <p className="page-subtitle">
          Choose which products appear in Best sellers and Our products, and set shop order.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CollectionList
          title="Best sellers"
          hint="Shown on the homepage in this order. Lower numbers first."
          products={products}
          selected={bestSellers}
          flagKey="isBestSeller"
          orderKey="bestSellerOrder"
          onAdd={(id) =>
            patch(id, {
              isBestSeller: true,
              bestSellerOrder: bestSellers.length + 1,
            })
          }
          onRemove={(id) => patch(id, { isBestSeller: false })}
          onOrder={(id, value) => patch(id, { bestSellerOrder: Number(value) || 0 })}
        />

        <CollectionList
          title="Our products"
          hint="Shown on the homepage in this order. Lower numbers first."
          products={products}
          selected={homeProducts}
          flagKey="isHomeProduct"
          orderKey="homeOrder"
          onAdd={(id) =>
            patch(id, {
              isHomeProduct: true,
              homeOrder: homeProducts.length + 1,
            })
          }
          onRemove={(id) => patch(id, { isHomeProduct: false })}
          onOrder={(id, value) => patch(id, { homeOrder: Number(value) || 0 })}
        />
      </div>

      <div className="card mt-6 space-y-4">
        <div>
          <h2 className="font-semibold text-lg text-timber-800">Shop order</h2>
          <p className="text-sm text-timber-500 mt-1">
            Controls the default order on the shop page. Lower numbers appear first.
          </p>
        </div>
        <ul className="space-y-2">
          {shopRows.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-timber-100 bg-cream/40 p-2"
            >
              <img
                src={getImageUrl(p.photos?.[0])}
                alt=""
                className="h-12 w-12 rounded object-cover bg-timber-100"
              />
              <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
              <label className="flex items-center gap-2 text-xs text-timber-500">
                Order
                <input
                  type="number"
                  className="input !w-16 !py-1.5"
                  defaultValue={p.sortOrder ?? 0}
                  key={`${p.id}-${p.sortOrder}`}
                  onBlur={(e) => patch(p.id, { sortOrder: Number(e.target.value) || 0 })}
                />
              </label>
            </li>
          ))}
          {shopRows.length === 0 && (
            <p className="text-sm text-timber-400">No products yet.</p>
          )}
        </ul>
      </div>
    </>
  );
}
