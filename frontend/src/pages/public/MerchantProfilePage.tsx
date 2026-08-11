import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Clock, DollarSign, Star, ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatDuration } from '../../utils/formatters';

const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '') : 'http://localhost:5000';

const MerchantProfilePage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any>({ reviews: [], averageRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/merchants/${id}`),
      api.get(`/services/merchant/${id}`),
      api.get(`/reviews/merchant/${id}`),
    ])
      .then(([mRes, sRes, rRes]) => {
        setMerchant(mRes.data.data);
        setServices(sRes.data.data || []);
        setReviews(rRes.data.data || { reviews: [], averageRating: 0, totalReviews: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const [bookingService, setBookingService] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingMsg, setBookingMsg] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Review Form State
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewFormMsg, setReviewFormMsg] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchReviews = () => {
    api.get(`/reviews/merchant/${id}`)
      .then(rRes => setReviews(rRes.data.data || { reviews: [], averageRating: 0, totalReviews: 0 }))
      .catch(() => {});
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'Customer') { setReviewFormMsg('Only customers can review services.'); return; }
    setSubmittingReview(true);
    setReviewFormMsg('');
    try {
      await api.post('/reviews', {
        merchantId: parseInt(id!),
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      setReviewFormMsg('Thank you! Your review has been published.');
      fetchReviews();
      setTimeout(() => {
        setShowReviewForm(false);
        setReviewFormMsg('');
        setReviewComment('');
      }, 1500);
    } catch (err: any) {
      setReviewFormMsg(err.response?.data?.message || 'Failed to post review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'Customer') { setBookingMsg('Only customers can book services.'); return; }
    setBookingLoading(true);
    setBookingMsg('');
    try {
      await api.post('/bookings', {
        merchantId: parseInt(id!),
        serviceId: bookingService.service_id,
        bookingDate,
        bookingTime,
      });
      setBookingMsg('Booking created successfully! Check your dashboard.');
      setTimeout(() => {
        setBookingService(null);
        setBookingMsg('');
      }, 1500);
    } catch (err: any) {
      setBookingMsg(err.response?.data?.message || 'Failed to create booking.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
    </div>
  );

  if (!merchant) return (
    <div className="min-h-screen flex items-center justify-center text-surface-500">Merchant not found.</div>
  );

  return (
    <div className="py-10">
      <div className="max-w-5xl mx-auto px-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-surface-500 hover:text-primary-600 mb-6 transition-smooth">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Profile Header */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-lg mb-8 animate-fade-in-up">
          <div className="h-44 bg-gradient-to-br from-primary-500 to-primary-800 relative">
            <div className="absolute bottom-0 left-8 translate-y-1/2 w-24 h-24 rounded-2xl bg-white shadow-xl flex items-center justify-center text-4xl border-4 border-white">
              🏪
            </div>
          </div>
          <div className="pt-14 px-8 pb-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-surface-900">{merchant.business_name}</h1>
                <p className="text-surface-500 mt-1">{merchant.description}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-surface-400">
                  <span className="flex items-center gap-1"><MapPin size={14} /> {merchant.address || 'N/A'}</span>
                  <span className="px-2.5 py-0.5 bg-primary-50 text-primary-600 rounded-full text-xs font-medium">{merchant.category_name}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-xl">
                <Star size={18} className="text-amber-500 fill-amber-500" />
                <span className="font-bold text-amber-700">{reviews.averageRating || 'N/A'}</span>
                <span className="text-sm text-amber-600">({reviews.totalReviews} reviews)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h2 className="text-xl font-bold text-surface-900 mb-4">Services Offered</h2>
          {services.length === 0 ? (
            <p className="text-surface-500">No services listed yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map(svc => (
                <div key={svc.service_id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-smooth flex flex-col justify-between">
                  <div>
                    {svc.image && (
                      <div className="h-36 bg-surface-100 overflow-hidden">
                        <img src={svc.image.startsWith('http') ? svc.image : `${API_BASE}${svc.image}`} alt={svc.service_name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-semibold text-surface-900">{svc.service_name}</h3>
                      <p className="text-sm text-surface-500 mt-1">{svc.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-5 pt-0">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-primary-600 font-semibold flex items-center gap-1"><DollarSign size={14} />₹{svc.price}</span>
                      <span className="text-surface-400 flex items-center gap-1"><Clock size={14} />{formatDuration(svc.duration)}</span>
                    </div>
                    <button
                      onClick={() => setBookingService(svc)}
                      className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-smooth"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Booking Modal */}
        {bookingService && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
              <h3 className="text-lg font-bold text-surface-900 mb-1">Book: {bookingService.service_name}</h3>
              <p className="text-sm text-surface-500 mb-4">₹{bookingService.price} · {formatDuration(bookingService.duration)}</p>
              {bookingMsg && <div className={`mb-4 p-3 rounded-xl text-sm ${bookingMsg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{bookingMsg}</div>}
              <form onSubmit={handleBook} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Date</label>
                  <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Time</label>
                  <input type="time" value={bookingTime} onChange={e => setBookingTime(e.target.value)} required
                    className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setBookingService(null); setBookingMsg(''); }}
                    className="flex-1 py-2.5 border border-surface-200 rounded-xl text-sm font-medium hover:bg-surface-50 transition-smooth">Cancel</button>
                  <button type="submit" disabled={bookingLoading}
                    className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-smooth disabled:opacity-60">
                    {bookingLoading ? 'Booking...' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-surface-900">Customer Reviews</h2>
              {reviews.totalReviews > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Star size={16} className="fill-amber-500 text-amber-500" />
                    <span className="font-bold text-surface-900 text-sm">{reviews.averageRating}</span>
                  </div>
                  <span className="text-xs text-surface-400">({reviews.totalReviews} total reviews)</span>
                </div>
              )}
            </div>

            {user?.role === 'Customer' && (
              <button
                onClick={() => { setShowReviewForm(!showReviewForm); setReviewFormMsg(''); }}
                className="px-4 py-2 bg-amber-500 text-white font-medium text-xs rounded-xl hover:bg-amber-600 transition-smooth flex items-center gap-1.5"
              >
                <Star size={14} className="fill-white" /> {showReviewForm ? 'Cancel Review' : 'Write a Review'}
              </button>
            )}
          </div>

          {/* Review Submission Form */}
          {showReviewForm && (
            <div className="bg-white rounded-2xl p-6 border border-amber-200 shadow-sm mb-6 animate-fade-in-up">
              <h3 className="font-bold text-surface-900 text-base mb-1">Write a Review for {merchant?.business_name}</h3>
              <p className="text-xs text-surface-500 mb-4">You can submit a review after completing a booking with this merchant.</p>

              {reviewFormMsg && (
                <div className={`p-3 rounded-xl text-xs font-medium mb-4 ${reviewFormMsg.includes('Thank you') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {reviewFormMsg}
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
                        onClick={() => setReviewRating(star)}
                        onMouseEnter={() => setReviewHoverRating(star)}
                        onMouseLeave={() => setReviewHoverRating(0)}
                        className="p-1 focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          size={24}
                          className={(reviewHoverRating || reviewRating) >= star ? 'text-amber-500 fill-amber-500' : 'text-surface-300'}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-amber-600 ml-2">
                      {(reviewHoverRating || reviewRating)} / 5 Stars
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">Feedback / Comment (Optional)</label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="Share your experience..."
                    className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-xs resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowReviewForm(false)} className="px-4 py-2 border border-surface-200 rounded-xl text-xs font-medium hover:bg-surface-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={submittingReview} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 disabled:opacity-50">
                    {submittingReview ? 'Submitting...' : 'Post Review'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {reviews.reviews.length === 0 ? (
            <p className="text-surface-500">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {reviews.reviews.map((r: any) => (
                <div key={r.review_id} className="bg-white rounded-xl p-5 border border-surface-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-sm">
                        {r.customer_name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-surface-800 text-sm">{r.customer_name}</p>
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} size={12} className={i <= r.rating ? 'text-amber-500 fill-amber-500' : 'text-surface-300'} />
                          ))}
                        </div>
                      </div>
                    </div>
                    {r.created_at && (
                      <span className="text-xs text-surface-400">{new Date(r.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  {r.comment && <p className="text-sm text-surface-600 mt-2">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MerchantProfilePage;
