import { useEffect, useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { getImageUrl } from '../../utils/helpers';

const emptyForm = { title: '', description: '', imageUrl: '', sortOrder: 0, placement: 'desktop' };

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });

const PLACEMENT_META = {
  desktop: {
    title: 'PC, laptop & tablet',
    hint: 'Wide images for screens 768px and up.',
  },
  mobile: {
    title: 'Phone',
    hint: 'Tall images for phones. Portrait (4:5 or 9:16) looks best.',
  },
};

export default function StaffSlides() {
  const [slides, setSlides] = useState([]);
  const [cloudOk, setCloudOk] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = () => {
    api
      .get('/slides', { params: { _: Date.now() } })
      .then((r) => setSlides(Array.isArray(r.data) ? r.data : []));
    api.get('/slides/cloudinary-status').then((r) => setCloudOk(r.data.configured)).catch(() => {});
  };
  useEffect(() => {
    load();
  }, []);

  const desktopSlides = useMemo(
    () => slides.filter((s) => String(s.placement || 'desktop') !== 'mobile'),
    [slides]
  );
  const mobileSlides = useMemo(
    () => slides.filter((s) => String(s.placement) === 'mobile'),
    [slides]
  );

  const onFile = (e) => {
    setFile(e.target.files?.[0] || null);
  };

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
  };

  const openCreate = (placement = 'desktop') => {
    resetForm();
    setForm({ ...emptyForm, placement });
    setOpen(true);
  };

  const openEdit = (slide) => {
    setEditing(slide);
    setForm({
      title: slide.title || '',
      description: slide.description || '',
      imageUrl: '',
      sortOrder: slide.sortOrder ?? 0,
      placement: slide.placement === 'mobile' ? 'mobile' : 'desktop',
    });
    setFile(null);
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const imageUrl = form.imageUrl.trim();

    if (!editing && !file && !imageUrl) {
      toast.error('Upload an image or paste an image URL');
      return;
    }
    if (file && !cloudOk) {
      toast.error('Cloudinary is not configured on the server. Paste a hosted image URL instead.');
      return;
    }
    if (file && file.size > 6 * 1024 * 1024) {
      toast.error('Image is too large. Use a file under 6 MB or paste a hosted URL.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        sortOrder: Number(form.sortOrder) || 0,
        placement: form.placement === 'mobile' ? 'mobile' : 'desktop',
      };

      if (file) {
        payload.imageData = await readFileAsDataUrl(file);
      } else if (imageUrl) {
        payload.imageUrl = imageUrl;
      }

      if (editing) {
        await api.put(`/slides/${editing.id}`, payload);
        toast.success('Slide updated');
      } else {
        await api.post('/slides', payload);
        toast.success('Slide added');
      }
      setOpen(false);
      resetForm();
      load();
    } catch (err) {
      const status = err.response?.status;
      const message =
        err.response?.data?.message ||
        (status === 413
          ? 'Image is too large. Try a smaller file or paste a hosted URL.'
          : editing
            ? 'Failed to update slide'
            : 'Failed to save slide');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this slide?')) return;
    if (deletingId) return;
    setDeletingId(id);
    try {
      await api.delete(`/slides/${id}`);
      setSlides((prev) => prev.filter((s) => s.id !== id));
      toast.success('Slide deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
      load();
    } finally {
      setDeletingId(null);
    }
  };

  const renderGroup = (placement, items) => {
    const meta = PLACEMENT_META[placement];
    return (
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl text-timber-900 tracking-wide">{meta.title}</h2>
            <p className="mt-1 text-sm text-timber-500">{meta.hint}</p>
          </div>
          <button type="button" className="btn-wheat w-full sm:w-auto" onClick={() => openCreate(placement)}>
            Add {placement === 'mobile' ? 'phone' : 'desktop'} slide
          </button>
        </div>
        {items.length ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((s) => (
              <div key={s.id} className="card !p-0 overflow-hidden">
                <img
                  src={getImageUrl(s.cloudinaryUrl)}
                  alt={s.title}
                  className={`w-full object-cover ${placement === 'mobile' ? 'h-56' : 'h-40'}`}
                />
                <div className="p-4">
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-sm text-timber-500 mt-1">{s.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn-outline btn-sm" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-sm text-red-600"
                      disabled={deletingId === s.id}
                      onClick={() => remove(s.id)}
                    >
                      {deletingId === s.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-timber-200 bg-cream/40 px-4 py-8 text-center text-sm text-timber-500">
            No {placement === 'mobile' ? 'phone' : 'desktop'} slides yet.
            {placement === 'mobile'
              ? ' Phones will keep using the desktop slideshow until you add some.'
              : ''}
          </p>
        )}
      </section>
    );
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="page-title">Slideshow</h1>
        <p className="page-subtitle">
          Separate homepage heroes for large screens and phones
          {!cloudOk && (
            <span className="text-amber-600">
              {' '}
              — Cloudinary not configured; paste a hosted image URL instead of uploading.
            </span>
          )}
        </p>
      </div>

      <div className="space-y-12">
        {renderGroup('desktop', desktopSlides)}
        {renderGroup('mobile', mobileSlides)}
      </div>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        title={editing ? 'Edit slide' : 'New slide'}
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Shows on</label>
            <div className="grid grid-cols-2 gap-2">
              {['desktop', 'mobile'].map((value) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-medium ${
                    form.placement === value
                      ? 'border-wheat bg-wheat-50 text-timber-900'
                      : 'border-timber-200 text-timber-600 hover:border-timber-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="placement"
                    className="sr-only"
                    checked={form.placement === value}
                    onChange={() => setForm({ ...form, placement: value })}
                  />
                  {value === 'desktop' ? 'PC / tablet' : 'Phone'}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="New Arrival"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <input
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Shop the collection"
            />
          </div>
          <div>
            <label className="label">Sort order</label>
            <input
              type="number"
              className="input"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
          </div>
          {editing && (
            <div>
              <label className="label">Current image</label>
              <img
                src={getImageUrl(editing.cloudinaryUrl)}
                alt=""
                className="mt-1 h-32 w-full rounded-lg object-cover bg-timber-100"
              />
              <p className="mt-1 text-xs text-timber-400">Leave image fields empty to keep this photo.</p>
            </div>
          )}
          <div>
            <label className="label">{editing ? 'Replace image (optional)' : 'Upload (Cloudinary)'}</label>
            <input type="file" accept="image/*" onChange={onFile} className="input" />
            {file && <p className="mt-1 text-xs text-timber-500">{file.name}</p>}
          </div>
          <div>
            <label className="label">Or image URL</label>
            <input
              className="input"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://…"
            />
          </div>
          <button type="submit" className="btn-wheat w-full" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Save slide'}
          </button>
        </form>
      </Modal>
    </>
  );
}
