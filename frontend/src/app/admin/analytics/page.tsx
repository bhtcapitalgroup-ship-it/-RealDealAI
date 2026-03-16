import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, TrendingUp, Search } from 'lucide-react';

const engagementData = [
  { date: 'W1', dau: 3200, wau: 7800, mau: 11200 }, { date: 'W2', dau: 3400, wau: 8100, mau: 11500 },
  { date: 'W3', dau: 3100, wau: 7900, mau: 11400 }, { date: 'W4', dau: 3600, wau: 8400, mau: 11800 },
  { date: 'W5', dau: 3900, wau: 8800, mau: 12100 }, { date: 'W6', dau: 4100, wau: 9200, mau: 12400 },
  { date: 'W7', dau: 3800, wau: 9000, mau: 12300 }, { date: 'W8', dau: 4300, wau: 9600, mau: 12847 },
];

const popularMarkets = [
  { market: 'Austin, TX', searches: 8420 }, { market: 'Miami, FL', searches: 7230 },
  { market: 'Phoenix, AZ', searches: 6810 }, { market: 'Atlanta, GA', searches: 5920 },
  { market: 'Nashville, TN', searches: 5340 }, { market: 'Denver, CO', searches: 4890 },
  { market: 'Charlotte, NC', searches: 4210 }, { market: 'Dallas, TX', searches: 3980 },
];
const marketColors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#e0c4ff', '#ede9fe'];

const searchPatterns = [
  { term: 'multifamily under $500K', count: 3240 }, { term: 'cap rate > 8%', count: 2890 },
  { term: 'cash flow positive', count: 2450 }, { term: 'foreclosures near me', count: 2120 },
  { term: 'BRRRR strategy deals', count: 1840 }, { term: 'duplex 10% ROI', count: 1620 },
];

const conversionFunnel = [
  { stage: 'Visitors', count: 48000, pct: 100, color: '#3b82f6' },
  { stage: 'Free Signup', count: 12847, pct: 26.8, color: '#6366f1' },
  { stage: 'Active Free', count: 8200, pct: 17.1, color: '#8b5cf6' },
  { stage: 'Pro', count: 2680, pct: 5.6, color: '#f59e0b' },
  { stage: 'Pro+', count: 538, pct: 1.1, color: '#ef4444' },
];

const featureUsage = [
  { feature: 'Deal Search', usage: 92 }, { feature: 'Property Details', usage: 78 },
  { feature: 'AI Summaries', usage: 64 }, { feature: 'Deal Alerts', usage: 52 },
  { feature: 'CSV Export', usage: 38 }, { feature: 'Portfolio Reports', usage: 22 },
  { feature: 'API Access', usage: 8 },
];

const retentionCohorts = [
  { cohort: 'Jan 2026', m0: 100, m1: 72, m2: 58, m3: 45, m4: 38, m5: 34 },
  { cohort: 'Feb 2026', m0: 100, m1: 75, m2: 61, m3: 48, m4: 40, m5: null },
  { cohort: 'Mar 2026', m0: 100, m1: 78, m2: 63, m3: null, m4: null, m5: null },
];

export default function AdminAnalyticsPage() {
  const [engagementMetric, setEngagementMetric] = useState<'dau' | 'wau' | 'mau'>('dau');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Analytics</h1>

      <div className="bg-[#111827] border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /> User Engagement</h2>
          <div className="flex gap-1 bg-zinc-800 rounded-lg p-0.5">
            {(['dau', 'wau', 'mau'] as const).map((m) => (
              <button key={m} onClick={() => setEngagementMetric(m)} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${engagementMetric === m ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'}`}>{m.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}K`} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} labelStyle={{ color: '#9ca3af' }} />
              <Line type="monotone" dataKey={engagementMetric} stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-purple-400" /> Popular Markets</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={popularMarkets} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}K`} />
                <YAxis type="category" dataKey="market" tick={{ fill: '#d1d5db', fontSize: 11 }} width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} formatter={(value: number) => [`${value.toLocaleString()} searches`, 'Searches']} />
                <Bar dataKey="searches" radius={[0, 4, 4, 0]}>
                  {popularMarkets.map((_, i) => <Cell key={i} fill={marketColors[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#111827] border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4"><Search className="w-4 h-4 text-cyan-400" /> Top Search Patterns</h2>
          <div className="space-y-3">
            {searchPatterns.map((sp, i) => {
              const pct = (sp.count / searchPatterns[0].count) * 100;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-300">{sp.term}</span>
                    <span className="text-xs text-zinc-500">{sp.count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-zinc-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-6">Conversion Funnel</h2>
        <div className="flex items-end justify-between gap-2 max-w-3xl mx-auto">
          {conversionFunnel.map((stage) => (
            <div key={stage.stage} className="flex-1 flex flex-col items-center">
              <p className="text-xs text-zinc-500 mb-1">{stage.pct}%</p>
              <div className="w-full rounded-t-lg transition-all" style={{ height: `${(stage.pct / 100) * 200}px`, minHeight: 20, backgroundColor: stage.color, opacity: 0.8 }} />
              <p className="text-xs font-medium text-white mt-2 text-center">{stage.stage}</p>
              <p className="text-[10px] text-zinc-500">{stage.count.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Feature Usage</h2>
          <div className="space-y-3">
            {featureUsage.map((f) => (
              <div key={f.feature}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-zinc-300">{f.feature}</span>
                  <span className="text-xs font-medium text-zinc-400">{f.usage}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${f.usage}%`, background: `linear-gradient(90deg, #f59e0b ${f.usage}%, transparent)` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111827] border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Retention Cohorts</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs font-medium text-zinc-500 pb-2 pr-4">Cohort</th>
                  {['M0', 'M1', 'M2', 'M3', 'M4', 'M5'].map((m) => <th key={m} className="text-center text-xs font-medium text-zinc-500 pb-2 w-14">{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {retentionCohorts.map((row) => (
                  <tr key={row.cohort} className="border-b border-zinc-800/50">
                    <td className="py-2 pr-4 text-sm text-zinc-300">{row.cohort}</td>
                    {[row.m0, row.m1, row.m2, row.m3, row.m4, row.m5].map((val, i) => (
                      <td key={i} className="py-2 text-center">
                        {val != null ? (
                          <span className="inline-block w-10 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `rgba(245, 158, 11, ${val / 150})`, color: val > 50 ? '#fff' : '#d4d4d8' }}>{val}%</span>
                        ) : <span className="text-xs text-zinc-700">--</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
