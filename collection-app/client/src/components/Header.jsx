import { Link, useLocation } from 'react-router-dom';
import { Home, Table2, History, Users, LogOut, IndianRupee, ShieldCheck, User } from 'lucide-react';
import useCollectionStore from '../store/useCollectionStore';

export default function Header() {
  const location = useLocation();
  const { stats, username, role, societyName, logout } = useCollectionStore();

  const isAdmin = role === 'admin';

  const navLinks = [
    { to: '/', label: 'Home', icon: Home, show: true },
    { to: '/records', label: 'Records', icon: Table2, show: true },
    { to: '/history', label: 'History', icon: History, show: true },
    { to: '/users', label: 'Collectors', icon: Users, show: isAdmin },
  ].filter((item) => item.show);

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Dynamic Society Title */}
          <Link to="/" className="flex items-center gap-2 text-white">
            <span className="text-2xl">🕉</span>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold leading-tight truncate max-w-[200px]">
                {societyName || 'GovindaNagar'}
              </h1>
              <p className="text-[10px] text-orange-100 leading-tight -mt-0.5">
                Vinayaka Chavithi 2026
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white/20 text-white shadow-inner'
                      : 'text-orange-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Stats Badge & User Profile */}
          <div className="flex items-center gap-3">
            {/* Live Total Badge */}
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
              <IndianRupee size={14} className="text-yellow-200" />
              <span className="text-white font-bold text-sm">
                {stats.total.toLocaleString('en-IN')}
              </span>
              <span className="text-orange-200 text-xs ml-1 hidden sm:inline">
                ({stats.count})
              </span>
            </div>

            {/* User Profile & Role */}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-white text-xs font-semibold leading-tight">{username}</span>
                <span className="text-[10px] text-orange-200 flex items-center gap-0.5">
                  {isAdmin ? <ShieldCheck size={10} /> : <User size={10} />}
                  {role ? role.toUpperCase() : 'USER'}
                </span>
              </div>

              <button
                onClick={logout}
                className="p-2 rounded-lg text-orange-200 hover:bg-white/10 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
