import { useEffect, useState } from 'react';
import { Calendar, Clock, X, Check, AlertTriangle, RefreshCw, Star } from 'lucide-react';
import api from '../../services/api';
import { payWithRazorpay } from '../../utils/razorpay';
import { formatDuration } from '../../utils/formatters';

const CustomerBookings = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);

  // Reschedule state
  const [rescheduleBooking, setRescheduleBooking] = useState<any | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Cancel/Refund state
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Review State
  const [reviewBooking, setReviewBooking] = useState<any | null>(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reviewedMerchantIds, setReviewedMerchantIds] = useState<number[]>([]);

  const fetchBookings = (page: number = 1) => {
    setLoading(true);
    api.get(`/bookings/customer?page=${page}&limit=10`)
      .then(r => {
        setBookings(r.data.data || []);
        if (r.data.pagination) setPagination(r.data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchReviews = () => {
    api.get('/reviews/customer/me')
      .then(res => {
        setReviewedMerchantIds((res.data.data || []).map((r: any) => r.merchant_id));
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchBookings();
    fetchReviews();
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking) return;
    setSubmittingReview(true);
    setReviewMsg(null);
    try {
      await api.post('/reviews', {
        merchantId: reviewBooking.merchant_id,
        rating,
        comment: comment.trim() || undefined,
      });
      setReviewMsg({ type: 'success', text: 'Thank you! Your review has been submitted.' });
      fetchReviews();
      setTimeout(() => {
        setReviewBooking(null);
        setReviewMsg(null);
      }, 1500);
    } catch (err: any) {
      setReviewMsg({ type: 'error', text: err.response?.data?.message || 'Failed to submit review.' });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleBooking) return;
    setRescheduling(true);
    setRescheduleError(null);

    try {
      await api.patch(`/bookings/${rescheduleBooking.booking_id}/reschedule`, {
        booking_date: newDate,
        booking_time: newTime,
      });
      alert('Booking rescheduled successfully!');
      setRescheduleBooking(null);
      fetchBookings(pagination?.page || 1);
    } catch (err: any) {
      setRescheduleError(err.response?.data?.message || 'Failed to reschedule booking.');
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelMsg(null);

    try {
      const res = await api.put(`/bookings/${cancelTarget.booking_id}/cancel`);
      const data = res.data.data;

      if (data.refund) {
        setCancelMsg({
          type: 'success',
          text: `Booking cancelled. Refund of ₹${data.refund.refundAmount} has been initiated (Refund ID: ${data.refund.refundId}).`,
        });
      } else {
        setCancelMsg({ type: 'success', text: 'Booking cancelled successfully.' });
      }

      fetchBookings(pagination?.page || 1);
    } catch (err: any) {
      setCancelMsg({ type: 'error', text: err.response?.data?.message || 'Failed to cancel booking.' });
    } finally {
      setCancelling(false);
    }
  };

  const isRefundEligible = (b: any) => {
    if (b.payment_status !== 'Completed') return false;
    const bkDateTime = new Date(`${b.booking_date.split('T')[0]}T${b.booking_time}`);
    return bkDateTime > new Date();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      Pending: 'badge-pending', Accepted: 'badge-accepted', Rejected: 'badge-rejected',
      Completed: 'badge-completed', Cancelled: 'badge-cancelled',
    };
    return `px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || ''}`;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 mb-6">My Bookings</h1>

      {bookings.length === 0 ? (
        <p className="text-surface-500">You have no bookings yet.</p>
      ) : (
        <div className="space-y-4">
          {bookings.map(b => (
            <div key={b.booking_id} className="bg-white rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
              <div>
                <h3 className="font-semibold text-surface-900">{b.service_name}</h3>
                <p className="text-sm text-surface-500">{b.business_name} · {new Date(b.booking_date).toLocaleDateString()} at {b.booking_time}</p>
                <p className="text-sm font-medium text-primary-600 mt-1">₹{b.price} · {formatDuration(b.duration)}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={statusBadge(b.status)}>{b.status}</span>

                {b.status === 'Accepted' && b.payment_status !== 'Completed' && (
                  <button
                    onClick={() => {
                      payWithRazorpay({
                        bookingId: b.booking_id,
                        onSuccess: () => fetchBookings(pagination?.page || 1),
                      });
                    }}
                    className="px-3.5 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-smooth"
                  >
                    Pay Now
                  </button>
                )}

                {b.payment_status === 'Completed' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Paid</span>
                )}

                {b.payment_status === 'Refunded' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
                    <RefreshCw size={10} /> Refunded
                  </span>
                )}

                {b.status === 'Completed' && (
                  reviewedMerchantIds.includes(b.merchant_id) ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                      <Star size={12} className="fill-amber-500 text-amber-500" /> Reviewed
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setReviewBooking(b);
                        setRating(5);
                        setComment('');
                        setReviewMsg(null);
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-smooth flex items-center gap-1"
                    >
                      <Star size={12} className="fill-white" /> Write Review
                    </button>
                  )
                )}

                {(b.status === 'Pending' || b.status === 'Accepted') && (
                  <>
                    <button
                      onClick={() => {
                        setRescheduleBooking(b);
                        setNewDate(b.booking_date.split('T')[0]);
                        setNewTime(b.booking_time);
                        setRescheduleError(null);
                      }}
                      className="px-3.5 py-1.5 text-xs font-medium border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 transition-smooth"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => {
                        setCancelTarget(b);
                        setCancelMsg(null);
                      }}
                      className="px-3.5 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-smooth"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-4 border-b border-surface-100 pb-3">
              <h3 className="font-bold text-surface-900 text-base">Reschedule Booking #{rescheduleBooking.booking_id}</h3>
              <button onClick={() => setRescheduleBooking(null)} className="p-1 text-surface-400 hover:text-surface-600">
                <X size={18} />
              </button>
            </div>

            {rescheduleError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium mb-4">
                {rescheduleError}
              </div>
            )}

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">New Booking Date</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input type="date" min={todayStr} required value={newDate} onChange={e => setNewDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-surface-200 text-xs outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">New Booking Time</label>
                <div className="relative">
                  <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input type="time" required value={newTime} onChange={e => setNewTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-surface-200 text-xs outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3">
                <button type="button" onClick={() => setRescheduleBooking(null)} className="px-4 py-2 text-xs font-medium text-surface-600 hover:bg-surface-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={rescheduling} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50">
                  {rescheduling ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Check size={14} />} Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel / Refund Confirmation Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-4 border-b border-surface-100 pb-3">
              <h3 className="font-bold text-surface-900 text-base flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" /> Cancel Booking #{cancelTarget.booking_id}
              </h3>
              <button onClick={() => setCancelTarget(null)} className="p-1 text-surface-400 hover:text-surface-600">
                <X size={18} />
              </button>
            </div>

            {cancelMsg && (
              <div className={`p-3 rounded-xl text-xs font-medium mb-4 ${cancelMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {cancelMsg.text}
              </div>
            )}

            {!cancelMsg && (
              <div className="space-y-3 mb-5">
                <p className="text-sm text-surface-700">
                  Are you sure you want to cancel <span className="font-semibold">{cancelTarget.service_name}</span>?
                </p>

                {isRefundEligible(cancelTarget) ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700">
                    <p className="font-semibold mb-1">✅ Refund Eligible</p>
                    <p>Your payment of <span className="font-bold">₹{cancelTarget.price}</span> will be refunded because the cancellation is before the scheduled service time.</p>
                  </div>
                ) : cancelTarget.payment_status === 'Completed' ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                    <p className="font-semibold mb-1">⚠️ Not Eligible for Refund</p>
                    <p>The scheduled service time has already passed. No refund will be issued.</p>
                  </div>
                ) : (
                  <div className="p-3 bg-surface-50 border border-surface-200 rounded-xl text-xs text-surface-600">
                    <p>No payment has been made for this booking. It will simply be cancelled.</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3">
              <button onClick={() => setCancelTarget(null)} className="px-4 py-2 text-xs font-medium text-surface-600 hover:bg-surface-100 rounded-xl">
                {cancelMsg ? 'Close' : 'Keep Booking'}
              </button>
              {!cancelMsg && (
                <button
                  onClick={handleCancelBooking}
                  disabled={cancelling}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelling ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <X size={14} />}
                  Yes, Cancel Booking
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-4 border-b border-surface-100 pb-3">
              <h3 className="font-bold text-surface-900 text-base">Write Review for {reviewBooking.business_name}</h3>
              <button onClick={() => setReviewBooking(null)} className="p-1 text-surface-400 hover:text-surface-600">
                <X size={18} />
              </button>
            </div>

            {reviewMsg && (
              <div className={`p-3 rounded-xl text-xs font-medium mb-4 ${reviewMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {reviewMsg.text}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-2">Rating *</label>
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
                        size={26}
                        className={(hoverRating || rating) >= star ? 'text-amber-500 fill-amber-500' : 'text-surface-300'}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-600 ml-2">
                    {(hoverRating || rating)} / 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">Feedback / Comment (Optional)</label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Share your experience with this service..."
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setReviewBooking(null)} className="px-4 py-2 text-xs font-medium text-surface-600 hover:bg-surface-100 rounded-xl">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-4 py-2 text-xs font-semibold bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 flex items-center gap-1"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerBookings;
