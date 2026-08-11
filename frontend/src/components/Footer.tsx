import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-surface-900 text-surface-200 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-white">Servanta</span>
            </div>
            <p className="text-surface-400 text-sm leading-relaxed">
              Connecting Services. Creating Opportunities. Your trusted marketplace for professional services.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/services" className="text-surface-400 hover:text-primary-400 transition-smooth">Browse Services</Link></li>
              <li><Link to="/merchants" className="text-surface-400 hover:text-primary-400 transition-smooth">Find Merchants</Link></li>
              <li><Link to="/categories" className="text-surface-400 hover:text-primary-400 transition-smooth">Categories</Link></li>
            </ul>
          </div>

          {/* For Business */}
          <div>
            <h4 className="text-white font-semibold mb-4">For Business</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/register" className="text-surface-400 hover:text-primary-400 transition-smooth">Become a Merchant</Link></li>
              <li><Link to="/merchant/dashboard" className="text-surface-400 hover:text-primary-400 transition-smooth">Merchant Dashboard</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="text-surface-400">help@servanta.com</span></li>
              <li><span className="text-surface-400">+91 98765 43210</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-surface-700 pt-6 text-center">
          <p className="text-surface-500 text-sm">&copy; {new Date().getFullYear()} Servanta. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
