import { useEffect, useState } from 'react';
import api from '../../services/api';

const AdminPayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/payments/all').then(r => setPayments(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Payment Management</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-2xl p-5">
          <p className="text-sm text-surface-500 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-surface-900">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-5">
          <p className="text-sm text-surface-500 mb-1">Transactions</p>
          <p className="text-3xl font-bold text-surface-900">{payments.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5">
          <p className="text-sm text-surface-500 mb-1">Avg. Value</p>
          <p className="text-3xl font-bold text-surface-900">₹{payments.length > 0 ? (totalRevenue / payments.length).toFixed(0) : 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Transaction ID</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Service</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Merchant</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {payments.map(p => (
                <tr key={p.payment_id} className="hover:bg-surface-50 transition-smooth">
                  <td className="px-5 py-3 font-mono text-xs text-surface-600">{p.transaction_id}</td>
                  <td className="px-5 py-3 text-surface-800">{p.customer_name}</td>
                  <td className="px-5 py-3 text-surface-600">{p.service_name}</td>
                  <td className="px-5 py-3 text-surface-600">{p.business_name}</td>
                  <td className="px-5 py-3 font-semibold text-green-600">₹{p.amount}</td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{p.payment_status}</span>
                  </td>
                  <td className="px-5 py-3 text-surface-600">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPayments;
