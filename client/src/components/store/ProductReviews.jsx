import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

function Stars({ value = 0, onSelect, size = 'md' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const cls = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';

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
          className={onSelect ? 'p-0.5' : 'cursor-default p-0'}
        >
          <Star
            className={`${cls} ${
              n <= shown ? 'fill-wheat text-wheat' : 'text-timber-200'
            }`}
          />
        </button>
      ))}
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
  const [saving, setSaving] = useState(false);

  const load = () => {
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
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [productId]);

  const mine = user ? reviews.find((r) => r.user?.id === user.id) : null;
  const canWrite = user?.role === 'customer' && !mine;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/products/${productId}/reviews`, { rating, comment });
      toast.success('Thanks for your review');
      setComment('');
      setRating(5);
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

  return (
    <section className="mt-12 border-t border-timber-200 pt-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl tracking-wide text-timber-900">Reviews</h2>
          {count > 0 ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-timber-600">
              <Stars value={Math.round(average)} size="sm" />
              <span className="font-semibold tabular-nums">{average}</span>
              <span>
                · {count} review{count === 1 ? '' : 's'}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-timber-500">No reviews yet — be the first.</p>
          )}
        </div>
      </div>

      {canWrite && (
        <form onSubmit={submit} className="mb-8 rounded-2xl border border-timber-200 bg-white p-4 sm:p-5">
          <p className="text-sm font-semibold text-timber-800">Write a review</p>
          <div className="mt-3">
            <Stars value={rating} onSelect={setRating} />
          </div>
          <textarea
            required
            minLength={8}
            maxLength={1000}
            rows={4}
            className="input mt-3"
            placeholder="How does it fit? How’s the quality?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button type="submit" className="btn-wheat mt-3" disabled={saving}>
            {saving ? 'Posting…' : 'Post review'}
          </button>
        </form>
      )}

      {user && user.role !== 'customer' && (
        <p className="mb-6 text-sm text-timber-500">Customer accounts can leave reviews.</p>
      )}

      {!user && (
        <p className="mb-6 text-sm text-timber-500">
          <Link to={`/login?redirect=${encodeURIComponent(`/product/${productId}`)}`} className="font-semibold text-wheat-500 underline-offset-2 hover:underline">
            Sign in
          </Link>{' '}
          to leave a review.
        </p>
      )}

      {mine && (
        <p className="mb-6 text-sm text-timber-500">You already reviewed this product.</p>
      )}

      {loading ? (
        <p className="text-sm text-timber-400">Loading reviews…</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-2xl border border-timber-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-timber-800">{review.user?.name || 'Customer'}</p>
                  <p className="text-xs text-timber-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Stars value={review.rating} size="sm" />
                  {(user?.id === review.user?.id || user?.role === 'admin') && (
                    <button
                      type="button"
                      className="btn-ghost btn-sm text-red-600"
                      onClick={() => remove(review.id)}
                      aria-label="Delete review"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-timber-600">{review.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
