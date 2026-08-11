import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import api from '../../services/api';

const MerchantEarnings = () => {
  const [data, setData] = useState<any>({ totalEarnings: 0, transactions: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/payments/earnings').then(r => setData(r.data.data || { totalEarnings: 0, transactions: [] })).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Earnings</h1>

      <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 text-white mb-8 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp size={24} />
          <span className="text-primary-200 text-sm font-medium">Total Earnings</span>
        </div>
        <p className="text-4xl font-bold">₹{data.totalEarnings.toLocaleString()}</p>
        <p className="text-primary-200 text-sm mt-1">{data.transactions.length} transactions</p>
      </div>

      {data.transactions.length === 0 ? (
        <p className="text-surface-500">No earnings yet.</p>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Transaction ID</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Service</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-surface-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {data.transactions.map((t: any) => (
                <tr key={t.payment_id} className="hover:bg-surface-50 transition-smooth">
                  <td className="px-5 py-3 font-mono text-xs text-surface-600">{t.transaction_id}</td>
                  <td className="px-5 py-3 text-surface-800">{t.service_name}</td>
                  <td className="px-5 py-3 text-surface-600">{t.customer_name}</td>
                  <td className="px-5 py-3 font-semibold text-green-600">₹{t.amount}</td>
                  <td className="px-5 py-3 text-surface-600">{new Date(t.booking_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MerchantEarnings;
