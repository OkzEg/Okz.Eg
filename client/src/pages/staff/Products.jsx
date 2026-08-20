import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FolderOpen, Loader2, Minus, Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { PRODUCT_TYPES, formatMoney, getImageUrl, parseSizes } from '../../utils/helpers';

const empty = {
  name: '',
  description: '',
  price: '',
  type: 'shoe',
  photos: '',
  driveFolder: '',
  colors: '',
  sizes: '',
  stock: 0,
  sizeStock: {},
  isSaleActive: false,
  salePrice: '',
  sortOrder: 0,
  isBestSeller: false,
  bestSellerOrder: 0,
  isHomeProduct: false,
  homeOrder: 0,
};

const syncSizeStock = (sizesValue, currentSizeStock = {}) => {
  const sizes = parseSizes(sizesValue);
  const next = {};
  sizes.forEach((size) => {
    next[size] = currentSizeStock[size] ?? '0';
  });
  return next;
};

export default function StaffProducts() {
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [loadingFolder, setLoadingFolder] = useState(false);
  // Batch stock deltas so rapid +/- taps stay instant and send one request
  const stockQueue = useRef({});

  const load = () =>
    api.get('/products').then((r) => {
      const rows = Array.isArray(r.data) ? r.data : [];
      rows.sort(
        (a, b) =>
          (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) ||
          new Date(b.createdAt) - new Date(a.createdAt)
      );
      setProducts(rows);
    });
  useEffect(() => {
    load();
  }, []);

  const flushStock = async (id) => {
    const q = stockQueue.current[id];
    if (!q || q.inFlight) return;

    const snapshot = Object.fromEntries(
      Object.entries(q.pending).filter(([, delta]) => delta)
    );
    if (!Object.keys(snapshot).length) return;

    q.inFlight = true;
    Object.keys(snapshot).forEach((key) => {
      q.pending[key] = 0;
    });

    try {
      let last = null;
      for (const [sizeKey, delta] of Object.entries(snapshot)) {
        const { data } = await api.patch(`/products/${id}/stock`, {
          delta,
          ...(sizeKey ? { size: sizeKey } : {}),
        });
        last = data;
      }

      const stillPending = stockQueue.current[id]?.pending || {};
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== id || !last) return p;
          const sizeStock = { ...(last.sizeStock || p.sizeStock || {}) };
          let stock = Number(last.stock) || 0;
          Object.entries(stillPending).forEach(([sizeKey, delta]) => {
            if (!delta) return;
            if (sizeKey) {
              sizeStock[sizeKey] = Math.max(0, (Number(sizeStock[sizeKey]) || 0) + delta);
            } else {
              stock = Math.max(0, stock + delta);
            }
          });
          if (p.sizes?.length) {
            stock = p.sizes.reduce((sum, size) => sum + (Number(sizeStock[size]) || 0), 0);
          }
          return { ...p, stock, sizeStock };
        })
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Stock update failed');
      if (stockQueue.current[id]) stockQueue.current[id].pending = {};
      await load();
    } finally {
      const queue = stockQueue.current[id];
      if (queue) {
        queue.inFlight = false;
        if (Object.values(queue.pending).some(Boolean)) flushStock(id);
      }
    }
  };

  const adjust = (id, delta, size) => {
    const sizeKey = size || '';
    let applied = true;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (sizeKey) {
          const current = Number(p.sizeStock?.[sizeKey]) || 0;
          if (delta < 0 && current <= 0) {
            applied = false;
            return p;
          }
          const sizeStock = {
            ...(p.sizeStock || {}),
            [sizeKey]: Math.max(0, current + delta),
          };
          const stock = p.sizes?.length
            ? p.sizes.reduce((sum, s) => sum + (Number(sizeStock[s]) || 0), 0)
            : Math.max(0, (Number(p.stock) || 0) + delta);
          return { ...p, sizeStock, stock };
        }
        if (delta < 0 && p.stock <= 0) {
          applied = false;
          return p;
        }
        return { ...p, stock: Math.max(0, p.stock + delta) };
      })
    );
    if (!applied) return;

    if (!stockQueue.current[id]) {
      stockQueue.current[id] = { pending: {}, inFlight: false, timer: null };
    }
    const queue = stockQueue.current[id];
    queue.pending[sizeKey] = (queue.pending[sizeKey] || 0) + delta;

    clearTimeout(queue.timer);
    queue.timer = setTimeout(() => flushStock(id), 400);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description,
      price: p.price,
      type: p.type,
      photos: (p.photos || []).join('\n'),
      driveFolder: '',
      colors: (p.colors || []).join(', '),
      sizes: (p.sizes || []).join(', '),
      stock: p.stock,
      sizeStock: syncSizeStock(
        (p.sizes || []).join(', '),
        Object.fromEntries(
          (p.sizes || []).map((size) => [size, String(p.sizeStock?.[size] ?? 0)])
        )
      ),
      isSaleActive: p.isSaleActive,
      salePrice: p.salePrice ?? '',
      sortOrder: p.sortOrder ?? 0,
      isBestSeller: Boolean(p.isBestSeller),
      bestSellerOrder: p.bestSellerOrder ?? 0,
      isHomeProduct: Boolean(p.isHomeProduct),
      homeOrder: p.homeOrder ?? 0,
    });
    setOpen(true);
  };

  const loadDriveFolder = async () => {
    const folder = form.driveFolder.trim();
    if (!folder) return toast.error('Paste a Google Drive folder link first');
    setLoadingFolder(true);
    try {
      const { data } = await api.post('/products/resolve-photos', { links: [folder] });
      const existing = form.photos
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const merged = [...new Set([...existing, ...data.photos])];
      setForm((f) => ({ ...f, photos: merged.join('\n') }));
      toast.success(`Loaded ${data.count} image${data.count === 1 ? '' : 's'} from Drive`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not read Drive folder');
    } finally {
      setLoadingFolder(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const links = [
      ...form.photos.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
      ...(form.driveFolder.trim() ? [form.driveFolder.trim()] : []),
    ];
    const sizes = parseSizes(form.sizes);
    const sizeStock = {};
    sizes.forEach((size) => {
      sizeStock[size] = Number(form.sizeStock[size]) || 0;
    });
    const stock = sizes.length
      ? sizes.reduce((sum, size) => sum + (sizeStock[size] || 0), 0)
      : Number(form.stock) || 0;
    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      type: form.type,
      photos: links,
      colors: form.colors.split(',').map((s) => s.trim()).filter(Boolean),
      sizes,
      sizeStock,
      stock,
      isSaleActive: Boolean(form.isSaleActive),
      salePrice: form.salePrice === '' ? null : Number(form.salePrice),
      sortOrder: Number(form.sortOrder) || 0,
      isBestSeller: Boolean(form.isBestSeller),
      bestSellerOrder: Number(form.bestSellerOrder) || 0,
      isHomeProduct: Boolean(form.isHomeProduct),
      homeOrder: Number(form.homeOrder) || 0,
    };
    try {
      if (editing) await api.put(`/products/${editing.id}`, payload);
      else await api.post('/products', payload);
      toast.success(editing ? 'Product updated' : 'Product created');
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await api.delete(`/products/${id}`);
    toast.success('Deleted');
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const previewPhotos = form.photos
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
  const parsedSizes = parseSizes(form.sizes);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">
            Manage catalog, homepage collections, and shop order
          </p>
        </div>
        <button type="button" className="btn-wheat w-full sm:w-auto" onClick={openCreate}>
          Add product
        </button>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Type</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Shop order</th>
              <th>Home</th>
              <th>Sale</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <img
                      src={getImageUrl(p.photos?.[0])}
                      alt=""
                      className="w-10 h-10 rounded object-cover bg-timber-100"
                    />
                    <span className="font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="capitalize">{p.type.replace('_', ' ')}</td>
                <td>{formatMoney(p.price)}</td>
                <td className="!whitespace-normal">
                  {p.sizes?.length ? (
                    <div className="flex flex-col items-start gap-1.5">
                      {p.sizes.map((size) => {
                        const qty = Number(p.sizeStock?.[size]) || 0;
                        return (
                          <div
                            key={size}
                            className="flex items-center gap-1 rounded-lg bg-timber-50 px-1.5 py-1"
                          >
                            <span className="min-w-[1.5rem] text-xs font-semibold text-timber-500">
                              {size}
                            </span>
                            <button
                              type="button"
                              className="btn-outline btn-sm !px-2"
                              onClick={() => adjust(p.id, -1, size)}
                              disabled={qty <= 0}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-semibold tabular-nums">
                              {qty}
                            </span>
                            <button
                              type="button"
                              className="btn-outline btn-sm !px-2"
                              onClick={() => adjust(p.id, 1, size)}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="btn-outline btn-sm !px-2"
                        onClick={() => adjust(p.id, -1)}
                        disabled={p.stock <= 0}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-semibold tabular-nums">
                        {p.stock}
                      </span>
                      <button
                        type="button"
                        className="btn-outline btn-sm !px-2"
                        onClick={() => adjust(p.id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </td>
                <td className="tabular-nums">{p.sortOrder ?? 0}</td>
                <td>
                  <div className="flex flex-col gap-1 text-xs">
                    {p.isBestSeller && (
                      <span className="rounded-full bg-wheat/20 px-2 py-0.5 font-semibold text-timber-700">
                        Best seller #{p.bestSellerOrder ?? 0}
                      </span>
                    )}
                    {p.isHomeProduct && (
                      <span className="rounded-full bg-timber-100 px-2 py-0.5 font-semibold text-timber-700">
                        New collection #{p.homeOrder ?? 0}
                      </span>
                    )}
                    {!p.isBestSeller && !p.isHomeProduct && '—'}
                  </div>
                </td>
                <td>{p.isSaleActive ? formatMoney(p.salePrice) : '—'}</td>
                <td>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-sm text-red-600"
                      onClick={() => remove(p.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit product' : 'New product'}
        wide
      >
        <form onSubmit={save} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Name</label>
              <input
                required
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea
                required
                rows={3}
                className="input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Price (EGP)</label>
              <input
                required
                type="number"
                className="input"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {PRODUCT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Sizes (comma-separated)</label>
              <input
                className="input"
                value={form.sizes}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    sizes: e.target.value,
                    sizeStock: syncSizeStock(e.target.value, current.sizeStock),
                  }))
                }
                placeholder="40, 41, 42, 43, 44"
              />
            </div>

            {parsedSizes.length > 0 ? (
              <div className="md:col-span-2">
                <label className="label">Stock per size</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {parsedSizes.map((size) => (
                    <div key={size}>
                      <label className="text-xs font-semibold uppercase tracking-wide text-timber-500">
                        Size {size}
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="input mt-1"
                        value={form.sizeStock[size] ?? '0'}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            sizeStock: {
                              ...current.sizeStock,
                              [size]: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="label">Stock</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>
            )}

            <div>
              <label className="label">Colors (comma-separated)</label>
              <input
                className="input"
                value={form.colors}
                onChange={(e) => setForm({ ...form, colors: e.target.value })}
                placeholder="Wheat, Black, Brown"
              />
            </div>

            <div className="md:col-span-2 rounded-xl border border-timber-100 bg-cream/50 p-4 space-y-3">
              <div>
                <label className="label">Google Drive folder link</label>
                <div className="flex gap-2">
                  <input
                    className="input font-mono text-xs"
                    value={form.driveFolder}
                    onChange={(e) => setForm({ ...form, driveFolder: e.target.value })}
                    placeholder="https://drive.google.com/drive/folders/..."
                  />
                  <button
                    type="button"
                    className="btn-dark btn-sm whitespace-nowrap"
                    onClick={loadDriveFolder}
                    disabled={loadingFolder}
                  >
                    {loadingFolder ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FolderOpen className="w-4 h-4" />
                    )}
                    Load
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-timber-400">
                  Folder must be shared as “Anyone with the link”. All images inside are added
                  automatically on Load or Save.
                </p>
              </div>

              <div>
                <label className="label">Photo URLs (optional extras, one per line)</label>
                <textarea
                  rows={3}
                  className="input font-mono text-xs"
                  value={form.photos}
                  onChange={(e) => setForm({ ...form, photos: e.target.value })}
                  placeholder="Individual Drive file links or direct image URLs"
                />
              </div>

              {previewPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {previewPhotos.map((url) => (
                    <img
                      key={url}
                      src={getImageUrl(url)}
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover border border-timber-100 bg-timber-50"
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="label">Shop order</label>
              <input
                type="number"
                className="input"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
              <p className="mt-1 text-xs text-timber-400">Lower numbers appear first in the shop.</p>
            </div>
            <div className="flex flex-col justify-end gap-3 rounded-xl border border-timber-100 bg-cream/40 p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isBestSeller}
                  onChange={(e) => setForm({ ...form, isBestSeller: e.target.checked })}
                />
                Show in Best sellers
              </label>
              {form.isBestSeller && (
                <div>
                  <label className="label">Best sellers order</label>
                  <input
                    type="number"
                    className="input"
                    value={form.bestSellerOrder}
                    onChange={(e) => setForm({ ...form, bestSellerOrder: e.target.value })}
                  />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isHomeProduct}
                  onChange={(e) => setForm({ ...form, isHomeProduct: e.target.checked })}
                />
                Show in New collection
              </label>
              {form.isHomeProduct && (
                <div>
                  <label className="label">New collection order</label>
                  <input
                    type="number"
                    className="input"
                    value={form.homeOrder}
                    onChange={(e) => setForm({ ...form, homeOrder: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sale"
                checked={form.isSaleActive}
                onChange={(e) => setForm({ ...form, isSaleActive: e.target.checked })}
              />
              <label htmlFor="sale" className="text-sm">
                Sale active
              </label>
            </div>
            <div>
              <label className="label">Sale price</label>
              <input
                type="number"
                className="input"
                value={form.salePrice}
                onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn-wheat w-full" disabled={saving || loadingFolder}>
            {saving ? 'Saving…' : 'Save product'}
          </button>
        </form>
      </Modal>
    </>
  );
}
