import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, ChevronUp, Zap, Crown, Rocket } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';

interface Plan {
  id: string;
  name: string;
  icon: typeof Zap;
  monthlyPrice: number;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    icon: Zap,
    monthlyPrice: 0,
    description: 'Get started with the basics',
    features: ['5 deals per day', 'Basic property filters', '1 market', 'Email support'],
    cta: 'Get Started',
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Crown,
    monthlyPrice: 49,
    description: 'For serious real estate investors',
    features: ['Unlimited deals', 'Advanced filters & sorting', 'All markets nationwide', 'Real-time deal alerts', 'CSV export', 'AI deal summaries', 'Priority email support'],
    cta: 'Upgrade to Pro',
    popular: true,
  },
  {
    id: 'pro_plus',
    name: 'Pro+',
    icon: Rocket,
    monthlyPrice: 149,
    description: 'For teams & power users',
    features: ['Everything in Pro', 'Full API access', 'Priority data pipeline', 'Portfolio reports', 'XLSX export', 'Dedicated account support', 'Custom deal scoring', 'Webhook integrations'],
    cta: 'Upgrade to Pro+',
  },
];

interface FeatureRow { feature: string; free: string | boolean; pro: string | boolean; proPlus: string | boolean; }

const featureRows: FeatureRow[] = [
  { feature: 'Deals per day', free: '5', pro: 'Unlimited', proPlus: 'Unlimited' },
  { feature: 'Markets', free: '1', pro: 'All', proPlus: 'All' },
  { feature: 'Advanced filters', free: false, pro: true, proPlus: true },
  { feature: 'Deal alerts', free: false, pro: true, proPlus: true },
  { feature: 'AI summaries', free: false, pro: true, proPlus: true },
  { feature: 'CSV export', free: false, pro: true, proPlus: true },
  { feature: 'XLSX export', free: false, pro: false, proPlus: true },
  { feature: 'API access', free: false, pro: false, proPlus: true },
  { feature: 'Portfolio reports', free: false, pro: false, proPlus: true },
  { feature: 'Priority data', free: false, pro: false, proPlus: true },
  { feature: 'Dedicated support', free: false, pro: false, proPlus: true },
];

const faqs = [
  { q: 'Can I cancel anytime?', a: 'Yes. You can cancel your subscription at any time from your account settings. Your access continues until the end of the current billing period.' },
  { q: 'Is there a free trial for Pro?', a: 'We offer a 14-day money-back guarantee on all paid plans. If you are not satisfied, contact us within 14 days for a full refund.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit cards (Visa, Mastercard, Amex) through our secure Stripe payment processing.' },
  { q: 'Can I switch plans later?', a: 'Absolutely. You can upgrade or downgrade at any time. When upgrading, you will be charged a prorated amount. When downgrading, you will receive credit toward your next billing cycle.' },
  { q: 'What markets are available?', a: 'Pro and Pro+ plans include access to all US markets. We cover major metros, suburbs, and emerging markets with data from Zillow, Redfin, and Realtor.com.' },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  function getPrice(plan: Plan) {
    if (plan.monthlyPrice === 0) return 0;
    return annual ? Math.round(plan.monthlyPrice * 0.8) : plan.monthlyPrice;
  }

  async function handleCheckout(planId: string) {
    if (planId === 'free') { navigate('/register'); return; }
    setLoadingPlan(planId);
    try {
      const interval = annual ? 'year' : 'month';
      const { data } = await api.post('/billing/checkout', { plan_id: planId, interval });
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch {
      navigate(`/checkout/success?plan=${planId}`);
    } finally {
      setLoadingPlan(null);
    }
  }

  function CellValue({ value }: { value: string | boolean }) {
    if (typeof value === 'boolean') {
      return value ? <Check className="w-5 h-5 text-emerald-400 mx-auto" /> : <span className="text-zinc-600 text-sm">--</span>;
    }
    return <span className="text-sm text-zinc-300">{value}</span>;
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-950/30 via-[#0a0f1e] to-purple-950/15 pointer-events-none" />

      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm text-white">RD</div>
          <span className="font-semibold text-lg text-white tracking-tight">RealDeal AI</span>
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <Link to="/dashboard" className="text-sm text-zinc-300 hover:text-white transition-colors">Dashboard</Link>
          ) : (
            <Link to="/login" className="text-sm text-zinc-300 hover:text-white transition-colors">Sign In</Link>
          )}
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pb-24">
        <div className="text-center pt-8 pb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">Simple, transparent pricing</h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">Choose the plan that fits your investment strategy. Upgrade anytime as you grow.</p>

          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm font-medium ${!annual ? 'text-white' : 'text-zinc-500'}`}>Monthly</span>
            <button onClick={() => setAnnual(!annual)} className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-blue-600' : 'bg-zinc-700'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${annual ? 'translate-x-6' : ''}`} />
            </button>
            <span className={`text-sm font-medium ${annual ? 'text-white' : 'text-zinc-500'}`}>
              Annual <span className="ml-1.5 text-xs text-emerald-400 font-semibold">Save 20%</span>
            </span>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-20">
          {plans.map((plan) => {
            const price = getPrice(plan);
            const isCurrentPlan = user?.plan_tier === plan.id;
            const Icon = plan.icon;
            return (
              <div key={plan.id} className={`relative rounded-2xl border p-8 transition-all ${plan.popular ? 'bg-[#111827] border-blue-500/50 shadow-lg shadow-blue-500/10 scale-[1.02]' : 'bg-[#111827] border-zinc-800 hover:border-zinc-700'}`}>
                {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-600 text-xs font-semibold text-white">Most Popular</div>}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.popular ? 'bg-blue-600/20 text-blue-400' : 'bg-zinc-800 text-zinc-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">${price}</span>
                  {price > 0 && <span className="text-zinc-500 ml-1">/mo</span>}
                  {annual && price > 0 && <p className="text-xs text-zinc-500 mt-1">${price * 12}/year &middot; billed annually</p>}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-sm text-zinc-300">{f}</span>
                    </li>
                  ))}
                </ul>
                {isCurrentPlan ? (
                  <div className="w-full py-2.5 rounded-lg border border-zinc-700 text-center text-sm font-medium text-zinc-400">Current Plan</div>
                ) : (
                  <button onClick={() => handleCheckout(plan.id)} disabled={loadingPlan === plan.id} className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-60 ${plan.popular ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}`}>
                    {loadingPlan === plan.id ? 'Redirecting...' : plan.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Feature comparison */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-sm font-medium text-zinc-400 pb-4 pr-4">Feature</th>
                  <th className="text-center text-sm font-medium text-zinc-400 pb-4 w-28">Free</th>
                  <th className="text-center text-sm font-medium text-blue-400 pb-4 w-28">Pro</th>
                  <th className="text-center text-sm font-medium text-zinc-400 pb-4 w-28">Pro+</th>
                </tr>
              </thead>
              <tbody>
                {featureRows.map((row) => (
                  <tr key={row.feature} className="border-b border-zinc-800/50">
                    <td className="py-3 pr-4 text-sm text-zinc-300">{row.feature}</td>
                    <td className="py-3 text-center"><CellValue value={row.free} /></td>
                    <td className="py-3 text-center"><CellValue value={row.pro} /></td>
                    <td className="py-3 text-center"><CellValue value={row.proPlus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-[#111827] border border-zinc-800 rounded-xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-6 py-4 text-left">
                  <span className="text-sm font-medium text-white">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />}
                </button>
                {openFaq === i && <div className="px-6 pb-4"><p className="text-sm text-zinc-400 leading-relaxed">{faq.a}</p></div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
