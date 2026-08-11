import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Menu, X, Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'Admin') return '/admin/dashboard';
    if (user.role === 'Merchant') return '/merchant/dashboard';
    return '/customer/dashboard';
  };

  return (
    <nav className="glass fixed top-0 left-0 right-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg group-hover:scale-105 transition-smooth">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              Servanta
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/services" className="text-surface-700 hover:text-primary-600 font-medium transition-smooth">
              Explore Services
            </Link>
            <Link to="/merchants" className="text-surface-700 hover:text-primary-600 font-medium transition-smooth">
              Merchants
            </Link>
            <Link to="/categories" className="text-surface-700 hover:text-primary-600 font-medium transition-smooth">
              Categories
            </Link>

            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/notifications')}
                  className="relative p-2 text-surface-700 hover:text-primary-600 transition-smooth"
                >
                  <Bell size={20} />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-100 transition-smooth"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">{user.name[0]}</span>
                    </div>
                    <span className="text-sm font-medium text-surface-700">{user.name}</span>
                    <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-surface-200 py-2 animate-fade-in-up z-50">
                      <div className="px-4 py-2 border-b border-surface-100">
                        <p className="text-xs text-surface-500">{user.role}</p>
                      </div>
                      <Link
                        to={getDashboardLink()}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-surface-700 hover:bg-surface-50"
                      >
                        <User size={16} /> Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-xl transition-smooth"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-700 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-smooth"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-surface-700">
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-surface-200 mt-2 pt-4 animate-fade-in-up">
            <Link to="/services" onClick={() => setMobileOpen(false)} className="block py-2 text-surface-700 hover:text-primary-600">Explore Services</Link>
            <Link to="/merchants" onClick={() => setMobileOpen(false)} className="block py-2 text-surface-700 hover:text-primary-600">Merchants</Link>
            <Link to="/categories" onClick={() => setMobileOpen(false)} className="block py-2 text-surface-700 hover:text-primary-600">Categories</Link>
            {user ? (
              <>
                <Link to={getDashboardLink()} onClick={() => setMobileOpen(false)} className="block py-2 text-surface-700">Dashboard</Link>
                <button onClick={handleLogout} className="block py-2 text-red-600">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block py-2 text-primary-600">Login</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="block py-2 text-primary-600 font-semibold">Get Started</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
