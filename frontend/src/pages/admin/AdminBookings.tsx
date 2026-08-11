import { useEffect, useState } from 'react';
import api from '../../services/api';

const AdminBookings = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bookings/all').then(r => setBookings(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      Pending: 'badge-pending', Accepted: 'badge-accepted', Rejected: 'badge-rejected',
      Completed: 'badge-completed', Cancelled: 'badge-cancelled',
    };
    return `px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || ''}`;
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 mb-6">All Bookings</h1>
      <p className="text-surface-500 mb-6 text-sm">{bookings.length} total bookings on the platform.</p>
      <div className="bg-white rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">#ID</th>
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
                <tr key={b.booking_id} className="hover:bg-surface-50 transition-smooth">
                  <td className="px-5 py-3 text-surface-400 font-mono text-xs">#{b.booking_id}</td>
                  <td className="px-5 py-3 font-medium text-surface-800">{b.customer_name}</td>
                  <td className="px-5 py-3 text-surface-600">{b.service_name}</td>
                  <td className="px-5 py-3 text-surface-600">{b.business_name}</td>
                  <td className="px-5 py-3 text-surface-600">{new Date(b.booking_date || b.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-surface-600">₹{b.price}</td>
                  <td className="px-5 py-3"><span className={statusBadge(b.status)}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminBookings;
