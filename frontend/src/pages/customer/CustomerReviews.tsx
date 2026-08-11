import { useEffect, useState } from 'react';
import { Star, MessageSquare, Plus, CheckCircle, Clock, Store } from 'lucide-react';
import api from '../../services/api';

const CustomerReviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [completedBookings, setCompletedBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedMerchantId, setSelectedMerchantId] = useState<number | null>(null);
  const [selectedServiceName, setSelectedServiceName] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      const [revRes, bRes] = await Promise.all([
        api.get('/reviews/customer/me'),
        api.get('/bookings/customer'),
      ]);
      const myReviews = revRes.data.data || [];
      setReviews(myReviews);

      // Find completed bookings and filter out ones already reviewed
      const allBookings = bRes.data.data || [];
      const reviewedMerchantIds = new Set(myReviews.map((r: any) => r.merchant_id));
      const unreviewedCompleted = allBookings.filter(
        (b: any) => b.status === 'Completed' && !reviewedMerchantIds.has(b.merchant_id)
      );
      setCompletedBookings(unreviewedCompleted);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openReviewModal = (merchantId: number, serviceName: string) => {
    setSelectedMerchantId(merchantId);
    setSelectedServiceName(serviceName);
    setRating(5);
    setComment('');
    setMsg(null);
    setShowModal(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchantId) return;
    setSubmitting(true);
    setMsg(null);

    try {
      await api.post('/reviews', {
        merchantId: selectedMerchantId,
        rating,
        comment: comment.trim() || undefined,
      });
      setMsg({ type: 'success', text: 'Thank you! Your review has been submitted.' });
      fetchData();
      setTimeout(() => {
        setShowModal(false);
        setMsg(null);
      }, 1500);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to submit review.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Star className="text-amber-500 fill-amber-500" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-surface-900">My Reviews</h1>
            <p className="text-sm text-surface-500">Rate & review merchants for your completed bookings</p>
          </div>
        </div>
      </div>

      {/* Unreviewed Completed Bookings Prompt */}
      {completedBookings.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-primary-500/10 to-indigo-500/10 border border-amber-200 rounded-2xl p-6 mb-8 animate-fade-in-up">
          <h2 className="text-base font-bold text-surface-900 mb-2 flex items-center gap-2">
            <SparklesIcon /> Pending Reviews ({completedBookings.length})
          </h2>
          <p className="text-sm text-surface-600 mb-4">You have completed bookings waiting for your review! Share your experience to help others.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedBookings.map((b) => (
              <div key={b.booking_id} className="bg-white rounded-xl p-4 shadow-sm border border-surface-200 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-surface-900 text-sm">{b.business_name}</h3>
                  <p className="text-xs text-surface-500">{b.service_name}</p>
                </div>
                <button
                  onClick={() => openReviewModal(b.merchant_id, b.service_name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition-smooth shrink-0"
                >
                  <Star size={14} className="fill-white" /> Rate Service
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submitted Reviews List */}
      <h2 className="text-lg font-bold text-surface-900 mb-4">Your Submitted Reviews ({reviews.length})</h2>
      {reviews.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-surface-500 border border-surface-200">
          <MessageSquare size={40} className="mx-auto text-surface-300 mb-3" />
          <p className="text-lg font-medium mb-1">No reviews written yet.</p>
          <p className="text-sm">Once you complete a service booking, you can share your feedback and rating here!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((r) => (
            <div key={r.review_id} className="bg-white rounded-2xl p-6 border border-surface-200 shadow-sm animate-fade-in-up flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-base">
                      {r.business_name?.[0] || 'M'}
                    </div>
                    <div>
                      <h3 className="font-bold text-surface-900">{r.business_name}</h3>
                      <p className="text-xs text-surface-400">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    <Star size={14} className="fill-amber-500 text-amber-500" />
                    <span className="text-xs font-bold text-amber-700">{r.rating}.0</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      className={star <= r.rating ? 'text-amber-500 fill-amber-500' : 'text-surface-200'}
                    />
                  ))}
                </div>

                {r.comment ? (
                  <p className="text-sm text-surface-600 italic bg-surface-50 p-3 rounded-xl">"{r.comment}"</p>
                ) : (
                  <p className="text-xs text-surface-400 italic">No written comment provided.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Write Review Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in-up">
            <h3 className="text-xl font-bold text-surface-900 mb-1">Rate Your Experience</h3>
            <p className="text-sm text-surface-500 mb-4">Service: {selectedServiceName}</p>

            {msg && (
              <div className={`mb-4 p-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-5">
              {/* Star Rating selector */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">Your Rating *</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        size={28}
                        className={(hoverRating || rating) >= star ? 'text-amber-500 fill-amber-500' : 'text-surface-300'}
                      />
                    </button>
                  ))}
                  <span className="text-sm font-bold text-amber-600 ml-2">
                    {(hoverRating || rating) === 5 && 'Outstanding ⭐'}
                    {(hoverRating || rating) === 4 && 'Very Good 🙂'}
                    {(hoverRating || rating) === 3 && 'Average 😐'}
                    {(hoverRating || rating) === 2 && 'Poor 🙁'}
                    {(hoverRating || rating) === 1 && 'Terrible 😞'}
                  </span>
                </div>
              </div>

              {/* Comment text area */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Feedback / Review (Optional)</label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share details of your experience with this merchant..."
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-surface-200 rounded-xl text-sm font-medium hover:bg-surface-50 transition-smooth"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-smooth disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const SparklesIcon = () => (
  <span className="text-amber-500">✨</span>
);

export default CustomerReviews;
