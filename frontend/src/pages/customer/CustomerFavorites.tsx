import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Clock, DollarSign, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { formatDuration } from '../../utils/formatters';

const CustomerFavorites = () => {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    try {
      const res = await api.get('/customer/favorites');
      setFavorites(res.data.data || []);
    } catch {
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleRemoveFavorite = async (serviceId: number) => {
    try {
      await api.delete(`/customer/favorites/${serviceId}`);
      setFavorites(prev => prev.filter(f => f.service_id !== serviceId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove favorite.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Heart className="text-red-500 fill-red-500" size={28} />
        <h1 className="text-2xl font-bold text-surface-900">My Favorites</h1>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-surface-500">
          <p className="text-lg font-medium mb-1">No favorite services saved yet.</p>
          <p className="text-sm mb-4">Browse our service catalog and click the heart icon to save your preferred services!</p>
          <Link to="/services" className="inline-block px-5 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-smooth">
            Explore Services
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {favorites.map(fav => (
            <div key={fav.favorite_id} className="bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-smooth flex flex-col justify-between animate-fade-in-up">
              <div>
                <div className="h-36 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center relative">
                  <span className="text-5xl opacity-50">⭐</span>
                  <button
                    onClick={() => handleRemoveFavorite(fav.service_id)}
                    className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur rounded-full text-red-500 hover:bg-red-50 hover:text-red-600 transition-smooth"
                    title="Remove from favorites"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="p-5">
                  <span className="text-xs font-medium px-2.5 py-0.5 bg-primary-100 text-primary-700 rounded-full mb-2 inline-block">
                    {fav.category_name || 'General'}
                  </span>
                  <h3 className="font-semibold text-surface-900 mb-1">{fav.service_name}</h3>
                  <p className="text-sm text-surface-500 mb-3 line-clamp-2">{fav.description}</p>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-semibold text-primary-600 flex items-center gap-1">
                      <DollarSign size={14} /> ₹{fav.price}
                    </span>
                    <span className="text-surface-400 flex items-center gap-1">
                      <Clock size={14} /> {formatDuration(fav.duration)}
                    </span>
                  </div>
                  <p className="text-xs text-surface-400">by {fav.business_name}</p>
                </div>
              </div>
              <div className="p-5 pt-0">
                <Link
                  to={`/merchants/${fav.merchant_id}`}
                  className="w-full block text-center py-2.5 bg-primary-50 text-primary-700 font-medium rounded-xl hover:bg-primary-100 transition-smooth"
                >
                  View & Book
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerFavorites;
