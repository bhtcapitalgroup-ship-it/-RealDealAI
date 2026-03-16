import { useState, useEffect } from 'react';
import { X, ExternalLink, TrendingUp } from 'lucide-react';
import type { DealAlertPayload } from '@/hooks/useWebSocket';

interface DealAlertToastProps {
  deal: DealAlertPayload;
  onDismiss: (id: string) => void;
  onView: (id: string) => void;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500 text-white';
  if (score >= 60) return 'bg-blue-500 text-white';
  if (score >= 40) return 'bg-amber-500 text-white';
  return 'bg-red-500 text-white';
}

function formatPrice(price: number): string {
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}K`;
  return `$${price}`;
}

function DealAlertToastItem({ deal, onDismiss, onView }: DealAlertToastProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 9700);
    const removeTimer = setTimeout(() => onDismiss(deal.id), 10000);
    return () => { clearTimeout(exitTimer); clearTimeout(removeTimer); };
  }, [deal.id, onDismiss]);

  return (
    <div className={`w-80 bg-[#111827] border border-zinc-700 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ${exiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0 animate-slide-deal'}`}>
      <div className="flex items-center justify-between px-4 py-2 bg-blue-600/10 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">New Deal Alert</span>
        </div>
        <button onClick={() => onDismiss(deal.id)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{deal.address}</p>
            <p className="text-lg font-bold text-white mt-0.5">{formatPrice(deal.price)}</p>
          </div>
          <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${scoreColor(deal.score)}`}>
            {deal.score}
          </div>
        </div>

        {(deal.cap_rate || deal.cash_flow) && (
          <div className="flex gap-4 mt-3">
            {deal.cap_rate != null && (
              <div>
                <p className="text-[10px] uppercase text-zinc-500 tracking-wider">Cap Rate</p>
                <p className="text-sm font-semibold text-emerald-400">{deal.cap_rate.toFixed(1)}%</p>
              </div>
            )}
            {deal.cash_flow != null && (
              <div>
                <p className="text-[10px] uppercase text-zinc-500 tracking-wider">Cash Flow</p>
                <p className="text-sm font-semibold text-emerald-400">${deal.cash_flow.toLocaleString()}/mo</p>
              </div>
            )}
          </div>
        )}

        <button onClick={() => onView(deal.id)} className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-medium hover:bg-blue-600/30 transition-colors">
          View Deal <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

interface DealAlertStackProps {
  deals: DealAlertPayload[];
  onDismiss: (id: string) => void;
  onView: (id: string) => void;
}

export default function DealAlertStack({ deals, onDismiss, onView }: DealAlertStackProps) {
  if (deals.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[9500] flex flex-col-reverse gap-3">
        {deals.slice(0, 5).map((deal) => (
          <DealAlertToastItem key={deal.id} deal={deal} onDismiss={onDismiss} onView={onView} />
        ))}
      </div>
      <style>{`
        @keyframes slide-deal { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        .animate-slide-deal { animation: slide-deal 0.35s ease-out; }
      `}</style>
    </>
  );
}
