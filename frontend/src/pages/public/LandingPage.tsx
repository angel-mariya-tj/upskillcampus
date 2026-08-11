import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Clock, Star, Zap, Users, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../../services/api';

const LandingPage = () => {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data.data || [])).catch(() => {});
  }, []);

  const features = [
    { icon: <Shield size={28} />, title: 'Verified Professionals', desc: 'All merchants are reviewed and approved before listing.' },
    { icon: <Clock size={28} />, title: 'Easy Scheduling', desc: 'Book appointments at your convenience with real-time availability.' },
    { icon: <Star size={28} />, title: 'Ratings & Reviews', desc: 'Make informed decisions with genuine customer feedback.' },
    { icon: <Zap size={28} />, title: 'Instant Booking', desc: 'Seamless booking and payment process in just a few clicks.' },
  ];

  const stats = [
    { icon: <Users size={24} />, value: '500+', label: 'Service Providers' },
    { icon: <Star size={24} />, value: '10K+', label: 'Happy Customers' },
    { icon: <TrendingUp size={24} />, value: '25K+', label: 'Bookings Completed' },
  ];

  const categoryIcons: Record<string, string> = {
    'Home Services': '🏠',
    'Beauty Services': '💇',
    'Pet Care': '🐾',
    'Repair Services': '🔧',
    'Cleaning Services': '🧹',
    'Professional Services': '💼',
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-400 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 lg:py-40">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-block px-4 py-1.5 mb-6 text-xs font-semibold tracking-wider text-primary-200 bg-white/10 backdrop-blur rounded-full uppercase animate-fade-in-up">
              Multi-tenant Service Marketplace
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              Connecting Services.
              <br />
              <span className="bg-gradient-to-r from-accent-400 to-yellow-300 bg-clip-text text-transparent">
                Creating Opportunities.
              </span>
            </h1>
            <p className="text-lg text-primary-100 mb-10 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              Discover trusted professionals for every need — from home repairs to beauty services.
              Book, pay, and review — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary-700 font-semibold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-smooth"
              >
                Explore Services <ArrowRight size={18} />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-smooth"
              >
                Join as Merchant
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative -mt-12 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="glass rounded-2xl shadow-xl p-8 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="flex items-center gap-4 justify-center animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-surface-900">{stat.value}</p>
                  <p className="text-sm text-surface-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-surface-900 mb-3">Browse by Category</h2>
            <p className="text-surface-500 max-w-xl mx-auto">Find the right service provider for your needs from our wide range of categories.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 stagger-children">
            {categories.map((cat) => (
              <Link
                key={cat.category_id}
                to={`/services?categoryId=${cat.category_id}`}
                className="gradient-card rounded-2xl p-6 text-center hover:shadow-xl hover:-translate-y-1 transition-smooth group animate-fade-in-up"
              >
                <div className="text-4xl mb-3">{categoryIcons[cat.category_name] || '📦'}</div>
                <h3 className="font-semibold text-surface-800 text-sm group-hover:text-primary-600 transition-smooth">
                  {cat.category_name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-surface-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-surface-900 mb-3">Why Choose Servanta?</h2>
            <p className="text-surface-500 max-w-xl mx-auto">A platform built for trust, convenience, and excellence.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-7 hover:shadow-xl hover:-translate-y-1 transition-smooth animate-fade-in-up"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center mb-5">
                  {feat.icon}
                </div>
                <h3 className="font-semibold text-surface-900 mb-2">{feat.title}</h3>
                <p className="text-sm text-surface-500 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-hero">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to grow your business?</h2>
          <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of service providers already thriving on Servanta. List your services, reach new customers, and manage your business effortlessly.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary-700 font-semibold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-smooth"
          >
            Get Started Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
