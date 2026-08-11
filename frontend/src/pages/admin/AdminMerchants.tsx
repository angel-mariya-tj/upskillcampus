import { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';

const AdminMerchants = () => {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');

  useEffect(() => {
    api.get('/merchants/admin/all')
      .then(r => setMerchants(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleApproval = async (id: number, status: 'Approved' | 'Rejected') => {
    try {
      await api.put(`/merchants/${id}/approve`, { status });
      setMerchants(prev => prev.map(m => m.merchant_id === id ? { ...m, approval_status: status } : m));
    } catch {}
  };

  const filtered = filter === 'All' ? merchants : merchants.filter(m => m.approval_status === filter);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Merchant Management</h1>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-smooth ${filter === f ? 'bg-primary-600 text-white shadow' : 'bg-white text-surface-600 hover:bg-surface-100'}`}>
            {f} {f !== 'All' && `(${merchants.filter(m => m.approval_status === f).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-surface-500">No merchants found.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map(m => (
            <div key={m.merchant_id} className="bg-white rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
              <div>
                <h3 className="font-semibold text-surface-900">{m.business_name}</h3>
                <p className="text-sm text-surface-500">{m.owner_name} · {m.email}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-surface-400">
                  <span className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full">{m.category_name || 'N/A'}</span>
                  <span>{m.address || 'No address'}</span>
                  <span>Joined: {new Date(m.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  m.approval_status === 'Approved' ? 'bg-green-100 text-green-700' :
                  m.approval_status === 'Rejected' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>{m.approval_status}</span>
                {m.approval_status === 'Pending' && (
                  <>
                    <button onClick={() => handleApproval(m.merchant_id, 'Approved')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-smooth">
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button onClick={() => handleApproval(m.merchant_id, 'Rejected')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-smooth">
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                )}
                {m.approval_status === 'Approved' && (
                  <button onClick={() => handleApproval(m.merchant_id, 'Rejected')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-smooth">
                    <XCircle size={14} /> Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminMerchants;
