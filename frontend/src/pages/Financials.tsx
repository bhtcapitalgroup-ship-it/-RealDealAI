import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';

type Period = 'month' | 'quarter' | 'year' | 'all';

const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const incomeValues = [32000, 33500, 34800, 35200, 34200, 36800, 37100, 35900, 37500, 38000, 38400, 38400];
const expenseValues = [27000, 28200, 28800, 29100, 28100, 29500, 30200, 29800, 30000, 30200, 30592, 30592];
const noiValues = [5000, 5300, 6000, 6100, 6100, 7300, 6900, 6100, 7500, 7800, 7808, 7808];

const monthlyData = months.map((month, i) => ({
  month,
  income: incomeValues[i],
  expenses: expenseValues[i],
}));

const noiData = months.map((month, i) => ({
  month,
  noi: noiValues[i],
}));

const expenseCategories = [
  { name: 'Mortgages', value: 19700, pct: 64.4, color: '#475569' },
  { name: 'Property Tax', value: 4792, pct: 15.7, color: '#f59e0b' },
  { name: 'Maintenance', value: 4300, pct: 14.1, color: '#f97316' },
  { name: 'Insurance', value: 1800, pct: 5.9, color: '#10b981' },
];

const expenseByProperty = [
  { property: 'Maple Street', total: 15083, mortgage: 9800, tax: 2333, insurance: 850, maintenance: 2100 },
  { property: 'Oak Park', total: 10183, mortgage: 6500, tax: 1583, insurance: 600, maintenance: 1500 },
  { property: 'Cedar Heights', total: 5325, mortgage: 3400, tax: 875, insurance: 350, maintenance: 700 },
];

const propertyPnL = [
  { property: 'Maple Street', income: 19700, mortgage: 9800, tax: 2333, insurance: 850, maintenance: 2100, totalExp: 15083, noi: 14617, cashFlow: 4617 },
  { property: 'Oak Park', income: 14300, mortgage: 6500, tax: 1583, insurance: 600, maintenance: 1500, totalExp: 10183, noi: 10617, cashFlow: 4117 },
  { property: 'Cedar Heights', income: 8800, mortgage: 3400, tax: 875, insurance: 350, maintenance: 700, totalExp: 5325, noi: 6875, cashFlow: 3475 },
];

const totals = {
  income: 42800,
  mortgage: 19700,
  tax: 4792,
  insurance: 1800,
  maintenance: 4300,
  totalExp: 30592,
  noi: 32108,
  cashFlow: 12208,
};

const stackedColors = {
  mortgage: '#475569',
  tax: '#f59e0b',
  insurance: '#10b981',
  maintenance: '#f97316',
};

