import { useCallback, useEffect, useState } from 'react';
import { Star, Trash2, Camera, X, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

/* ── Star component ── */
function Stars({ value = 0, onSelect, size = 'md' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const cls = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';

  return (
    <div className="flex items-center gap-0.5" role={onSelect ? 'radiogroup' : 'img'} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onSelect}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          onMouseEnter={() => onSelect && setHover(n)}
          onMouseLeave={() => onSelect && setHover(0)}
          onClick={() => onSelect?.(n)}
          className={onSelect ? 'p-0.5 transition-transform hover:scale-110' : 'cursor-default p-0'}
        >
          <Star
            className={`${cls} transition-colors ${
              n <= shown ? 'fill-wheat text-wheat' : 'text-timber-200'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

/* ── Rating breakdown bar ── */
function RatingBar({ star, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-8 text-right text-timber-500">{star}★</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-timber-100">
        <div
          className="h-full rounded-full bg-wheat transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-timber-400 tabular-nums">{count}</span>
    </div>
  );
}

/* ── Photo lightbox ── */
function PhotoLightbox({ photos, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx);
  if (!photos.length) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <button className="absolute right-4 top-4 text-white hover:text-wheat" onClick={onClose}>
        <X className="h-7 w-7" />
      </button>
      <img
        src={photos[idx]}
        alt={`Review photo ${idx + 1}`}
        className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {photos.length > 1 && (
        <div className="absolute bottom-6 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-2.5 w-2.5 rounded-full transition ${i === idx ? 'bg-wheat scale-125' : 'bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductReviews({ productId }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [guestName, setGuestName] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const load = useCallback(() => {
    api
      .get(`/products/${productId}/reviews`)
      .then((r) => {
        setReviews(r.data.reviews || []);
        setAverage(r.data.average || 0);
        setCount(r.data.count || 0);
      })
      .catch(() => {
        setReviews([]);
        setAverage(0);
        setCount(0);
      })
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const mine = user ? reviews.find((r) => r.user?.id === user.id) : null;
  const isStaff = user && user.role !== 'customer';
  const canWrite = !isStaff && !mine;

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5 - photos.length);
    const validFiles = files.filter((f) => {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });
    setPhotos((prev) => [...prev, ...validFiles]);
    const newPreviews = validFiles.map((f) => URL.createObjectURL(f));
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removePhoto = (idx) => {
    URL.revokeObjectURL(photoPreviews[idx]);
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('rating', rating);
      formData.append('comment', comment);
      if (!user) formData.append('guestName', guestName.trim());
      photos.forEach((file) => formData.append('photos', file));

      await api.post(`/products/${productId}/reviews`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Thank you! Your review is pending approval.');
      setComment('');
      setGuestName('');
      setRating(5);
      setPhotos([]);
      setPhotoPreviews([]);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save review');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await api.delete(`/products/${productId}/reviews/${id}`);
      toast.success('Review deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete review');
    }
  };

  // Compute rating distribution
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <section className="mt-12 border-t border-timber-200 pt-10">
      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-3xl tracking-wide text-timber-900">Customer Reviews</h2>
          {count > 0 ? (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-4xl font-bold tabular-nums text-timber-900">{average}</span>
              <div>
                <Stars value={Math.round(average)} size="md" />
                <p className="mt-0.5 text-sm text-timber-500">
                  Based on {count} review{count === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-timber-500">No reviews yet — be the first!</p>
          )}
        </div>
        {canWrite && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-wheat self-start whitespace-nowrap"
          >
            Write a Review
          </button>
        )}
      </div>

      {/* ── Rating Distribution ── */}
      {count > 0 && (
        <div className="mb-8 max-w-xs space-y-1.5">
          {dist.map((d) => (
            <RatingBar key={d.star} star={d.star} count={d.count} total={count} />
          ))}
        </div>
      )}

      {/* ── Write Review Form ── */}
      {canWrite && showForm && (
        <form onSubmit={submit} className="mb-8 rounded-2xl border border-timber-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-timber-800">Write a Review</p>
            <button type="button" onClick={() => setShowForm(false)} className="text-timber-400 hover:text-timber-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {!user && (
            <div className="mt-4">
              <label className="label" htmlFor="review-name">Your name</label>
              <input
                id="review-name"
                required
                minLength={2}
                maxLength={80}
                className="input"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="First name"
              />
            </div>
          )}

          <div className="mt-4">
            <label className="label mb-1">Rating</label>
            <Stars value={rating} onSelect={setRating} size="lg" />
          </div>

          <textarea
            required
            minLength={8}
            maxLength={1000}
            rows={4}
            className="input mt-4"
            placeholder="How does it fit? How's the quality? Tell other customers…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          {/* Photo upload */}
          <div className="mt-4">
            <label className="label mb-2">Add Photos (optional, max 5)</label>
            <div className="flex flex-wrap gap-3">
              {photoPreviews.map((src, i) => (
                <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-xl border border-timber-200">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-timber-300 bg-timber-50 text-timber-400 transition hover:border-wheat hover:text-wheat">
                  <Camera className="h-6 w-6" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <Clock className="h-4 w-4 flex-shrink-0" />
            Your review will be visible after admin approval.
          </div>

          <button type="submit" className="btn-wheat mt-4" disabled={saving}>
            {saving ? 'Submitting…' : 'Submit Review'}
          </button>
        </form>
      )}

      {isStaff && (
        <p className="mb-6 text-sm text-timber-500">Staff accounts cannot leave reviews.</p>
      )}
      {mine && (
        <p className="mb-6 text-sm text-timber-500">You already reviewed this product.</p>
      )}

      {/* ── Reviews List ── */}
      {loading ? (
        <p className="text-sm text-timber-400">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-timber-400">No reviews yet.</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-2xl border border-timber-100 bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-wheat/80 to-wheat text-white font-bold text-sm uppercase">
                    {(review.displayName || 'C')[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-timber-800">
                        {review.displayName || 'Customer'}
                      </p>
                      {review.isVerifiedBuyer && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-700">
                          <CheckCircle className="h-3 w-3" /> Verified Buyer
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-timber-400">
                      {new Date(review.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Stars value={review.rating} size="sm" />
                  {(user?.id === review.user?.id || user?.role === 'admin') && (
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                      onClick={() => remove(review.id)}
                      aria-label="Delete review"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-timber-600">{review.comment}</p>

              {/* Review photos */}
              {review.photos && review.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.photos.map((photo, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightbox({ photos: review.photos, idx: i })}
                      className="h-20 w-20 overflow-hidden rounded-xl border border-timber-100 transition hover:border-wheat hover:shadow-md"
                    >
                      <img src={photo} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* ── Photo Lightbox ── */}
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          startIdx={lightbox.idx}
          onClose={() => setLightbox(null)}
        />
      )}
    </section>
  );
}
