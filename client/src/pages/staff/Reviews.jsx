import { useCallback, useEffect, useState } from 'react';
import { Star, Check, XCircle, Eye, Trash2, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../api/axios';

function Stars({ value = 0 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= value ? 'fill-wheat text-wheat' : 'text-timber-200'}`}
        />
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  };
  const icons = {
    pending: <Clock className="h-3.5 w-3.5" />,
    approved: <CheckCircle className="h-3.5 w-3.5" />,
    rejected: <XCircle className="h-3.5 w-3.5" />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${styles[status] || ''}`}
    >
      {icons[status]} {status}
    </span>
  );
}

function PhotoModal({ photos, onClose }) {
  const [idx, setIdx] = useState(0);
  if (!photos?.length) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <button className="absolute right-4 top-4 text-white hover:text-wheat transition" onClick={onClose}>
        <XCircle className="h-8 w-8" />
      </button>
      <img
        src={photos[idx]}
        alt=""
        className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {photos.length > 1 && (
        <div className="absolute bottom-6 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-3 w-3 rounded-full transition ${i === idx ? 'bg-wheat scale-125' : 'bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/products/reviews/admin?status=${filter}`)
      .then((r) => {
        setReviews(r.data.reviews || []);
        setCounts(r.data.counts || { pending: 0, approved: 0, rejected: 0 });
      })
      .catch(() => toast.error('Failed to load reviews'))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const moderate = async (id, status) => {
    try {
      await api.put(`/products/reviews/admin/${id}`, { status });
      toast.success(`Review ${status}`);
      load();
    } catch {
      toast.error('Failed to update review');
    }
  };

  const deleteReview = async (review) => {
    if (!window.confirm('Permanently delete this review?')) return;
    try {
      await api.delete(`/products/${review.product?.id}/reviews/${review.id}`);
      toast.success('Review deleted');
      load();
    } catch {
      toast.error('Failed to delete review');
    }
  };

  const tabs = [
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'approved', label: 'Approved', count: counts.approved },
    { key: 'rejected', label: 'Rejected', count: counts.rejected },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-timber-900">Review Moderation</h1>
        <p className="mt-1 text-sm text-timber-500">Approve or reject customer reviews before they go live.</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === tab.key
                ? 'bg-timber-800 text-white shadow-md'
                : 'bg-white text-timber-600 border border-timber-200 hover:bg-timber-50'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
                  filter === tab.key ? 'bg-white/20 text-white' : 'bg-timber-100 text-timber-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reviews Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-wheat border-t-transparent animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-timber-100 bg-white px-6 py-16 text-center">
          <p className="text-timber-400">No {filter} reviews.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-2xl border border-timber-100 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Left: Customer + Product */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-wheat/80 to-wheat text-white font-bold text-sm uppercase flex-shrink-0">
                      {(review.displayName || 'C')[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-timber-800 truncate">{review.displayName || 'Customer'}</p>
                      <p className="text-xs text-timber-400">
                        {review.user?.email || 'Guest'} ·{' '}
                        {new Date(review.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Product chip */}
                  {review.product && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg bg-timber-50 px-3 py-2">
                      {review.product.photos?.[0] && (
                        <img
                          src={review.product.photos[0]}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover border border-timber-100"
                        />
                      )}
                      <span className="text-sm font-medium text-timber-700 truncate">{review.product.name}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-2">
                    <Stars value={review.rating} />
                    <StatusBadge status={review.status} />
                  </div>

                  <p className="text-sm leading-relaxed text-timber-600">{review.comment}</p>

                  {/* Photos */}
                  {review.photos?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {review.photos.map((photo, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setLightbox({ photos: review.photos })}
                          className="h-16 w-16 overflow-hidden rounded-lg border border-timber-100 transition hover:border-wheat hover:shadow-md"
                        >
                          <img src={photo} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex flex-row gap-2 sm:flex-col sm:items-end flex-shrink-0">
                  {review.status === 'pending' && (
                    <>
                      <button
                        onClick={() => moderate(review.id, 'approved')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-green-700 shadow-sm"
                      >
                        <Check className="h-4 w-4" /> Approve
                      </button>
                      <button
                        onClick={() => moderate(review.id, 'rejected')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 border border-red-200"
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </button>
                    </>
                  )}
                  {review.status === 'rejected' && (
                    <button
                      onClick={() => moderate(review.id, 'approved')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3.5 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100 border border-green-200"
                    >
                      <Check className="h-4 w-4" /> Approve
                    </button>
                  )}
                  {review.status === 'approved' && (
                    <button
                      onClick={() => moderate(review.id, 'rejected')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 border border-red-200"
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                  )}
                  <button
                    onClick={() => deleteReview(review)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-timber-500 transition hover:bg-timber-50 border border-timber-200"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox && <PhotoModal photos={lightbox.photos} onClose={() => setLightbox(null)} />}
    </div>
  );
}
