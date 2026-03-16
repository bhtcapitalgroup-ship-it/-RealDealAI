import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import api from '../lib/api';

const monthlyData = [
  { month: 'Apr', income: 36200, expenses: 10800 }, { month: 'May', income: 37400, expenses: 11200 },
  { month: 'Jun', income: 38100, expenses: 10500 }, { month: 'Jul', income: 37800, expenses: 12800 },
  { month: 'Aug', income: 39200, expenses: 11400 }, { month: 'Sep', income: 39600, expenses: 11900 },
  { month: 'Oct', income: 38800, expenses: 10300 }, { month: 'Nov', income: 40100, expenses: 11600 },
  { month: 'Dec', income: 39500, expenses: 13800 }, { month: 'Jan', income: 40200, expenses: 11800 },
  { month: 'Feb', income: 41000, expenses: 10900 }, { month: 'Mar', income: 41600, expenses: 13500 },
];

const noiData = monthlyData.map((d) => ({ month: d.month, noi: d.income - d.expenses }));

const expenseBreakdown = [
  { name: 'Maintenance', value: 51600, color: '#3b82f6' }, { name: 'Insurance', value: 29500, color: '#8b5cf6' },
  { name: 'Property Tax', value: 36900, color: '#f59e0b' }, { name: 'Management', value: 14750, color: '#ef4444' },
  { name: 'Utilities', value: 14750, color: '#10b981' },
];

const propertyPnL = [
  { property: 'Maple Street Apartments', income: 259200, expenses: 92400, noi: 166800, units: 12 },
  { property: 'Oak Park Townhomes', income: 153600, expenses: 57600, noi: 96000, units: 8 },
  { property: 'Cedar Heights Condo', income: 86400, expenses: 30000, noi: 56400, units: 4 },
];

export default function Financials() {
  useQuery({
    queryKey: ['financials'],
    queryFn: async () => { const res = await api.get('/financials'); return res.data; },
    placeholderData: { monthlyData, noiData, expenseBreakdown, propertyPnL },
  });

  const totalIncome = propertyPnL.reduce((s, p) => s + p.income, 0);
  const totalExpenses = propertyPnL.reduce((s, p) => s + p.expenses, 0);
  const totalNOI = propertyPnL.reduce((s, p) => s + p.noi, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-zinc-900">Financial Reports</h1><p className="text-sm text-zinc-500 mt-1">Last 12 months performance</p></div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"><FileSpreadsheet className="w-4 h-4" />Export CSV</button>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"><Download className="w-4 h-4" />Export PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5"><p className="text-sm text-zinc-500 font-medium">Total Income (12mo)</p><p className="text-2xl font-bold text-zinc-900 mt-1">${totalIncome.toLocaleString()}</p></div>
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5"><p className="text-sm text-zinc-500 font-medium">Total Expenses (12mo)</p><p className="text-2xl font-bold text-zinc-900 mt-1">${totalExpenses.toLocaleString()}</p></div>
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5"><p className="text-sm text-zinc-500 font-medium">Net Operating Income</p><p className="text-2xl font-bold text-emerald-600 mt-1">${totalNOI.toLocaleString()}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-zinc-900 mb-4">Income vs Expenses</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} formatter={(value: any) => [`$${value.toLocaleString()}`, '']} />
              <Legend iconType="circle" iconSize={8} /><Bar dataKey="income" name="Income" fill="#2563eb" radius={[4, 4, 0, 0]} /><Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-zinc-900 mb-4">NOI Trend</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={noiData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} formatter={(value: any) => [`$${value.toLocaleString()}`, '']} />
              <Line type="monotone" dataKey="noi" name="NOI" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-zinc-900 mb-4">Expense Breakdown</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart><Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
              {expenseBreakdown.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
            </Pie><Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} formatter={(value: any) => [`$${value.toLocaleString()}`, '']} /></PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {expenseBreakdown.map((item) => (<div key={item.name} className="flex items-center gap-2 text-xs"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} /><span className="text-zinc-600 truncate">{item.name}</span><span className="ml-auto font-semibold text-zinc-800">${(item.value / 1000).toFixed(0)}k</span></div>))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4"><h2 className="text-base font-semibold text-zinc-900">Property P&L (Annual)</h2><button className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"><FileText className="w-4 h-4" /> Export</button></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-200"><th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Property</th><th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Units</th><th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Income</th><th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Expenses</th><th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">NOI</th><th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Margin</th></tr></thead>
              <tbody>{propertyPnL.map((p) => (<tr key={p.property} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"><td className="py-2.5 px-3 font-medium text-zinc-900">{p.property}</td><td className="py-2.5 px-3 text-right text-zinc-600">{p.units}</td><td className="py-2.5 px-3 text-right text-zinc-700">${p.income.toLocaleString()}</td><td className="py-2.5 px-3 text-right text-zinc-700">${p.expenses.toLocaleString()}</td><td className="py-2.5 px-3 text-right font-semibold text-emerald-600">${p.noi.toLocaleString()}</td><td className="py-2.5 px-3 text-right text-zinc-600">{Math.round((p.noi / p.income) * 100)}%</td></tr>))}</tbody>
              <tfoot><tr className="border-t-2 border-zinc-200 bg-zinc-50 font-semibold"><td className="py-2.5 px-3 text-zinc-900">Total</td><td className="py-2.5 px-3 text-right text-zinc-700">{propertyPnL.reduce((s, p) => s + p.units, 0)}</td><td className="py-2.5 px-3 text-right text-zinc-900">${totalIncome.toLocaleString()}</td><td className="py-2.5 px-3 text-right text-zinc-900">${totalExpenses.toLocaleString()}</td><td className="py-2.5 px-3 text-right text-emerald-600">${totalNOI.toLocaleString()}</td><td className="py-2.5 px-3 text-right text-zinc-700">{Math.round((totalNOI / totalIncome) * 100)}%</td></tr></tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
