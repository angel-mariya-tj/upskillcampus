import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import api from '../../services/api';

const AdminCategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ categoryName: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchCategories = () => {
    api.get('/categories').then(r => setCategories(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ categoryName: '', description: '' });
    setMsg('');
    setShowModal(true);
  };

  const openEdit = (cat: any) => {
    setEditingId(cat.category_id);
    setForm({ categoryName: cat.category_name, description: cat.description || '' });
    setMsg('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, form);
      } else {
        await api.post('/categories', form);
      }
      fetchCategories();
      setTimeout(() => setShowModal(false), 600);
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this category? Merchants using it will lose their category link.')) return;
    try {
      await api.delete(`/categories/${id}`);
      setCategories(prev => prev.filter(c => c.category_id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete.');
    }
  };

  const categoryIcons: Record<string, string> = {
    'Home Services': '🏠', 'Beauty Services': '💇', 'Pet Care': '🐾',
    'Repair Services': '🔧', 'Cleaning Services': '🧹', 'Professional Services': '💼',
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Category Management</h1>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-smooth">
          <Plus size={16} /> Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
        {categories.map(cat => (
          <div key={cat.category_id} className="bg-white rounded-xl p-5 flex items-start gap-4 animate-fade-in-up">
            <div className="text-3xl">{categoryIcons[cat.category_name] || '📦'}</div>
            <div className="flex-1">
              <h3 className="font-semibold text-surface-900">{cat.category_name}</h3>
              <p className="text-sm text-surface-500 mt-1 line-clamp-2">{cat.description}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(cat)} className="p-1.5 hover:bg-surface-100 rounded-lg transition-smooth"><Edit2 size={14} className="text-surface-500" /></button>
              <button onClick={() => handleDelete(cat.category_id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-smooth"><Trash2 size={14} className="text-red-500" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-surface-900">{editingId ? 'Edit Category' : 'Add Category'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-surface-100 rounded-lg"><X size={18} /></button>
            </div>
            {msg && <div className="mb-4 p-3 rounded-xl text-sm bg-red-50 text-red-700">{msg}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Category Name *</label>
                <input value={form.categoryName} onChange={e => setForm({ ...form, categoryName: e.target.value })} required
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-surface-200 rounded-xl text-sm font-medium hover:bg-surface-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-60">
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
