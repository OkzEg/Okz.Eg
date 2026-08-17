import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { getImageUrl } from '../../utils/helpers';

const emptyForm = { title: '', description: '', imageUrl: '', sortOrder: 0 };

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });

export default function StaffSlides() {
  const [slides, setSlides] = useState([]);
  const [cloudOk, setCloudOk] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/slides').then((r) => setSlides(r.data));
    api.get('/slides/cloudinary-status').then((r) => setCloudOk(r.data.configured)).catch(() => {});
  };
  useEffect(() => {
    load();
  }, []);

  const onFile = (e) => {
    setFile(e.target.files?.[0] || null);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setFile(null);
  };

  const create = async (e) => {
    e.preventDefault();
    const imageUrl = form.imageUrl.trim();

    if (!file && !imageUrl) {
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
      };

      if (file) {
        payload.imageData = await readFileAsDataUrl(file);
      } else {
        payload.imageUrl = imageUrl;
      }

      await api.post('/slides', payload);
      toast.success('Slide added');
      setOpen(false);
      resetForm();
      load();
    } catch (err) {
      const status = err.response?.status;
      const message =
        err.response?.data?.message ||
        (status === 413
          ? 'Image is too large. Try a smaller file or paste a hosted URL.'
          : 'Failed to save slide');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/slides/${id}`);
      toast.success('Slide deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Slideshow</h1>
          <p className="page-subtitle">
            Homepage hero images via Cloudinary
            {!cloudOk && (
              <span className="text-amber-600">
                {' '}
                — Cloudinary not configured; paste a hosted image URL instead of uploading.
              </span>
            )}
          </p>
        </div>
        <button type="button" className="btn-wheat" onClick={() => setOpen(true)}>
          Add slide
        </button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {slides.map((s) => (
          <div key={s.id} className="card !p-0 overflow-hidden">
            <img src={getImageUrl(s.cloudinaryUrl)} alt={s.title} className="h-40 w-full object-cover" />
            <div className="p-4">
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-timber-500 mt-1">{s.description}</p>
              <button type="button" className="btn-ghost btn-sm text-red-600 mt-3" onClick={() => remove(s.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        title="New slide"
      >
        <form onSubmit={create} className="space-y-4">
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
          <div>
            <label className="label">Upload (Cloudinary)</label>
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
            {saving ? 'Saving…' : 'Save slide'}
          </button>
        </form>
      </Modal>
    </>
  );
}
