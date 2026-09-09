import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Home,
  Table2,
  Calculator,
  History,
  Users,
  LogOut,
  IndianRupee,
  ShieldCheck,
  User,
  Building2,
  MapPin,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Wallet,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import useCollectionStore from '../store/useCollectionStore';

export default function Header() {
  const location = useLocation();
  const { stats, username, role, societyName, city, state, logout } = useCollectionStore();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isAdmin = role === 'admin';

  // Close drawer on route change or ESC key
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Primary Quick Navigation for Header Bar (clean & non-cluttered)
  const primaryHeaderLinks = [
    { to: '/', label: 'Home', icon: Home, show: true },
    { to: '/doorstep', label: '⚡ Fast Collect', icon: Sparkles, show: true },
    { to: '/records', label: 'Records', icon: Table2, show: true },
    { to: '/expenses', label: 'Expenses', icon: Calculator, show: true },
  ].filter((item) => item.show);

  // Full Feature Sections for the Flyout Side Menu Drawer
  const menuCategories = [
    {
      category: 'Core Operations',
      items: [
        {
          to: '/doorstep',
          label: 'Doorstep 5-Sec Collector',
          description: 'High-speed mobile mode for volunteers with instant UPI QR and WhatsApp receipt',
          icon: Sparkles,
          color: 'text-amber-500 bg-amber-100',
          show: true,
          badge: '5s Loop',
        },
        {
          to: '/',
          label: 'Dashboard & Overview',
          description: 'Live fund counters, quick donor entry & live feed',
          icon: Home,
          color: 'text-orange-500 bg-orange-100',
          show: true,
        },
        {
          to: '/records',
          label: 'Donor Records & Receipts',
          description: 'Search, filter, edit & manage all donor contributions',
          icon: Table2,
          color: 'text-amber-600 bg-amber-100',
          show: true,
        },
      ],
    },
    {
      category: 'Financial Management',
      items: [
        {
          to: '/expenses',
          label: 'Expenses & Budget Deductions',
          description: 'Calculate festival costs, deductions & surplus balance',
          icon: Calculator,
          color: 'text-rose-500 bg-rose-100',
          show: true,
          badge: 'New',
        },
        {
          to: '/history',
          label: 'Audit Trail & Change Logs',
          description: 'Database-level immutable change snapshots (INSERT/UPDATE/DELETE)',
          icon: History,
          color: 'text-purple-600 bg-purple-100',
          show: true,
        },
      ],
    },
    {
      category: 'Administration & Team',
      items: [
        {
          to: '/users',
          label: 'Collectors & Team Access',
          description: 'Create & manage door-to-door collector credentials',
          icon: Users,
          color: 'text-blue-600 bg-blue-100',
          show: isAdmin,
          badge: 'Admin Only',
        },
      ],
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left: Side Menu Trigger + Logo */}
            <div className="flex items-center gap-3">
              {/* Menu Hamburger Button */}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="p-2 rounded-xl text-white hover:bg-white/15 active:scale-95 transition-all flex items-center justify-center border border-white/20 shadow-sm"
                aria-label="Open Features Menu"
                title="All Features & Side Menu"
              >
                <Menu size={22} />
              </button>

              {/* Logo & Society Header */}
              <Link to="/" className="flex items-center gap-2.5 text-white group">
                <span className="text-2xl transition-transform group-hover:scale-110">🕉</span>
                <div>
                  <h1 className="text-base font-bold leading-tight truncate max-w-[160px] sm:max-w-[220px]">
                    {societyName || 'GovindaNagar'}
                  </h1>
                  <p className="text-[10px] text-orange-100 leading-tight flex items-center gap-1 font-medium">
                    Vinayaka Chavithi 2026
                    {city && <span className="opacity-80">• {city}</span>}
                  </p>
                </div>
              </Link>
            </div>

            {/* Center: Recommended Clean Header Tabs (Desktop) */}
            <nav className="hidden md:flex items-center gap-1.5 bg-black/10 p-1 rounded-xl backdrop-blur-sm border border-white/10">
              {primaryHeaderLinks.map(({ to, label, icon: Icon }) => {
                const isActive = location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-orange-700 shadow-sm'
                        : 'text-white/90 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: Live Total Badge & Profile */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Live Total Badge */}
              <Link
                to="/expenses"
                title="Click to view Expenses & Net Balance"
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20 transition-all text-white"
              >
                <IndianRupee size={14} className="text-yellow-200" />
                <span className="font-bold text-xs sm:text-sm">
                  {stats.total.toLocaleString('en-IN')}
                </span>
                <span className="text-orange-200 text-xs hidden sm:inline">
                  ({stats.count})
                </span>
              </Link>

              {/* User Avatar / Profile */}
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex flex-col items-end text-right text-white">
                  <span className="text-xs font-bold leading-tight">{username}</span>
                  <span className="text-[10px] text-orange-200 flex items-center gap-0.5 font-medium">
                    {isAdmin ? <ShieldCheck size={10} /> : <User size={10} />}
                    {role ? role.toUpperCase() : 'USER'}
                  </span>
                </div>

                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-orange-100 hover:text-white hover:bg-white/15 transition-all"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Slide-Out Side Menu Drawer & Backdrop Overlay ── */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Dark Backdrop */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Side Drawer Panel */}
          <div className="absolute inset-y-0 left-0 max-w-full flex">
            <div className="w-screen max-w-sm bg-white shadow-2xl flex flex-col justify-between transform transition-transform animate-in slide-in-from-left duration-300">
              
              {/* Drawer Top / Header */}
              <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-500 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🕉</span>
                    <div>
                      <h2 className="text-base font-bold leading-tight">Feature Directory</h2>
                      <p className="text-xs text-orange-100">Vinayaka Chavithi Chandas</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Society & User Badge Info inside Drawer */}
                <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Building2 size={13} className="text-orange-200" />
                    <span className="font-semibold">{societyName || 'GovindaNagar'}</span>
                    {city && <span className="opacity-80">({city})</span>}
                  </div>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full font-bold uppercase text-[10px] tracking-wider">
                    {role}
                  </span>
                </div>
              </div>

              {/* Drawer Navigation Menu Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {menuCategories.map((cat) => {
                  const visibleItems = cat.items.filter((item) => item.show);
                  if (visibleItems.length === 0) return null;

                  return (
                    <div key={cat.category} className="space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-2">
                        {cat.category}
                      </p>
                      <div className="space-y-1">
                        {visibleItems.map((item) => {
                          const isActive = location.pathname === item.to;
                          const Icon = item.icon;

                          return (
                            <Link
                              key={item.to}
                              to={item.to}
                              className={`w-full flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                                isActive
                                  ? 'bg-orange-50 text-orange-900 border border-orange-200 shadow-xs'
                                  : 'hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              <div className={`p-2 rounded-lg ${item.color} flex-shrink-0 mt-0.5`}>
                                <Icon size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-sm font-bold text-gray-800 truncate">
                                    {item.label}
                                  </span>
                                  {item.badge && (
                                    <span className="text-[10px] font-extrabold bg-orange-500 text-white px-1.5 py-0.2 rounded-md">
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 leading-snug line-clamp-2 mt-0.5">
                                  {item.description}
                                </p>
                              </div>
                              <ChevronRight size={16} className="text-gray-300 self-center" />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Drawer Footer with Quick Stats & Logout */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-600 bg-white p-2.5 rounded-xl border border-gray-200">
                  <span className="flex items-center gap-1 font-medium">
                    <Wallet size={14} className="text-orange-500" />
                    Gross Total:
                  </span>
                  <span className="font-bold text-gray-900">
                    ₹{stats.total.toLocaleString('en-IN')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-all border border-red-200"
                >
                  <LogOut size={16} />
                  <span>Logout from {username}</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
