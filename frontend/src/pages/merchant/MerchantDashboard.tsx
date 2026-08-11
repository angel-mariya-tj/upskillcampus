import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, DollarSign, Package, Clock, TrendingUp, ArrowRight, Sparkles, Star, Image as ImageIcon } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatDuration } from '../../utils/formatters';

const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '') : 'http://localhost:5000';

const MerchantDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>({
    totalEarnings: 0,
    totalBookings: 0,
    pendingBookings: 0,
    acceptedBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    monthlyRevenue: [],
    transactions: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/bookings/merchant?page=1&limit=10'),
      api.get('/payments/earnings'),
      api.get('/merchants/profile/me').catch(() => ({ data: { data: null } })),
    ])
      .then(([bRes, eRes, pRes]) => {
        setBookings(bRes.data.data || []);
        if (eRes.data.data) {
          setAnalytics(eRes.data.data);
        }
        const prof = pRes.data.data;
        setProfile(prof);
        if (prof?.merchant_id) {
          api.get(`/services/merchant/${prof.merchant_id}`)
            .then(sRes => setServices(sRes.data.data || []))
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Total Revenue', value: `₹${analytics.totalEarnings || 0}`, icon: <DollarSign size={22} />, color: 'bg-emerald-100 text-emerald-600', ring: 'ring-emerald-200' },
    { label: 'Total Bookings', value: analytics.totalBookings || bookings.length, icon: <CalendarCheck size={22} />, color: 'bg-primary-100 text-primary-600', ring: 'ring-primary-200' },
    { label: 'Pending', value: analytics.pendingBookings, icon: <Clock size={22} />, color: 'bg-amber-100 text-amber-600', ring: 'ring-amber-200' },
    { label: 'Completed', value: analytics.completedBookings, icon: <Package size={22} />, color: 'bg-blue-100 text-blue-600', ring: 'ring-blue-200' },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      Pending: 'badge-pending', Accepted: 'badge-accepted', Rejected: 'badge-rejected',
      Completed: 'badge-completed', Cancelled: 'badge-cancelled',
    };
    return `px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || ''}`;
  };

  const handleStatus = async (bookingId: number, status: string) => {
    try {
      await api.put(`/bookings/${bookingId}/status`, { status });
      setBookings(prev => prev.map(b => b.booking_id === bookingId ? { ...b, status } : b));
    } catch {}
  };

  // Get current greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>;

  return (
    <div>
      {/* ─── Hero Banner ─── */}
      <div className="relative rounded-3xl overflow-hidden mb-8 animate-fade-in-up">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800"></div>
        {/* Decorative shapes */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4"></div>
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-white/10 rounded-full"></div>

        <div className="relative z-10 px-8 py-10 md:flex md:items-center md:justify-between">
          <div className="mb-6 md:mb-0">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-amber-300" />
              <span className="text-sm font-medium text-primary-200 tracking-wide uppercase">{getGreeting()}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Welcome back, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-primary-200 text-base max-w-lg">
              {profile?.business_name
                ? <>Manage <span className="text-white font-semibold">{profile.business_name}</span> — track bookings, revenue & services all in one place.</>
                : 'Manage your business operations & financial performance.'}
            </p>
            {profile?.approval_status === 'Pending' && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-400/20 backdrop-blur rounded-xl text-amber-200 text-sm font-medium">
                <Clock size={14} /> Your profile is under review by admin
              </div>
            )}
          </div>

          {/* Quick stats on the banner */}
          <div className="flex gap-4">
            <div className="bg-white/15 backdrop-blur-md rounded-2xl px-6 py-4 text-center min-w-[110px]">
              <p className="text-3xl font-bold text-white">{analytics.totalBookings || bookings.length}</p>
              <p className="text-xs text-primary-200 mt-1">Total Bookings</p>
            </div>
            <div className="bg-white/15 backdrop-blur-md rounded-2xl px-6 py-4 text-center min-w-[110px]">
              <p className="text-3xl font-bold text-white">₹{analytics.totalEarnings || 0}</p>
              <p className="text-xs text-primary-200 mt-1">Total Revenue</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Analytics Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 stagger-children">
        {stats.map((s, i) => (
          <div key={i} className={`bg-white rounded-2xl p-5 flex items-center gap-4 animate-fade-in-up hover:shadow-lg hover:-translate-y-0.5 transition-smooth ring-1 ${s.ring}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-surface-900">{s.value}</p>
              <p className="text-sm text-surface-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── My Services Section ─── */}
      <div className="mb-8 animate-fade-in-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Star size={20} className="text-primary-600" />
            <h2 className="text-lg font-semibold text-surface-900">My Services</h2>
            <span className="ml-1 px-2.5 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">{services.length}</span>
          </div>
          <Link to="/merchant/services" className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-smooth">
            View All <ArrowRight size={16} />
          </Link>
        </div>

        {services.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center">
            <ImageIcon size={40} className="mx-auto text-surface-300 mb-3" />
            <p className="text-surface-500 mb-2">No services added yet.</p>
            <Link to="/merchant/services" className="text-primary-600 font-medium hover:underline">Add your first service →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.slice(0, 6).map(svc => (
              <div key={svc.service_id} className="bg-white rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-smooth group flex flex-col justify-between">
                <div>
                  {/* Image */}
                  <div className="relative h-44 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center overflow-hidden">
                    {svc.image ? (
                      <img
                        src={svc.image.startsWith('http') ? svc.image : `${API_BASE}${svc.image}`}
                        alt={svc.service_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      />
                    ) : (
                      <ImageIcon size={40} className="text-primary-300 opacity-50" />
                    )}
                    <span className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-xs font-medium ${svc.availability ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {svc.availability ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  {/* Content */}
                  <div className="p-5">
                    <h3 className="font-semibold text-surface-900 mb-1 group-hover:text-primary-600 transition-smooth">
                      {svc.service_name}
                    </h3>
                    <p className="text-sm text-surface-500 line-clamp-2">{svc.description}</p>
                  </div>
                </div>
                {/* Footer */}
                <div className="p-5 pt-0">
                  <div className="flex items-center justify-between text-sm pt-3 border-t border-surface-100">
                    <span className="font-semibold text-primary-600 flex items-center gap-1">
                      <DollarSign size={14} /> ₹{svc.price}
                    </span>
                    <span className="text-surface-400 flex items-center gap-1">
                      <Clock size={14} /> {formatDuration(svc.duration)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {services.length > 6 && (
          <div className="text-center mt-4">
            <Link to="/merchant/services" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
              +{services.length - 6} more services <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>

      {/* ─── Monthly Revenue ─── */}
      {analytics.monthlyRevenue && analytics.monthlyRevenue.length > 0 && (
        <div className="bg-white rounded-2xl p-6 mb-8 border border-surface-200 shadow-sm animate-fade-in-up">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-primary-600" />
            <h2 className="text-lg font-semibold text-surface-900">Monthly Historical Revenue</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-surface-500 uppercase">Month</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-surface-500 uppercase">Completed Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {analytics.monthlyRevenue.map((m: any, idx: number) => (
                  <tr key={idx} className="hover:bg-surface-50">
                    <td className="px-4 py-2.5 font-medium text-surface-800">{m.month}</td>
                    <td className="px-4 py-2.5 text-emerald-600 font-semibold">₹{m.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Recent Bookings ─── */}
      <div className="animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarCheck size={20} className="text-primary-600" />
            <h2 className="text-lg font-semibold text-surface-900">Recent Bookings</h2>
            <span className="ml-1 px-2.5 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">{bookings.length}</span>
          </div>
          <Link to="/merchant/bookings" className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-smooth">
            View All <ArrowRight size={16} />
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center">
            <CalendarCheck size={40} className="mx-auto text-surface-300 mb-3" />
            <p className="text-surface-500">No bookings received yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden border border-surface-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Customer</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Service</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Time</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Price</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {bookings.map(b => (
                    <tr key={b.booking_id} className="hover:bg-surface-50 transition-smooth">
                      <td className="px-5 py-3 font-medium text-surface-800">{b.customer_name}</td>
                      <td className="px-5 py-3 text-surface-600">{b.service_name}</td>
                      <td className="px-5 py-3 text-surface-600">{new Date(b.booking_date).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-surface-600">{b.booking_time}</td>
                      <td className="px-5 py-3 text-surface-600">₹{b.price}</td>
                      <td className="px-5 py-3"><span className={statusBadge(b.status)}>{b.status}</span></td>
                      <td className="px-5 py-3">
                        {b.status === 'Pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => handleStatus(b.booking_id, 'Accepted')} className="text-xs text-green-600 font-medium hover:underline">Accept</button>
                            <button onClick={() => handleStatus(b.booking_id, 'Rejected')} className="text-xs text-red-600 font-medium hover:underline">Reject</button>
                          </div>
                        )}
                        {b.status === 'Accepted' && (
                          <button onClick={() => handleStatus(b.booking_id, 'Completed')} className="text-xs text-primary-600 font-medium hover:underline">Complete</button>
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
    </div>
  );
};

export default MerchantDashboard;
