import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin } from 'lucide-react';
import api from '../../services/api';

const MerchantsPage = () => {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchMerchants = (q?: string) => {
    setLoading(true);
    const params: any = {};
    if (q) params.search = q;
    api.get('/merchants', { params })
      .then(res => setMerchants(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMerchants(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMerchants(search);
  };

  return (
    <div className="py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 animate-fade-in-up">
          <h1 className="text-3xl font-bold text-surface-900 mb-2">Our Merchants</h1>
          <p className="text-surface-500">Discover trusted service providers</p>
        </div>

        <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-10 relative animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search merchants..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-smooth"
          />
        </form>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          </div>
        ) : merchants.length === 0 ? (
          <div className="text-center py-20 text-surface-500">No merchants found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {merchants.map(m => (
              <Link
                key={m.merchant_id}
                to={`/merchants/${m.merchant_id}`}
                className="bg-white rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-smooth group animate-fade-in-up"
              >
                <div className="h-36 bg-gradient-to-br from-primary-500 to-primary-700 relative">
                  <div className="absolute bottom-0 left-5 translate-y-1/2 w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-2xl">
                    🏪
                  </div>
                </div>
                <div className="pt-10 p-5">
                  <h3 className="font-semibold text-lg text-surface-900 group-hover:text-primary-600 transition-smooth">
                    {m.business_name}
                  </h3>
                  <p className="text-sm text-surface-500 mt-1 line-clamp-2">{m.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-surface-400">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {m.address || 'N/A'}</span>
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full">
                      {m.category_name || 'General'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantsPage;
