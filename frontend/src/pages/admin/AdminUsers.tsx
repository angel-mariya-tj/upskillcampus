import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Mail, Shield } from 'lucide-react';

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all merchants to get user info - also fetch from categories
    // We aggregate a user list from merchants + bookings context
    // Since there's no GET /users admin endpoint yet, we'll use merchants admin list
    api.get('/merchants/admin/all')
      .then(r => setUsers(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 mb-6">User Management</h1>
      <p className="text-sm text-surface-500 mb-6">Registered merchant accounts on the platform.</p>

      <div className="space-y-3">
        {users.map((u: any) => (
          <div key={u.merchant_id} className="bg-white rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                {u.owner_name?.[0] || '?'}
              </div>
              <div>
                <h3 className="font-semibold text-surface-900">{u.owner_name}</h3>
                <div className="flex items-center gap-3 text-xs text-surface-500 mt-0.5">
                  <span className="flex items-center gap-1"><Mail size={11} /> {u.email}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                <Shield size={12} /> Merchant
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                u.approval_status === 'Approved' ? 'bg-green-100 text-green-700' :
                u.approval_status === 'Rejected' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`}>{u.approval_status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminUsers;
