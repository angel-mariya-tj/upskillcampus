import { useEffect, useState } from 'react';
import { Calendar, Clock, X, Check } from 'lucide-react';
import api from '../../services/api';

const MerchantBookings = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Reschedule state
  const [rescheduleBooking, setRescheduleBooking] = useState<any | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const fetchBookings = () => {
    setLoading(true);
    api.get('/bookings/merchant?page=1&limit=20')
      .then(r => setBookings(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleStatus = async (bookingId: number, status: string) => {
    try {
      await api.put(`/bookings/${bookingId}/status`, { status });
      setBookings(prev => prev.map(b => b.booking_id === bookingId ? { ...b, status } : b));
    } catch {}
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
      fetchBookings();
    } catch (err: any) {
      setRescheduleError(err.response?.data?.message || 'Failed to reschedule booking.');
    } finally {
      setRescheduling(false);
    }
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
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Booking Management</h1>

      {bookings.length === 0 ? (
        <p className="text-surface-500">No bookings received yet.</p>
      ) : (
        <div className="space-y-4">
          {bookings.map(b => (
            <div key={b.booking_id} className="bg-white rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
              <div>
                <h3 className="font-semibold text-surface-900">{b.service_name}</h3>
                <p className="text-sm text-surface-500">Customer: {b.customer_name} · {b.customer_phone}</p>
                <p className="text-sm text-surface-400">{new Date(b.booking_date).toLocaleDateString()} at {b.booking_time} · ₹{b.price}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={statusBadge(b.status)}>{b.status}</span>

                {(b.status === 'Pending' || b.status === 'Accepted') && (
                  <button
                    onClick={() => {
                      setRescheduleBooking(b);
                      setNewDate(b.booking_date.split('T')[0]);
                      setNewTime(b.booking_time);
                      setRescheduleError(null);
                    }}
                    className="px-3 py-1.5 text-xs font-medium border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 transition-smooth"
                  >
                    Reschedule
                  </button>
                )}

                {b.status === 'Pending' && (
                  <>
                    <button onClick={() => handleStatus(b.booking_id, 'Accepted')} className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-smooth">Accept</button>
                    <button onClick={() => handleStatus(b.booking_id, 'Rejected')} className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-smooth">Reject</button>
                  </>
                )}

                {b.status === 'Accepted' && (
                  <button onClick={() => handleStatus(b.booking_id, 'Completed')} className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-smooth">Complete</button>
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
                <label className="block text-xs font-medium text-surface-700 mb-1">New Date</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    type="date"
                    min={todayStr}
                    required
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-surface-200 text-xs outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">New Time</label>
                <div className="relative">
                  <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    type="time"
                    required
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-surface-200 text-xs outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setRescheduleBooking(null)}
                  className="px-4 py-2 text-xs font-medium text-surface-600 hover:bg-surface-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduling}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50"
                >
                  {rescheduling ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Check size={14} />} Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantBookings;
