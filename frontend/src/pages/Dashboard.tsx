import { useNavigate } from 'react-router-dom';
import {
  Building2, TrendingUp, TrendingDown, DollarSign, Percent, Clock,
  CheckCircle2, AlertCircle, XCircle, Bot, Wrench, Send, Calendar,
  CreditCard, ArrowUpRight, ChevronRight, RefreshCw, CircleDot,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import clsx from 'clsx';
import { formatCurrency } from '@/lib/utils';

// ─── Cash Flow Trend Data ──────────────────────────────────────────────────────
const cashFlowData = [
  { month: 'Oct', income: 34200, expenses: 28100 },
  { month: 'Nov', income: 36800, expenses: 29500 },
  { month: 'Dec', income: 37100, expenses: 30200 },
  { month: 'Jan', income: 35900, expenses: 29800 },
  { month: 'Feb', income: 38400, expenses: 30592 },
  { month: 'Mar', income: 38400, expenses: 30592 },
];

// ─── Expense Breakdown Data ────────────────────────────────────────────────────
const expenseBreakdown = [
  { name: 'Mortgages', value: 19700, color: '#3b82f6' },
  { name: 'Property Tax', value: 4792, color: '#f59e0b' },
  { name: 'Maintenance', value: 4300, color: '#f97316' },
  { name: 'Insurance', value: 1800, color: '#10b981' },
];

// ─── Property Data ─────────────────────────────────────────────────────────────
const properties = [
  {
    id: 'maple-street',
    name: 'Maple Street Apartments',
    address: '742 Maple Street, Brooklyn, NY 11201',
    status: 'warning' as const,
    units: 12,
    occupied: 11,
    monthlyRent: 19700,
    mortgage: 9800,
    insurance: 850,
    tax: 2333,
    maintenance: 2100,
  },
  {
    id: 'oak-park',
    name: 'Oak Park Townhomes',
    address: '1580 Oak Park Ave, Queens, NY 11375',
    status: 'warning' as const,
    units: 8,
    occupied: 7,
    monthlyRent: 14300,
    mortgage: 6500,
    insurance: 600,
    tax: 1583,
    maintenance: 1400,
  },
  {
    id: 'cedar-heights',
    name: 'Cedar Heights Condo',
    address: '320 Cedar Heights Blvd, Bronx, NY 10451',
    status: 'good' as const,
    units: 4,
    occupied: 4,
    monthlyRent: 8800,
    mortgage: 3400,
    insurance: 350,
    tax: 875,
    maintenance: 800,
  },
];

// ─── Activity Feed Data ────────────────────────────────────────────────────────
const activityFeed = [
  { id: 1, icon: 'payment', text: 'Collected $1,800 from James Smith (Unit 3A)', time: '2h ago', property: 'Maple Street Apartments' },
  { id: 2, icon: 'maintenance', text: 'AI diagnosed ceiling leak in Unit 4B — plumbing, urgent', time: '4h ago', property: 'Oak Park Townhomes' },
  { id: 3, icon: 'schedule', text: 'Scheduled ABC Plumbing for Unit 4B — tomorrow 9am', time: '4h ago', property: 'Oak Park Townhomes' },
  { id: 4, icon: 'reminder', text: 'Sent rent reminder to Sarah Williams (Unit 2B)', time: '6h ago', property: 'Oak Park Townhomes' },
  { id: 5, icon: 'payment', text: 'Collected $2,200 from Michael Chen (Unit 7A)', time: '8h ago', property: 'Maple Street Apartments' },
  { id: 6, icon: 'ai', text: 'Answered lease renewal question from Maria Garcia', time: '10h ago', property: 'Cedar Heights Condo' },
  { id: 7, icon: 'payment', text: 'Collected $1,450 from David Park (Unit 1A)', time: '12h ago', property: 'Cedar Heights Condo' },
  { id: 8, icon: 'maintenance', text: 'Approved contractor quote for dishwasher repair ($285)', time: '1d ago', property: 'Maple Street Apartments' },
  { id: 9, icon: 'reminder', text: 'Sent late payment notice to Lisa Wilson (Unit 5B)', time: '1d ago', property: 'Maple Street Apartments' },
  { id: 10, icon: 'ai', text: 'Generated March rent collection summary report', time: '1d ago', property: 'All properties' },
];

function getActivityIcon(type: string) {
  switch (type) {
    case 'payment':
      return <CreditCard className="w-4 h-4 text-emerald-600" />;
    case 'maintenance':
      return <Wrench className="w-4 h-4 text-amber-600" />;
    case 'schedule':
      return <Calendar className="w-4 h-4 text-blue-600" />;
    case 'reminder':
      return <Send className="w-4 h-4 text-purple-600" />;
    case 'ai':
      return <Bot className="w-4 h-4 text-indigo-600" />;
    default:
      return <CircleDot className="w-4 h-4 text-zinc-500" />;
  }
}

function getActivityIconBg(type: string) {
  switch (type) {
    case 'payment': return 'bg-emerald-50';
    case 'maintenance': return 'bg-amber-50';
    case 'schedule': return 'bg-blue-50';
    case 'reminder': return 'bg-purple-50';
    case 'ai': return 'bg-indigo-50';
    default: return 'bg-zinc-100';
  }
}

// ─── Custom Tooltip Components ─────────────────────────────────────────────────
function CashFlowTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const income = payload.find((p: any) => p.dataKey === 'income')?.value ?? 0;
  const expenses = payload.find((p: any) => p.dataKey === 'expenses')?.value ?? 0;
  return (
    <div className="bg-white rounded-lg border border-zinc-200 shadow-lg p-3 text-sm">
      <p className="font-semibold text-zinc-900 mb-1.5">{label} 2026</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-6">
          <span className="text-emerald-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />Income
          </span>
          <span className="font-medium text-zinc-900">{formatCurrency(income)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-red-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400" />Expenses
          </span>
          <span className="font-medium text-zinc-900">{formatCurrency(expenses)}</span>
        </div>
        <div className="border-t border-zinc-100 pt-1 flex items-center justify-between gap-6">
          <span className="text-zinc-600">Cash Flow</span>
          <span className="font-semibold text-emerald-600">{formatCurrency(income - expenses)}</span>
        </div>
      </div>
    </div>
  );
}

function ExpenseTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const total = expenseBreakdown.reduce((s, e) => s + e.value, 0);
  const pct = ((value / total) * 100).toFixed(1);
  return (
    <div className="bg-white rounded-lg border border-zinc-200 shadow-lg p-3 text-sm">
      <p className="font-semibold text-zinc-900">{name}</p>
      <p className="text-zinc-600">{formatCurrency(value)}/mo <span className="text-zinc-400">({pct}%)</span></p>
    </div>
  );
}

