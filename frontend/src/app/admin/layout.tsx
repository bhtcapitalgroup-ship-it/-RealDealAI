import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Bot, BarChart3, Settings,
  ChevronLeft, ChevronRight, LogOut, Shield, Menu,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/admin/users', icon: Users, label: 'Users', end: false },
  { to: '/admin/properties', icon: Building2, label: 'Properties', end: false },
  { to: '/admin/scrapers', icon: Bot, label: 'Scrapers', end: false },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics', end: false },
  { to: '/admin/settings', icon: Settings, label: 'Settings', end: false },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin =
    user &&
    ((user as unknown as Record<string, unknown>).role === 'admin' ||
      (user as unknown as Record<string, unknown>).is_admin === true ||
      user.email?.endsWith('@realdeal.ai'));

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
        <div className="text-center">
          <Shield className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-zinc-400 mb-6">You do not have admin privileges.</p>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-[#0a0f1e]">
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-[#111827] border-r border-zinc-800 transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-60'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center h-16 px-4 border-b border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center font-bold text-sm text-white shrink-0">RD</div>
          {!collapsed && <span className="ml-3 font-semibold text-lg text-white tracking-tight">Admin</span>}
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {adminNav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-amber-600/20 text-amber-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex items-center justify-center h-12 border-t border-zinc-800 text-zinc-500 hover:text-white transition-colors">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-[#111827] border-b border-zinc-800 flex items-center px-4 lg:px-6 gap-4 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg text-zinc-400 hover:bg-zinc-800"><Menu className="w-5 h-5" /></button>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-400">Admin Panel</span>
          </div>
          <div className="flex-1" />
          <button onClick={() => navigate('/dashboard')} className="text-sm text-zinc-400 hover:text-white transition-colors">User Dashboard</button>
          <button onClick={handleLogout} className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"><LogOut className="w-4 h-4" /></button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
