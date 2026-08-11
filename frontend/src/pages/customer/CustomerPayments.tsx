import { useEffect, useState } from 'react';
import api from '../../services/api';

const CustomerPayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/payments/customer').then(r => setPayments(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Payment History</h1>
      {payments.length === 0 ? (
        <p className="text-surface-500">No payment history yet.</p>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Transaction ID</th>
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
                  <td className="px-5 py-3 text-surface-800">{p.service_name}</td>
                  <td className="px-5 py-3 text-surface-600">{p.business_name}</td>
                  <td className="px-5 py-3 font-medium text-surface-900">₹{p.amount}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{p.payment_status}</span>
                  </td>
                  <td className="px-5 py-3 text-surface-600">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CustomerPayments;
