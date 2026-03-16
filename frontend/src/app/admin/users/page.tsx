import { useState, useMemo } from 'react';
import { Search, Download, ChevronDown, ChevronUp, Filter, MoreHorizontal, Mail, Shield, Ban, Eye } from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  tier: 'free' | 'pro' | 'pro_plus';
  signup_date: string;
  deals_viewed: number;
  last_active: string;
  status: 'active' | 'disabled';
}

const mockUsers: AdminUser[] = Array.from({ length: 50 }, (_, i) => {
  const tiers: AdminUser['tier'][] = ['free', 'pro', 'pro_plus'];
  const names = ['Sarah Chen', 'Marcus Johnson', 'Emily Rodriguez', 'David Kim', 'Jessica Brown', 'Alex Turner', 'Priya Patel', 'James Wilson', 'Maria Garcia', 'Chris Lee'];
  return {
    id: `usr_${i + 1}`,
    name: names[i % names.length],
    email: `${names[i % names.length].toLowerCase().replace(' ', '.')}${i > 9 ? i : ''}@example.com`,
    tier: tiers[i % 3],
    signup_date: new Date(2025, 0, 1 + i * 3).toISOString().split('T')[0],
    deals_viewed: Math.floor(Math.random() * 500) + 10,
    last_active: i < 5 ? 'Today' : i < 15 ? 'This week' : i < 30 ? 'This month' : '30+ days ago',
    status: i === 12 ? 'disabled' : 'active',
  };
});

const tierLabel: Record<string, { text: string; cls: string }> = {
  free: { text: 'Free', cls: 'bg-zinc-700 text-zinc-300' },
  pro: { text: 'Pro', cls: 'bg-blue-500/20 text-blue-400' },
  pro_plus: { text: 'Pro+', cls: 'bg-purple-500/20 text-purple-400' },
};

function exportCSV(users: AdminUser[]) {
  const header = 'Name,Email,Tier,Signup Date,Deals Viewed,Last Active,Status\n';
  const rows = users.map((u) => `${u.name},${u.email},${u.tier},${u.signup_date},${u.deals_viewed},${u.last_active},${u.status}`).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'realdeal_users.csv';
  a.click();
  URL.revokeObjectURL(url);
}

type SortKey = 'name' | 'email' | 'tier' | 'signup_date' | 'deals_viewed' | 'last_active';

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('signup_date');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let list = [...mockUsers];
    if (search) { const q = search.toLowerCase(); list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)); }
    if (tierFilter !== 'all') list = list.filter((u) => u.tier === tierFilter);
    list.sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av;
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return list;
  }, [search, tierFilter, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <button onClick={() => exportCSV(filtered)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users by name or email..." className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#111827] border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#111827] border border-zinc-800 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors">
          <Filter className="w-4 h-4" /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 bg-[#111827] border border-zinc-800 rounded-xl p-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Tier</label>
            <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="all">All Tiers</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="pro_plus">Pro+</option>
            </select>
          </div>
        </div>
      )}

      <div className="bg-[#111827] border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                {([['name', 'Name'], ['email', 'Email'], ['tier', 'Tier'], ['signup_date', 'Signup Date'], ['deals_viewed', 'Deals Viewed'], ['last_active', 'Last Active']] as [SortKey, string][]).map(([key, label]) => (
                  <th key={key} onClick={() => toggleSort(key)} className="text-left text-xs font-medium text-zinc-500 px-4 py-3 cursor-pointer hover:text-zinc-300 transition-colors select-none">
                    {label}<SortIcon col={key} />
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <UserRow key={user.id} user={user} expanded={expandedId === user.id} onToggle={() => setExpandedId(expandedId === user.id ? null : user.id)} />
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="py-12 text-center text-zinc-500 text-sm">No users found.</div>}
      </div>
      <p className="text-xs text-zinc-600 text-right">Showing {filtered.length} users</p>
    </div>
  );
}

function UserRow({ user, expanded, onToggle }: { user: AdminUser; expanded: boolean; onToggle: () => void }) {
  const tier = tierLabel[user.tier];
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <tr onClick={onToggle} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-400 text-xs font-semibold shrink-0">
              {user.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <span className="text-sm font-medium text-white">{user.name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-zinc-400">{user.email}</td>
        <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tier.cls}`}>{tier.text}</span></td>
        <td className="px-4 py-3 text-sm text-zinc-400">{user.signup_date}</td>
        <td className="px-4 py-3 text-sm text-zinc-400">{user.deals_viewed.toLocaleString()}</td>
        <td className="px-4 py-3 text-sm text-zinc-400">{user.last_active}</td>
        <td className="px-4 py-3 relative">
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-4 top-full mt-1 w-44 bg-[#1f2937] border border-zinc-700 rounded-lg shadow-xl z-20 py-1">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"><Eye className="w-3.5 h-3.5" /> View details</button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"><Shield className="w-3.5 h-3.5" /> Change tier</button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"><Mail className="w-3.5 h-3.5" /> Send email</button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700"><Ban className="w-3.5 h-3.5" /> Disable account</button>
              </div>
            </>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-zinc-800/20">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-zinc-500 text-xs">User ID</p><p className="text-zinc-300 font-mono text-xs mt-0.5">{user.id}</p></div>
              <div><p className="text-zinc-500 text-xs">Status</p><p className={`text-xs mt-0.5 font-medium ${user.status === 'active' ? 'text-emerald-400' : 'text-red-400'}`}>{user.status}</p></div>
              <div><p className="text-zinc-500 text-xs">Total Deals Viewed</p><p className="text-zinc-300 mt-0.5">{user.deals_viewed.toLocaleString()}</p></div>
              <div><p className="text-zinc-500 text-xs">Signup Date</p><p className="text-zinc-300 mt-0.5">{user.signup_date}</p></div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