export default function Financials() {
  const [period, setPeriod] = useState<Period>('month');

  const periods: { key: Period; label: string }[] = [
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'Quarter' },
    { key: 'year', label: 'Year' },
    { key: 'all', label: 'All Time' },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">Financial Overview</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-zinc-200 rounded-lg p-0.5">
              {periods.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    period === p.key
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors shadow-sm">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-zinc-500">Total Income</p>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(38400)}<span className="text-sm font-normal text-zinc-400">/mo</span></p>
            <p className="text-xs text-zinc-400 mt-1">{formatCurrency(460800)}/yr</p>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-zinc-500">Total Expenses</p>
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(30592)}<span className="text-sm font-normal text-zinc-400">/mo</span></p>
            <p className="text-xs text-zinc-400 mt-1">{formatCurrency(367104)}/yr</p>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-zinc-500">Net Cash Flow</p>
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(7808)}<span className="text-sm font-normal text-zinc-400">/mo</span></p>
            <p className="text-xs text-zinc-400 mt-1">{formatCurrency(93696)}/yr</p>
          </div>
        </div>

        {/* Income vs Expenses Chart */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-zinc-900 mb-4">Income vs Expenses</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                labelStyle={{ fontWeight: 600, color: '#18181b' }}
              />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown — Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Donut */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-zinc-900 mb-4">Expense by Category</h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={expenseCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {expenseCategories.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {expenseCategories.map((item) => (
                <div key={item.name} className="flex items-center gap-2.5 text-sm">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-zinc-600">{item.name}</span>
                  <span className="text-zinc-400 text-xs">({formatPercent(item.pct)})</span>
                  <span className="ml-auto font-semibold text-zinc-800">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Horizontal Stacked Bar */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-zinc-900 mb-4">Expense by Property</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={expenseByProperty} layout="vertical" barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  dataKey="property"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#3f3f46' }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                />
                <Bar dataKey="mortgage" name="Mortgage" stackId="a" fill={stackedColors.mortgage} radius={[0, 0, 0, 0]} />
                <Bar dataKey="tax" name="Tax" stackId="a" fill={stackedColors.tax} />
                <Bar dataKey="insurance" name="Insurance" stackId="a" fill={stackedColors.insurance} />
                <Bar dataKey="maintenance" name="Maintenance" stackId="a" fill={stackedColors.maintenance} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 justify-center flex-wrap">
              {Object.entries(stackedColors).map(([key, color]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Property P&L Table */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-zinc-900 mb-4">Property P&L Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  {['Property', 'Income', 'Mortgage', 'Tax', 'Insurance', 'Maint.', 'Total Exp.', 'NOI', 'Cash Flow'].map((h) => (
                    <th
                      key={h}
                      className={`py-2.5 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider ${
                        h === 'Property' ? 'text-left' : 'text-right'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {propertyPnL.map((row) => (
                  <tr key={row.property} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors">
                    <td className="py-3 px-3 font-medium text-zinc-900">{row.property}</td>
                    <td className="py-3 px-3 text-right text-emerald-600 font-medium">{formatCurrency(row.income)}</td>
                    <td className="py-3 px-3 text-right text-zinc-600">{formatCurrency(row.mortgage)}</td>
                    <td className="py-3 px-3 text-right text-zinc-600">{formatCurrency(row.tax)}</td>
                    <td className="py-3 px-3 text-right text-zinc-600">{formatCurrency(row.insurance)}</td>
                    <td className="py-3 px-3 text-right text-zinc-600">{formatCurrency(row.maintenance)}</td>
                    <td className="py-3 px-3 text-right text-red-500 font-medium">{formatCurrency(row.totalExp)}</td>
                    <td className="py-3 px-3 text-right text-emerald-600 font-semibold">{formatCurrency(row.noi)}</td>
                    <td className={`py-3 px-3 text-right font-semibold ${row.cashFlow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {formatCurrency(row.cashFlow)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-300 bg-zinc-50 font-bold">
                  <td className="py-3 px-3 text-zinc-900">TOTAL</td>
                  <td className="py-3 px-3 text-right text-emerald-600">{formatCurrency(totals.income)}</td>
                  <td className="py-3 px-3 text-right text-zinc-800">{formatCurrency(totals.mortgage)}</td>
                  <td className="py-3 px-3 text-right text-zinc-800">{formatCurrency(totals.tax)}</td>
                  <td className="py-3 px-3 text-right text-zinc-800">{formatCurrency(totals.insurance)}</td>
                  <td className="py-3 px-3 text-right text-zinc-800">{formatCurrency(totals.maintenance)}</td>
                  <td className="py-3 px-3 text-right text-red-500">{formatCurrency(totals.totalExp)}</td>
                  <td className="py-3 px-3 text-right text-emerald-600">{formatCurrency(totals.noi)}</td>
                  <td className="py-3 px-3 text-right text-emerald-600">{formatCurrency(totals.cashFlow)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* NOI Trend Line */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-zinc-900 mb-4">NOI Trend</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={noiData}>
              <defs>
                <linearGradient id="noiGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                formatter={(value: number) => [formatCurrency(value), 'NOI']}
                labelStyle={{ fontWeight: 600, color: '#18181b' }}
              />
              <Area
                type="monotone"
                dataKey="noi"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#noiGradient)"
                dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
