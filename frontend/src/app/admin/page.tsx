import {
  Users, CreditCard, DollarSign, Building2, Bot,
  TrendingUp, AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const stats = [
  { label: 'Total Users', value: '12,847', change: '+340 this month', icon: Users, color: 'text-blue-400', bg: 'bg-blue-600/15' },
  { label: 'Active Subscribers', value: '3,218', change: '+89 this month', icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-600/15' },
  { label: 'MRR', value: '$186,420', change: '+12.3%', icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-600/15' },
  { label: 'Properties in DB', value: '2.4M', change: '+48K this week', icon: Building2, color: 'text-purple-400', bg: 'bg-purple-600/15' },
  { label: 'Scraper Status', value: '4/5 OK', change: '1 error', icon: Bot, color: 'text-cyan-400', bg: 'bg-cyan-600/15' },
];

const userGrowth = Array.from({ length: 30 }, (_, i) => ({
  day: `Mar ${i + 1}`,
  users: 12000 + Math.floor(Math.random() * 500) + i * 30,
}));

const revenueMonths = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map((m, i) => ({
  month: m,
  revenue: 120000 + i * 6000 + Math.floor(Math.random() * 8000),
}));

const recentSignups = [
  { name: 'Sarah Chen', email: 'sarah@example.com', plan: 'Pro', date: '2 hours ago' },
  { name: 'Marcus Johnson', email: 'marcus@inv.com', plan: 'Free', date: '3 hours ago' },
  { name: 'Emily Rodriguez', email: 'emily@re.io', plan: 'Pro+', date: '5 hours ago' },
  { name: 'David Kim', email: 'david.k@mail.com', plan: 'Pro', date: '6 hours ago' },
  { name: 'Jessica Brown', email: 'jess@brown.co', plan: 'Free', date: '8 hours ago' },
];

const scraperHealth = [
  { name: 'Zillow', status: 'ok' as const, lastRun: '12 min ago', properties: '1.2M' },
  { name: 'Redfin', status: 'ok' as const, lastRun: '8 min ago', properties: '890K' },
  { name: 'Realtor', status: 'error' as const, lastRun: '2 hrs ago', properties: '310K' },
];

const systemAlerts = [
  { type: 'error' as const, message: 'Realtor.com scraper failed: rate limit exceeded', time: '2 hours ago' },
  { type: 'warning' as const, message: 'High API latency detected (avg 2.3s)', time: '4 hours ago' },
  { type: 'info' as const, message: 'Database backup completed successfully', time: '6 hours ago' },
];

export default function AdminOverview() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Admin Overview</h1>
        <span className="text-sm text-zinc-500">Last updated: just now</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-[#111827] border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
              <span className="text-xs text-zinc-500 font-medium">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-zinc-500 mt-1"><span className="text-emerald-400">{s.change}</span></p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-blue-400" />User Growth (Last 30 Days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 10 }} interval={6} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#60a5fa' }} />
                <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#111827] border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4"><DollarSign className="w-4 h-4 text-amber-400" />Revenue (Last 12 Months)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueMonths}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(v) => `$${v / 1000}K`} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} labelStyle={{ color: '#9ca3af' }} formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-[#111827] border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Recent Signups</h2>
          <div className="space-y-3">
            {recentSignups.map((u) => (
              <div key={u.email} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{u.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.plan === 'Pro+' ? 'bg-purple-500/20 text-purple-400' : u.plan === 'Pro' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-700 text-zinc-400'}`}>{u.plan}</span>
                  <p className="text-[10px] text-zinc-600 mt-1">{u.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111827] border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Scraper Health</h2>
          <div className="space-y-4">
            {scraperHealth.map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {s.status === 'ok' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                    {s.status === 'ok' && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-zinc-500">Last run: {s.lastRun}</p>
                  </div>
                </div>
                <span className="text-sm text-zinc-400">{s.properties}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111827] border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">System Alerts</h2>
          <div className="space-y-3">
            {systemAlerts.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                {a.type === 'error' ? <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" /> : a.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm text-zinc-300">{a.message}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
