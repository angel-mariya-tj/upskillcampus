import { useEffect, useState } from 'react';
import { Users, Store, CalendarCheck, DollarSign, TrendingUp } from 'lucide-react';
import api from '../../services/api';

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/payments/admin/analytics'),
      api.get('/bookings/all?page=1&limit=10'),
    ])
      .then(([aRes, bRes]) => {
        setAnalytics(aRes.data.data || null);
        setBookings(bRes.data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Total Payment Volume', value: `₹${analytics?.payments?.total_payment_volume || 0}`, icon: <DollarSign size={22} />, color: 'bg-green-100 text-green-600' },
    { label: 'Total Users', value: analytics?.users?.total_users || 0, icon: <Users size={22} />, color: 'bg-primary-100 text-primary-600' },
    { label: 'Total Merchants', value: analytics?.users?.total_merchants || 0, icon: <Store size={22} />, color: 'bg-amber-100 text-amber-600' },
    { label: 'Total Bookings', value: analytics?.bookings?.total_bookings || 0, icon: <CalendarCheck size={22} />, color: 'bg-blue-100 text-blue-600' },
  ];

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 mb-1">Admin Dashboard</h1>
      <p className="text-surface-500 mb-8">Platform analytics overview and system performance.</p>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 stagger-children">
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

      {/* Secondary Metrics Row */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-surface-200">
            <h3 className="font-semibold text-surface-900 mb-3 text-sm">User Breakdown</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-surface-100">
                <span className="text-surface-500">Customers:</span>
                <span className="font-bold text-surface-900">{analytics.users?.total_customers}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-100">
                <span className="text-surface-500">Merchants:</span>
                <span className="font-bold text-surface-900">{analytics.users?.total_merchants}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-surface-500">Active Services:</span>
                <span className="font-bold text-primary-600">{analytics.services}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-surface-200">
            <h3 className="font-semibold text-surface-900 mb-3 text-sm">Booking Status Metrics</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-surface-100">
                <span className="text-surface-500">Completed:</span>
                <span className="font-bold text-green-600">{analytics.bookings?.completed_bookings}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-100">
                <span className="text-surface-500">Accepted:</span>
                <span className="font-bold text-blue-600">{analytics.bookings?.accepted_bookings}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-surface-500">Pending:</span>
                <span className="font-bold text-amber-600">{analytics.bookings?.pending_bookings}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-surface-200">
            <h3 className="font-semibold text-surface-900 mb-3 text-sm">Payment Status Metrics</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-surface-100">
                <span className="text-surface-500">Completed Payments:</span>
                <span className="font-bold text-green-600">{analytics.payments?.completed_payments_count}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-100">
                <span className="text-surface-500">Pending Payments:</span>
                <span className="font-bold text-amber-600">{analytics.payments?.pending_payments_count}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-surface-500">Failed Payments:</span>
                <span className="font-bold text-red-600">{analytics.payments?.failed_payments_count}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Platform Revenue Table */}
      {analytics?.monthlyMetrics && analytics.monthlyMetrics.length > 0 && (
        <div className="bg-white rounded-2xl p-6 mb-8 border border-surface-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-primary-600" />
            <h2 className="text-lg font-semibold text-surface-900">Monthly Platform Revenue Growth</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-surface-500 uppercase">Month</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-surface-500 uppercase">Payment Volume</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-surface-500 uppercase">Transactions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {analytics.monthlyMetrics.map((m: any, idx: number) => (
                  <tr key={idx} className="hover:bg-surface-50">
                    <td className="px-4 py-2.5 font-medium text-surface-800">{m.month}</td>
                    <td className="px-4 py-2.5 text-emerald-600 font-semibold">₹{m.payment_volume}</td>
                    <td className="px-4 py-2.5 text-surface-600">{m.payment_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Bookings Table */}
      <h2 className="text-lg font-semibold text-surface-900 mb-4">System Recent Bookings</h2>
      <div className="bg-white rounded-2xl overflow-hidden border border-surface-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Service</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Merchant</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {bookings.map(b => (
                <tr key={b.booking_id} className="hover:bg-surface-50">
                  <td className="px-5 py-3 text-surface-800 font-medium">{b.customer_name}</td>
                  <td className="px-5 py-3 text-surface-600">{b.service_name}</td>
                  <td className="px-5 py-3 text-surface-600">{b.business_name}</td>
                  <td className="px-5 py-3 text-surface-600">{new Date(b.booking_date || b.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-surface-600">₹{b.price}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium badge-${b.status.toLowerCase()}`}>{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
