import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Upload, Image as ImageIcon, Clock, DollarSign } from 'lucide-react';
import api from '../../services/api';
import { formatDuration } from '../../utils/formatters';

const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '') : 'http://localhost:5000';

const MerchantServices = () => {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ serviceName: '', description: '', price: '', duration: '', image: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);

  // Get merchant_id for the logged-in user
  const fetchServices = async () => {
    try {
      const profileRes = await api.get('/merchants/profile/me');
      const merchantId = profileRes.data.data.merchant_id;
      const res = await api.get(`/services/merchant/${merchantId}`);
      setServices(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ serviceName: '', description: '', price: '', duration: '', image: '' });
    setMsg('');
    setShowModal(true);
  };

  const openEdit = (svc: any) => {
    setEditingId(svc.service_id);
    setForm({
      serviceName: svc.service_name,
      description: svc.description || '',
      price: svc.price?.toString() || '',
      duration: svc.duration ? (svc.duration / 60).toString() : '',
      image: svc.image || '',
    });
    setMsg('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const payload = {
        serviceName: form.serviceName,
        description: form.description,
        price: parseFloat(form.price),
        duration: Math.round(parseFloat(form.duration) * 60),
        image: form.image.trim() || undefined,
      };
      if (editingId) {
        await api.put(`/services/${editingId}`, payload);
        setMsg('Service updated!');
      } else {
        await api.post('/services', payload);
        setMsg('Service added!');
      }
      fetchServices();
      setTimeout(() => setShowModal(false), 800);
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await api.delete(`/services/${id}`);
      setServices(prev => prev.filter(s => s.service_id !== id));
    } catch {}
  };

  const handleImageUpload = async (serviceId: number, file: File) => {
    setUploadingImage(serviceId);
    try {
      const formData = new FormData();
      formData.append('image', file);
      await api.post(`/services/${serviceId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchServices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload image.');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleImageDelete = async (serviceId: number) => {
    if (!confirm('Remove this service image?')) return;
    try {
      await api.delete(`/services/${serviceId}/image`);
      fetchServices();
    } catch {};
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-surface-900">My Services</h1>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-smooth">
          <Plus size={16} /> Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl">
          <p className="text-surface-500 mb-2">You haven't added any services yet.</p>
          <button onClick={openAdd} className="text-primary-600 font-medium hover:underline">Add your first service</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {services.map(svc => (
            <div key={svc.service_id} className="bg-white rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-smooth group animate-fade-in-up flex flex-col justify-between">
              <div>
                {/* Service Image */}
                <div className="relative h-56 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center overflow-hidden">
                  {svc.image ? (
                    <img
                      src={svc.image.startsWith('http') ? svc.image : `${API_BASE}${svc.image}`}
                      alt={svc.service_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon size={48} className="text-primary-300 opacity-50" />
                  )}
                  {/* Edit / Delete actions — top right */}
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    <button onClick={() => openEdit(svc)} className="p-2 bg-white/90 backdrop-blur rounded-full hover:bg-white transition-smooth shadow-sm">
                      <Edit2 size={14} className="text-surface-600" />
                    </button>
                    <button onClick={() => handleDelete(svc.service_id)} className="p-2 bg-white/90 backdrop-blur rounded-full hover:bg-red-50 transition-smooth shadow-sm">
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                  {/* Image upload / delete actions — bottom right */}
                  <div className="absolute bottom-3 right-3 flex gap-1.5">
                    <label className="p-2 bg-white/90 backdrop-blur rounded-full cursor-pointer hover:bg-white transition-smooth shadow-sm">
                      <Upload size={14} className="text-primary-600" />
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(svc.service_id, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {svc.image && (
                      <button
                        onClick={() => handleImageDelete(svc.service_id)}
                        className="p-2 bg-white/90 backdrop-blur rounded-full hover:bg-red-50 transition-smooth shadow-sm"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    )}
                  </div>
                  {uploadingImage === svc.service_id && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${svc.availability ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {svc.availability ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-surface-900 mb-1 group-hover:text-primary-600 transition-smooth">
                    {svc.service_name}
                  </h3>
                  <p className="text-sm text-surface-500 mb-3 line-clamp-2">{svc.description}</p>
                </div>
              </div>

              {/* Card footer — matches Explore Services style */}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-surface-900">{editingId ? 'Edit Service' : 'Add Service'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-surface-100 rounded-lg"><X size={18} /></button>
            </div>
            {msg && <div className={`mb-4 p-3 rounded-xl text-sm ${msg.includes('!') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Service Name *</label>
                <input value={form.serviceName} onChange={e => setForm({ ...form, serviceName: e.target.value })} required
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Price (₹) *</label>
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required min="0"
                    className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Duration (hours) *</label>
                  <input type="number" step="any" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} required min="0.01"
                    placeholder="e.g. 1 or 1.5"
                    className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Image URL (Optional)</label>
                <input
                  type="text"
                  value={form.image}
                  onChange={e => setForm({ ...form, image: e.target.value })}
                  placeholder="https://example.com/image.jpg or /uploads/..."
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
                <p className="text-xs text-surface-400 mt-1">💡 Enter an image URL here, or upload an image file directly after saving.</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-surface-200 rounded-xl text-sm font-medium hover:bg-surface-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-60">
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantServices;
