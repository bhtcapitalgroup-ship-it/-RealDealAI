import { useState } from 'react';
import { Play, Pause, AlertTriangle, CheckCircle2, XCircle, Clock, Database, Zap, RefreshCw, Settings } from 'lucide-react';

interface ScraperSource {
  id: string; name: string; status: 'running' | 'idle' | 'error';
  lastRun: string; propertiesFound: number; successRate: number; avgResponseTime: number; nextRun: string;
}

const scraperSources: ScraperSource[] = [
  { id: 'zillow', name: 'Zillow', status: 'idle', lastRun: '12 min ago', propertiesFound: 1248320, successRate: 99.2, avgResponseTime: 340, nextRun: '18 min' },
  { id: 'redfin', name: 'Redfin', status: 'running', lastRun: 'Running now', propertiesFound: 892410, successRate: 98.7, avgResponseTime: 280, nextRun: 'In progress' },
  { id: 'realtor', name: 'Realtor.com', status: 'error', lastRun: '2 hrs ago', propertiesFound: 312500, successRate: 45.3, avgResponseTime: 2300, nextRun: 'Paused' },
  { id: 'rentometer', name: 'Rentometer', status: 'idle', lastRun: '35 min ago', propertiesFound: 0, successRate: 97.8, avgResponseTime: 180, nextRun: '25 min' },
  { id: 'public_records', name: 'Public Records', status: 'idle', lastRun: '1 hr ago', propertiesFound: 456200, successRate: 99.9, avgResponseTime: 120, nextRun: '2 hrs' },
];

interface RunHistory {
  id: string; source: string; startedAt: string; duration: string; status: 'success' | 'partial' | 'failed'; propertiesFound: number; errors: number;
}

const runHistory: RunHistory[] = Array.from({ length: 50 }, (_, i) => {
  const sources = ['Zillow', 'Redfin', 'Realtor.com', 'Rentometer', 'Public Records'];
  const statuses: RunHistory['status'][] = ['success', 'success', 'success', 'partial', 'failed'];
  return {
    id: `run_${i + 1}`, source: sources[i % 5], startedAt: `${Math.floor(i * 0.5)} hrs ago`,
    duration: `${Math.floor(Math.random() * 10) + 1}m ${Math.floor(Math.random() * 59)}s`,
    status: i === 2 ? 'failed' : statuses[i % 5],
    propertiesFound: i === 2 ? 0 : Math.floor(Math.random() * 5000) + 100,
    errors: i === 2 ? 142 : Math.floor(Math.random() * 5),
  };
});

const errorLogs = [
  { time: '2 hrs ago', source: 'Realtor.com', message: 'HTTP 429 Too Many Requests — rate limit exceeded after 4,200 requests', severity: 'error' as const },
  { time: '2 hrs ago', source: 'Realtor.com', message: 'Retry backoff exhausted after 5 attempts', severity: 'error' as const },
  { time: '6 hrs ago', source: 'Zillow', message: 'Timeout on page 342 — retried successfully', severity: 'warning' as const },
  { time: '1 day ago', source: 'Redfin', message: 'HTML structure change detected on listing page — parser updated', severity: 'warning' as const },
];

export default function AdminScrapersPage() {
  const [showHistory, setShowHistory] = useState(15);
  const [configOpen, setConfigOpen] = useState(false);

  const statusIcon = (status: ScraperSource['status']) => {
    if (status === 'running') return <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />;
    if (status === 'idle') return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    return <XCircle className="w-5 h-5 text-red-400" />;
  };

  const statusBadge = (status: ScraperSource['status']) => {
    const m = { running: 'bg-blue-500/20 text-blue-400 border-blue-500/30', idle: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', error: 'bg-red-500/20 text-red-400 border-red-500/30' };
    return m[status];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">Scraper Dashboard</h1>
        <button onClick={() => setConfigOpen(!configOpen)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors">
          <Settings className="w-4 h-4" /> Configuration
        </button>
      </div>

      {configOpen && (
        <div className="bg-[#111827] border border-zinc-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">Scrape Configuration</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Scrape Frequency</label>
              <select className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option>Every 30 minutes</option><option>Every hour</option><option>Every 2 hours</option><option>Every 6 hours</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Target Markets</label>
              <input type="text" defaultValue="All US Metros" className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Rate Limit (req/min)</label>
              <input type="number" defaultValue={100} className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <button className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-500 transition-colors">Save Configuration</button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {scraperSources.map((src) => (
          <div key={src.id} className="bg-[#111827] border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">{statusIcon(src.status)}<h3 className="text-sm font-semibold text-white">{src.name}</h3></div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusBadge(src.status)}`}>{src.status}</span>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between"><span className="text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Last run</span><span className="text-zinc-300">{src.lastRun}</span></div>
              <div className="flex items-center justify-between"><span className="text-zinc-500 flex items-center gap-1"><Database className="w-3 h-3" /> Properties</span><span className="text-zinc-300">{src.propertiesFound.toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span className="text-zinc-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Success rate</span><span className={src.successRate >= 90 ? 'text-emerald-400' : 'text-red-400'}>{src.successRate}%</span></div>
              <div className="flex items-center justify-between"><span className="text-zinc-500 flex items-center gap-1"><Zap className="w-3 h-3" /> Avg response</span><span className={src.avgResponseTime > 1000 ? 'text-amber-400' : 'text-zinc-300'}>{src.avgResponseTime}ms</span></div>
            </div>
            <button className={`mt-4 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${src.status === 'running' ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25' : 'bg-amber-600/15 text-amber-400 hover:bg-amber-600/25'}`}>
              {src.status === 'running' ? <><Pause className="w-3 h-3" /> Stop</> : <><Play className="w-3 h-3" /> Run Now</>}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-[#111827] border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Run History</h2>
          <span className="text-xs text-zinc-500">Last 50 runs</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-zinc-800">
              <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Source</th>
              <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Started</th>
              <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Duration</th>
              <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Status</th>
              <th className="text-right text-xs font-medium text-zinc-500 px-4 py-3">Properties</th>
              <th className="text-right text-xs font-medium text-zinc-500 px-4 py-3">Errors</th>
            </tr></thead>
            <tbody>
              {runHistory.slice(0, showHistory).map((run) => (
                <tr key={run.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="px-4 py-2.5 text-sm text-white">{run.source}</td>
                  <td className="px-4 py-2.5 text-sm text-zinc-400">{run.startedAt}</td>
                  <td className="px-4 py-2.5 text-sm text-zinc-400">{run.duration}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${run.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : run.status === 'partial' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{run.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-zinc-300 text-right">{run.propertiesFound.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-sm text-right"><span className={run.errors > 0 ? 'text-red-400' : 'text-zinc-500'}>{run.errors}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showHistory < runHistory.length && (
          <button onClick={() => setShowHistory((h) => Math.min(h + 15, runHistory.length))} className="w-full py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/30 transition-colors border-t border-zinc-800">Show more</button>
        )}
      </div>

      <div className="bg-[#111827] border border-zinc-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4"><AlertTriangle className="w-4 h-4 text-amber-400" /> Error Log</h2>
        <div className="space-y-3">
          {errorLogs.map((log, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${log.severity === 'error' ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
              {log.severity === 'error' ? <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5"><span className="text-xs font-semibold text-zinc-300">{log.source}</span><span className="text-[10px] text-zinc-600">{log.time}</span></div>
                <p className="text-xs text-zinc-400 font-mono">{log.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
