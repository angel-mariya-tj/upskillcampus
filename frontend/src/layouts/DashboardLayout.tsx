import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Store, Package, CalendarCheck, DollarSign, Heart,
  LogOut, Bell, ChevronLeft, ChevronRight, FileText, Search, Star
} from 'lucide-react';
import { useState } from 'react';

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface DashboardLayoutProps {
  role: 'Admin' | 'Merchant' | 'Customer';
}

const DashboardLayout = ({ role }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const sidebarItems: Record<string, SidebarItem[]> = {
    Admin: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
      { label: 'Explore Services', path: '/services', icon: <Search size={20} /> },
      { label: 'Users', path: '/admin/users', icon: <Store size={20} /> },
      { label: 'Merchants', path: '/admin/merchants', icon: <Package size={20} /> },
      { label: 'Categories', path: '/admin/categories', icon: <Store size={20} /> },
      { label: 'Bookings', path: '/admin/bookings', icon: <CalendarCheck size={20} /> },
      { label: 'Payments', path: '/admin/payments', icon: <DollarSign size={20} /> },
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: <FileText size={20} /> },
    ],
    Merchant: [
      { label: 'Dashboard', path: '/merchant/dashboard', icon: <LayoutDashboard size={20} /> },
      { label: 'Explore Services', path: '/services', icon: <Search size={20} /> },
      { label: 'Profile', path: '/merchant/profile', icon: <Store size={20} /> },
      { label: 'Services', path: '/merchant/services', icon: <Package size={20} /> },
      { label: 'Bookings', path: '/merchant/bookings', icon: <CalendarCheck size={20} /> },
      { label: 'Earnings', path: '/merchant/earnings', icon: <DollarSign size={20} /> },
    ],
    Customer: [
      { label: 'Dashboard', path: '/customer/dashboard', icon: <LayoutDashboard size={20} /> },
      { label: 'Explore Services', path: '/services', icon: <Search size={20} /> },
      { label: 'My Bookings', path: '/customer/bookings', icon: <CalendarCheck size={20} /> },
      { label: 'My Favorites', path: '/customer/favorites', icon: <Heart size={20} /> },
      { label: 'My Reviews', path: '/customer/reviews', icon: <Star size={20} /> },
      { label: 'Payments', path: '/customer/payments', icon: <DollarSign size={20} /> },
    ],
  };

  const items = sidebarItems[role] || [];

  return (
    <div className="min-h-screen flex bg-surface-50">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-40 bg-surface-900 text-white flex flex-col transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-16 border-b border-surface-700">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold">S</span>
          </div>
          {!collapsed && <span className="text-lg font-bold">Servanta</span>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 mx-2 mb-1 rounded-xl transition-smooth ${
                location.pathname === item.path
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-surface-400 hover:bg-surface-800 hover:text-white'
              }`}
            >
              {item.icon}
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="border-t border-surface-700 p-3">
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="flex items-center gap-3 w-full px-3 py-2 text-surface-400 hover:text-red-400 rounded-xl hover:bg-surface-800 transition-smooth"
          >
            <LogOut size={20} />
            {!collapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center shadow-lg hover:bg-primary-500 transition-smooth"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Top Bar */}
        <header className="glass h-16 flex items-center justify-between px-6 border-b border-surface-200 sticky top-0 z-30">
          <h2 className="text-lg font-semibold text-surface-800">{role} Panel</h2>
          <div className="flex items-center gap-4">
            <button className="p-2 text-surface-600 hover:text-primary-600 transition-smooth relative">
              <Bell size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <span className="text-white text-sm font-semibold">{user?.name[0]}</span>
              </div>
              {!collapsed && <span className="text-sm font-medium text-surface-700 hidden sm:block">{user?.name}</span>}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