// ─── Custom Pie Legend ─────────────────────────────────────────────────────────
function ExpenseLegend({ payload }: any) {
  const total = expenseBreakdown.reduce((s, e) => s + e.value, 0);
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
      {(payload || []).map((entry: any, idx: number) => {
        const item = expenseBreakdown[idx];
        const pct = ((item.value / total) * 100).toFixed(1);
        return (
          <div key={entry.value} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-zinc-600 truncate">{entry.value}</span>
            <span className="text-zinc-400 ml-auto">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Dashboard Component ───────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();

  const totalPortfolioValue = 5680000;
  const totalDebt = 2850000;
  const totalEquity = totalPortfolioValue - totalDebt;
  const monthlyCashFlow = 7808;
  const capRate = 6.8;

  const monthlyRentalIncome = 38400;
  const monthlyMortgages = 19700;
  const monthlyInsurance = 1800;
  const monthlyTax = 4792;
  const monthlyMaintenance = 4300;
  const monthlyNOI = monthlyRentalIncome - monthlyInsurance - monthlyTax - monthlyMaintenance;
  const totalMonthlyExpenses = monthlyMortgages + monthlyInsurance + monthlyTax + monthlyMaintenance;

  const rentCollected = 35450;
  const rentExpected = 38400;
  const rentPending = 1650;
  const rentOverdue = 1300;
  const collectionRate = (rentCollected / rentExpected) * 100;

  return (
    <div className="space-y-6 pb-8">

      {/* ── 1. Portfolio Summary Header ────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-8 py-7">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent" />
        <div className="relative flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Good morning, Jordan</h1>
            <p className="text-sm text-blue-200/80 mt-1.5">
              Mitchell Properties LLC &mdash; 3 Properties, 24 Units
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white/90">March 16, 2026</p>
            <p className="text-xs text-blue-300/60 mt-1 flex items-center justify-end gap-1">
              <RefreshCw className="w-3 h-3" /> Synced 5 min ago
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Primary KPI Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Portfolio Value"
          value={formatCurrency(totalPortfolioValue)}
          badge="+4.2% YoY"
          badgePositive
          icon={<Building2 className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <KpiCard
          label="Total Equity"
          value={formatCurrency(totalEquity)}
          sub={`${formatCurrency(totalDebt)} debt`}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <KpiCard
          label="Monthly Cash Flow"
          value={formatCurrency(monthlyCashFlow)}
          badge="+$620 vs last mo"
          badgePositive
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <KpiCard
          label="Portfolio Cap Rate"
          value={`${capRate}%`}
          badge="Above avg"
          badgePositive
          icon={<Percent className="w-5 h-5 text-indigo-600" />}
          iconBg="bg-indigo-50"
        />
      </div>

      {/* ── 3. Income vs Expenses Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Monthly Rental Income</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{formatCurrency(monthlyRentalIncome)}</p>
          <p className="text-xs text-zinc-400 mt-1.5">22 of 24 units occupied</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Monthly Expenses</p>
          <p className="text-3xl font-bold text-zinc-900 mt-2">{formatCurrency(totalMonthlyExpenses)}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-400 mt-1.5">
            <span>Mortgage {formatCurrency(monthlyMortgages)}</span>
            <span>Tax {formatCurrency(monthlyTax)}</span>
            <span>Maint {formatCurrency(monthlyMaintenance)}</span>
            <span>Ins {formatCurrency(monthlyInsurance)}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Net Operating Income</p>
          <p className="text-3xl font-bold text-zinc-900 mt-2">{formatCurrency(monthlyNOI)}<span className="text-base font-normal text-zinc-400">/mo</span></p>
          <p className="text-xs text-zinc-400 mt-1.5">Before debt service</p>
        </div>
      </div>

      {/* ── 4. Property Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {properties.map((p) => {
          const occupancy = (p.occupied / p.units) * 100;
          const noi = p.monthlyRent - p.insurance - p.tax - p.maintenance;
          const cashFlow = noi - p.mortgage;
          return (
            <button
              key={p.id}
              onClick={() => navigate(`/properties/${p.id}`)}
              className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 text-left hover:shadow-md hover:border-zinc-300 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      'w-2 h-2 rounded-full shrink-0',
                      p.status === 'good' ? 'bg-emerald-500' : 'bg-amber-500'
                    )} />
                    <h3 className="text-sm font-semibold text-zinc-900 truncate">{p.name}</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 truncate">{p.address}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0 mt-0.5" />
              </div>

              {/* Occupancy bar */}
              <div className="mb-3.5">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-zinc-500">{p.occupied}/{p.units} units occupied</span>
                  <span className={clsx(
                    'font-semibold',
                    occupancy === 100 ? 'text-emerald-600' : occupancy >= 90 ? 'text-emerald-600' : 'text-amber-600'
                  )}>{occupancy.toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all',
                      occupancy === 100 ? 'bg-emerald-500' : occupancy >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                    )}
                    style={{ width: `${occupancy}%` }}
                  />
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <StatMini label="Rent" value={formatCurrency(p.monthlyRent)} />
                <StatMini label="Mortgage" value={formatCurrency(p.mortgage)} />
                <StatMini label="NOI" value={formatCurrency(noi)} />
                <StatMini label="Insurance" value={formatCurrency(p.insurance)} />
                <StatMini label="Tax" value={formatCurrency(p.tax)} />
                <StatMini label="Cash Flow" value={formatCurrency(cashFlow)} positive={cashFlow > 0} />
              </div>
            </button>
          );
        })}
      </div>

      {/* ── 5. Charts Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Cash Flow Trend — 3/5 */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Cash Flow Trend</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Last 6 months — income vs expenses</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Income</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" />Expenses</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={cashFlowData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
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
              <Tooltip content={<CashFlowTooltip />} />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#incomeGrad)"
                dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#f87171"
                strokeWidth={2}
                fill="url(#expenseGrad)"
                dot={{ r: 3, fill: '#f87171', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#f87171', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown — 2/5 */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
          <div className="mb-2">
            <h2 className="text-base font-semibold text-zinc-900">Expense Breakdown</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{formatCurrency(totalMonthlyExpenses)}/mo total</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={expenseBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {expenseBreakdown.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ExpenseTooltip />} />
              <Legend content={<ExpenseLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 6. Rent Collection Status ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Rent Collection — March 2026</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{collectionRate.toFixed(1)}% collected</p>
          </div>
          <span className={clsx(
            'text-sm font-semibold px-2.5 py-0.5 rounded-full',
            collectionRate >= 95 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          )}>
            {formatCurrency(rentCollected)} of {formatCurrency(rentExpected)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden flex mb-5">
          <div className="bg-emerald-500 h-full rounded-l-full" style={{ width: `${(rentCollected / rentExpected) * 100}%` }} />
          <div className="bg-amber-400 h-full" style={{ width: `${(rentPending / rentExpected) * 100}%` }} />
          <div className="bg-red-400 h-full rounded-r-full" style={{ width: `${(rentOverdue / rentExpected) * 100}%` }} />
        </div>

        {/* Stat pills */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3.5 py-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <div>
              <p className="text-xs text-emerald-600 font-medium">Collected</p>
              <p className="text-sm font-bold text-emerald-700">{formatCurrency(rentCollected)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3.5 py-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <div>
              <p className="text-xs text-amber-600 font-medium">Pending</p>
              <p className="text-sm font-bold text-amber-700">{formatCurrency(rentPending)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3.5 py-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <div>
              <p className="text-xs text-red-600 font-medium">Overdue</p>
              <p className="text-sm font-bold text-red-700">{formatCurrency(rentOverdue)}</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-zinc-400">
          2 tenants past due — <span className="text-zinc-600">Sarah Williams (Unit 2B, {formatCurrency(rentPending)})</span> and <span className="text-zinc-600">Lisa Wilson (Unit 5B, {formatCurrency(rentOverdue)})</span>
        </p>
      </div>

      {/* ── 7. Recent Activity Feed ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Bot className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Recent Activity</h2>
              <p className="text-xs text-zinc-400">AI-managed actions and events</p>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          {activityFeed.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                getActivityIconBg(item.icon)
              )}>
                {getActivityIcon(item.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-800 truncate">{item.text}</p>
                <p className="text-xs text-zinc-400">{item.property}</p>
              </div>
              <span className="text-xs text-zinc-400 whitespace-nowrap shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, badge, badgePositive, sub, icon, iconBg,
}: {
  label: string;
  value: string;
  badge?: string;
  badgePositive?: boolean;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
        <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', iconBg)}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-zinc-900 leading-none">{value}</p>
      {badge && (
        <span className={clsx(
          'inline-flex items-center gap-1 text-xs font-medium mt-2 px-2 py-0.5 rounded-full',
          badgePositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        )}>
          {badgePositive ? <ArrowUpRight className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {badge}
        </span>
      )}
      {sub && <p className="text-xs text-zinc-400 mt-2">{sub}</p>}
    </div>
  );
}

function StatMini({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-0.5">{label}</p>
      <p className={clsx(
        'text-sm font-semibold',
        positive !== undefined ? (positive ? 'text-emerald-600' : 'text-red-600') : 'text-zinc-900'
      )}>{value}</p>
    </div>
  );
}
