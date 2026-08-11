import { useEffect, useState } from 'react';
import api from '../../services/api';

const MerchantProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    businessName: '', description: '', categoryId: '', address: '',
  });

  useEffect(() => {
    Promise.all([
      api.get('/merchants/profile/me').catch(() => null),
      api.get('/categories'),
    ]).then(([pRes, cRes]) => {
      setCategories(cRes?.data?.data || []);
      if (pRes?.data?.data) {
        const p = pRes.data.data;
        setProfile(p);
        setForm({
          businessName: p.business_name || '',
          description: p.description || '',
          categoryId: p.category_id?.toString() || '',
          address: p.address || '',
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      if (profile) {
        await api.put(`/merchants/${profile.merchant_id}`, {
          businessName: form.businessName,
          description: form.description,
          categoryId: parseInt(form.categoryId) || null,
          address: form.address,
        });
        setMsg('Profile updated successfully!');
      } else {
        const res = await api.post('/merchants', {
          businessName: form.businessName,
          description: form.description,
          categoryId: parseInt(form.categoryId) || null,
          address: form.address,
        });
        setProfile(res.data.data);
        setMsg('Profile created! It will be reviewed by admin for approval.');
      }
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Business Profile</h1>

      {profile && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${
          profile.approval_status === 'Approved' ? 'bg-green-50 text-green-700 border border-green-200' :
          profile.approval_status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
          'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          Status: {profile.approval_status}
          {profile.approval_status === 'Pending' && ' — Your profile is under review by the admin.'}
        </div>
      )}

      {msg && <div className={`mb-6 p-3 rounded-xl text-sm ${msg.includes('success') || msg.includes('created') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 space-y-5 max-w-2xl animate-fade-in-up">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Business Name *</label>
          <input value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} required
            className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4}
            className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Category</label>
          <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white">
            <option value="">Select a category</option>
            {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Address</label>
          <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm" />
        </div>
        <button type="submit" disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-smooth disabled:opacity-60">
          {saving ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
        </button>
      </form>
    </div>
  );
};

export default MerchantProfile;
