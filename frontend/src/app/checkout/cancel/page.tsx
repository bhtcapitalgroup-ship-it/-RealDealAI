import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Zap, BarChart3, Bell } from 'lucide-react';

const missingFeatures = [
  { icon: Zap, label: 'Unlimited deal access', desc: 'No daily limits on the deals you can view' },
  { icon: Bell, label: 'Real-time deal alerts', desc: 'Get notified the moment a matching deal lands' },
  { icon: BarChart3, label: 'AI deal summaries', desc: 'Instant investment analysis on every property' },
  { icon: Shield, label: 'All markets', desc: 'Nationwide coverage across every metro area' },
];

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-950/30 via-[#0a0f1e] to-zinc-950/20 pointer-events-none" />
      <div className="relative z-10 w-full max-w-lg text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800 mb-6">
          <span className="text-3xl">&#128075;</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">No worries!</h1>
        <p className="text-lg text-zinc-400 mb-8">Your checkout was cancelled. You have not been charged. Here is what you would unlock with Pro:</p>

        <div className="bg-[#111827] border border-zinc-800 rounded-2xl p-6 mb-8 text-left space-y-4">
          {missingFeatures.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600/15 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-zinc-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/pricing" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition-all">Try Again</Link>
          <Link to="/dashboard" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700 transition-all"><ArrowLeft className="w-4 h-4" /> Stay on Free</Link>
        </div>
      </div>
    </div>
  );
}
