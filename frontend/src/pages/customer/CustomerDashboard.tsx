import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Clock, CheckCircle, User, Phone, Edit2, X, Check, Search } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { payWithRazorpay } from '../../utils/razorpay';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile Edit State
  const [editingProfile, setEditingProfile] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    api.get('/bookings/customer')
      .then(res => setBookings(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);

    try {
      const res = await api.put('/customer/profile', { name, phone });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      // Update local storage user data if present
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        parsed.name = res.data.data.name;
        parsed.phone = res.data.data.phone;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
      setTimeout(() => setEditingProfile(false), 1200);
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const stats = [
    { label: 'Total Bookings', value: bookings.length, icon: <CalendarCheck size={22} />, color: 'bg-primary-100 text-primary-600' },
    { label: 'Pending', value: bookings.filter(b => b.status === 'Pending').length, icon: <Clock size={22} />, color: 'bg-amber-100 text-amber-600' },
    { label: 'Completed', value: bookings.filter(b => b.status === 'Completed').length, icon: <CheckCircle size={22} />, color: 'bg-green-100 text-green-600' },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      Pending: 'badge-pending', Accepted: 'badge-accepted', Rejected: 'badge-rejected',
      Completed: 'badge-completed', Cancelled: 'badge-cancelled',
    };
    return `px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-surface-100 text-surface-600'}`;
  };

  return (
    <div>
      {/* Top Banner & Profile Header */}
      <div className="bg-white rounded-2xl p-6 mb-8 border border-surface-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 mb-1">Welcome back, {name} 👋</h1>
          <p className="text-sm text-surface-500 flex items-center gap-3">
            <span>{user?.email}</span>
            {phone && <span>· Phone: {phone}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            to="/services"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium text-xs rounded-xl hover:bg-primary-700 transition-smooth"
          >
            <Search size={14} /> Explore Services
          </Link>
          <button
            onClick={() => { setEditingProfile(true); setProfileMsg(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-surface-100 text-surface-700 font-medium text-xs rounded-xl hover:bg-surface-200 transition-smooth"
          >
            <Edit2 size={14} /> Edit Profile
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-4 border-b border-surface-100 pb-3">
              <h3 className="font-bold text-surface-900 text-lg">Edit Profile</h3>
              <button onClick={() => setEditingProfile(false)} className="p-1 text-surface-400 hover:text-surface-600">
                <X size={18} />
              </button>
            </div>

            {profileMsg && (
              <div className={`p-3 rounded-xl mb-4 text-xs font-medium ${profileMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-surface-200 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-surface-200 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="px-4 py-2 text-xs font-medium text-surface-600 hover:bg-surface-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50"
                >
                  {savingProfile ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Check size={14} />} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8 stagger-children">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 flex items-center gap-4 animate-fade-in-up">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-surface-900">{s.value}</p>
              <p className="text-sm text-surface-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-surface-900 mb-4">Recent Bookings</h2>
      {loading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-10 text-surface-500">No bookings yet. Browse services to get started!</div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Service</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Merchant</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Time</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Price</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {bookings.slice(0, 10).map(b => (
                  <tr key={b.booking_id} className="hover:bg-surface-50 transition-smooth">
                    <td className="px-5 py-3 font-medium text-surface-800">{b.service_name}</td>
                    <td className="px-5 py-3 text-surface-600">{b.business_name}</td>
                    <td className="px-5 py-3 text-surface-600">{new Date(b.booking_date).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-surface-600">{b.booking_time}</td>
                    <td className="px-5 py-3 text-surface-600">₹{b.price}</td>
                    <td className="px-5 py-3"><span className={statusBadge(b.status)}>{b.status}</span></td>
                    <td className="px-5 py-3">
                      {b.status === 'Accepted' && b.payment_status !== 'Completed' && (
                        <button
                          onClick={() => {
                            payWithRazorpay({
                              bookingId: b.booking_id,
                              onSuccess: () => {
                                setBookings(prev => prev.map(bk => bk.booking_id === b.booking_id ? { ...bk, payment_status: 'Completed' } : bk));
                              }
                            });
                          }}
                          className="text-xs font-medium text-primary-600 hover:underline"
                        >Pay Now</button>
                      )}
                      {b.payment_status === 'Completed' && (
                        <span className="text-xs font-medium text-green-600">Paid</span>
                      )}
                      {(b.status === 'Pending' || b.status === 'Accepted') && (
                        <button
                          onClick={async () => {
                            try {
                              await api.put(`/bookings/${b.booking_id}/cancel`);
                              setBookings(prev => prev.map(bk => bk.booking_id === b.booking_id ? { ...bk, status: 'Cancelled' } : bk));
                            } catch {}
                          }}
                          className="text-xs font-medium text-red-500 hover:underline ml-2"
                        >Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
