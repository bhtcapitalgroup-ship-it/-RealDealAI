import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { PartyPopper, Check, ArrowRight } from 'lucide-react';

const tierNames: Record<string, string> = { pro: 'Pro', pro_plus: 'Pro+' };

const unlocked: Record<string, string[]> = {
  pro: ['Unlimited deals per day', 'All markets nationwide', 'Real-time deal alerts', 'AI-powered deal summaries', 'CSV data export', 'Advanced filters & sorting'],
  pro_plus: ['Everything in Pro', 'Full REST API access', 'Priority data pipeline', 'Portfolio performance reports', 'XLSX export', 'Dedicated account support'],
};

export default function CheckoutSuccessPage() {
  const [params] = useSearchParams();
  const plan = params.get('plan') || 'pro';
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); navigate('/dashboard'); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  const features = unlocked[plan] || unlocked.pro;
  const name = tierNames[plan] || 'Pro';

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-950/40 via-[#0a0f1e] to-emerald-950/20 pointer-events-none" />

      {/* CSS Confetti */}
      <div className="confetti-container pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="confetti-piece" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][i % 6],
            width: `${6 + Math.random() * 6}px`,
            height: `${6 + Math.random() * 6}px`,
          }} />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-lg text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 mb-6 animate-bounce-slow">
          <PartyPopper className="w-10 h-10 text-emerald-400" />
        </div>

        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">Welcome to {name}!</h1>
        <p className="text-lg text-zinc-400 mb-8">Your upgrade is complete. Here is what you just unlocked:</p>

        <div className="bg-[#111827] border border-zinc-800 rounded-2xl p-6 mb-8 text-left">
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-sm text-zinc-300">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <Link to="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition-all">
          Go to Dashboard <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="mt-4 text-sm text-zinc-500">Redirecting to dashboard in {countdown}s...</p>
      </div>

      <style>{`
        .confetti-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 5; overflow: hidden; }
        .confetti-piece { position: absolute; top: -10px; border-radius: 2px; animation: confetti-fall linear forwards; }
        @keyframes confetti-fall { 0% { transform: translateY(-10px) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
        @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
