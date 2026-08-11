import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Clock, DollarSign, Heart, Star, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatDuration } from '../../utils/formatters';

const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '') : 'http://localhost:5000';

const ServicesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number }>({
    page: 1, limit: 12, total: 0, totalPages: 1
  });
  const [searchParams, setSearchParams] = useSearchParams();

  // Booking Modal State
  const [bookingService, setBookingService] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingMsg, setBookingMsg] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sortBy = searchParams.get('sortBy') || 'newest';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(search);
  const [minPriceInput, setMinPriceInput] = useState(minPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice);

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data.data || [])).catch(() => {});
  }, []);

  // Fetch user favorites if Customer is logged in
  useEffect(() => {
    if (user && user.role === 'Customer') {
      api.get('/customer/favorites')
        .then(res => {
          const ids = (res.data.data || []).map((f: any) => f.service_id);
          setFavoriteIds(ids);
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const params: any = {};
    if (categoryId) params.categoryId = categoryId;
    if (search) params.search = search;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (sortBy) params.sortBy = sortBy;
    params.page = page;
    params.limit = 12;

    api.get('/services', { params })
      .then(res => {
        setServices(res.data.data || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [categoryId, search, minPrice, maxPrice, sortBy, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('search', searchInput);
  };

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1'); // Reset to page 1 on filter change
    setSearchParams(params);
  };

  const setPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setMinPriceInput('');
    setMaxPriceInput('');
    setSearchParams(new URLSearchParams());
  };

  const toggleFavorite = async (e: React.MouseEvent, serviceId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || user.role !== 'Customer') {
      alert('Please log in as a Customer to save favorites.');
      return;
    }

    const isFav = favoriteIds.includes(serviceId);
    try {
      if (isFav) {
        await api.delete(`/customer/favorites/${serviceId}`);
        setFavoriteIds(prev => prev.filter(id => id !== serviceId));
      } else {
        await api.post(`/customer/favorites/${serviceId}`);
        setFavoriteIds(prev => [...prev, serviceId]);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update favorite status.');
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'Customer') { setBookingMsg('Only customers can book services.'); return; }
    setBookingLoading(true);
    setBookingMsg('');
    try {
      await api.post('/bookings', {
        merchantId: bookingService.merchant_id,
        serviceId: bookingService.service_id,
        bookingDate,
        bookingTime,
      });
      setBookingMsg('Booking created successfully! Check your dashboard.');
      setTimeout(() => {
        setBookingService(null);
        setBookingMsg('');
      }, 1500);
    } catch (err: any) {
      setBookingMsg(err.response?.data?.message || 'Failed to create booking.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in-up">
          <h1 className="text-3xl font-bold text-surface-900 mb-2">Browse Services</h1>
          <p className="text-surface-500">Discover professional services near you</p>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-2xl p-5 mb-8 border border-surface-200 shadow-sm animate-fade-in-up">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative md:col-span-2">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search services..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </form>

            {/* Category Dropdown */}
            <select
              value={categoryId}
              onChange={e => updateParam('categoryId', e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none bg-white text-sm"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={e => updateParam('sortBy', e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none bg-white text-sm font-medium"
            >
              <option value="newest">Sort: Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating_desc">Top Rated</option>
            </select>
          </div>

          {/* Secondary Row: Min/Max Price + Clear Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-surface-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Price Range:</span>
              <input
                type="number"
                placeholder="Min ₹"
                value={minPriceInput}
                onChange={e => setMinPriceInput(e.target.value)}
                onBlur={() => updateParam('minPrice', minPriceInput)}
                className="w-24 px-3 py-1.5 rounded-lg border border-surface-200 text-xs outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-surface-400 text-xs">-</span>
              <input
                type="number"
                placeholder="Max ₹"
                value={maxPriceInput}
                onChange={e => setMaxPriceInput(e.target.value)}
                onBlur={() => updateParam('maxPrice', maxPriceInput)}
                className="w-24 px-3 py-1.5 rounded-lg border border-surface-200 text-xs outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {(search || categoryId || minPrice || maxPrice || sortBy !== 'newest') && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-smooth"
              >
                <RotateCcw size={14} /> Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-surface-200 text-surface-500">
            <p className="text-lg font-medium">No services match your filters.</p>
            <p className="text-sm mt-1 mb-4">Try broadening your search or price range.</p>
            <button onClick={handleClearFilters} className="px-4 py-2 bg-primary-600 text-white text-xs font-medium rounded-xl hover:bg-primary-700 transition-smooth">
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children mb-8">
              {services.map(svc => {
                const isFav = favoriteIds.includes(svc.service_id);
                return (
                  <div
                    key={svc.service_id}
                    className="bg-white rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-smooth group animate-fade-in-up flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-56 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center relative overflow-hidden">
                        {svc.image ? (
                          <img src={svc.image.startsWith('http') ? svc.image : `${API_BASE}${svc.image}`} alt={svc.service_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-5xl opacity-50">🔧</span>
                        )}
                        {user?.role === 'Customer' && (
                          <button
                            onClick={e => toggleFavorite(e, svc.service_id)}
                            className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur rounded-full hover:bg-white transition-smooth"
                            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Heart
                              size={18}
                              className={isFav ? 'text-red-500 fill-red-500' : 'text-surface-400 hover:text-red-500'}
                            />
                          </button>
                        )}
                      </div>
                      <div className="p-5">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-medium px-2.5 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                            {svc.category_name || 'General'}
                          </span>
                          {svc.avg_rating > 0 && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                              <Star size={12} className="fill-amber-500 text-amber-500" /> {svc.avg_rating}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-surface-900 mb-1 group-hover:text-primary-600 transition-smooth">
                          {svc.service_name}
                        </h3>
                        <p className="text-sm text-surface-500 mb-3 line-clamp-2">{svc.description}</p>
                      </div>
                    </div>
                    <div className="p-5 pt-0">
                      <div className="flex items-center justify-between text-sm pt-3 border-t border-surface-100 mb-3">
                        <span className="font-semibold text-primary-600 flex items-center gap-1">
                          <DollarSign size={14} /> ₹{svc.price}
                        </span>
                        <span className="text-surface-400 flex items-center gap-1">
                          <Clock size={14} /> {formatDuration(svc.duration)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Link to={`/merchants/${svc.merchant_id}`} className="text-xs text-surface-500 hover:text-primary-600 hover:underline truncate">
                          by {svc.business_name}
                        </Link>
                        <button
                          onClick={() => setBookingService(svc)}
                          className="px-3.5 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-smooth shrink-0"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-surface-200">
                <span className="text-xs text-surface-500 font-medium">
                  Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} total items)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => setPage(pagination.page - 1)}
                    className="p-2 border border-surface-200 rounded-xl hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition-smooth text-surface-700"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-xs font-semibold px-3 py-1 bg-primary-50 text-primary-700 rounded-lg">
                    {pagination.page}
                  </span>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage(pagination.page + 1)}
                    className="p-2 border border-surface-200 rounded-xl hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition-smooth text-surface-700"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Booking Modal */}
      {bookingService && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
            <h3 className="text-lg font-bold text-surface-900 mb-1">Book: {bookingService.service_name}</h3>
            <p className="text-sm text-surface-500 mb-4">₹{bookingService.price} · {formatDuration(bookingService.duration)} ({bookingService.business_name})</p>
            {bookingMsg && (
              <div className={`mb-4 p-3 rounded-xl text-sm ${bookingMsg.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {bookingMsg}
              </div>
            )}
            <form onSubmit={handleBook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Date</label>
                <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Time</label>
                <input type="time" value={bookingTime} onChange={e => setBookingTime(e.target.value)} required
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setBookingService(null); setBookingMsg(''); }}
                  className="flex-1 py-2.5 border border-surface-200 rounded-xl text-sm font-medium hover:bg-surface-50 transition-smooth">Cancel</button>
                <button type="submit" disabled={bookingLoading}
                  className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-smooth disabled:opacity-60">
                  {bookingLoading ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesPage;
