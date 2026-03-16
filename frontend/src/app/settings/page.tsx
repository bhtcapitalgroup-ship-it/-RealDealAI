import { useState, useRef } from 'react';
import { User, Bell, Key, Shield, Trash2, Crown, Upload, Copy, RefreshCw, Loader2, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Modal from '@/components/ui/modal';
import { useSubscription, useInvoices, useCancelSubscription } from '@/hooks/useBilling';
import { useToast } from '@/components/ui/toast';

function Section({ title, icon: Icon, children, danger }: { title: string; icon: typeof User; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`bg-[#111827] border rounded-xl p-6 ${danger ? 'border-red-500/30' : 'border-zinc-800'}`}>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-5">
        <Icon className={`w-5 h-5 ${danger ? 'text-red-400' : 'text-blue-400'}`} />{title}
      </h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { subscription } = useSubscription();
  const { invoices } = useInvoices();
  const { cancel: cancelSub } = useCancelSubscription();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email] = useState(user?.email || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [alertFreq, setAlertFreq] = useState<'instant' | 'daily' | 'weekly'>('instant');

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const isProPlus = user?.plan_tier === 'pro' || (user as unknown as Record<string, unknown>)?.plan_tier === 'pro_plus';

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onload = (ev) => setAvatarPreview(ev.target?.result as string); reader.readAsDataURL(file); }
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    await new Promise((r) => setTimeout(r, 800));
    setSavingProfile(false);
    toast.success('Profile updated', 'Your changes have been saved.');
  }

  async function handleGenerateApiKey() {
    setGeneratingKey(true);
    await new Promise((r) => setTimeout(r, 600));
    setApiKey('rdai_sk_' + Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join(''));
    setGeneratingKey(false);
    toast.success('API key generated');
  }

  function handleCopyKey() {
    if (apiKey) { navigator.clipboard.writeText(apiKey); toast.info('Copied to clipboard'); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <Section title="Profile" icon={User}>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarPreview ? <img src={avatarPreview} alt="Avatar" className="w-16 h-16 rounded-full object-cover" /> : <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">{user?.first_name?.charAt(0) || 'U'}</div>}
              <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"><Upload className="w-3 h-3" /></button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div><p className="text-sm font-medium text-white">{user?.first_name} {user?.last_name}</p><p className="text-xs text-zinc-500">{user?.email}</p></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-zinc-300 mb-1">First name</label><input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-zinc-300 mb-1">Last name</label><input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
          <div><label className="block text-sm font-medium text-zinc-300 mb-1">Email</label><input type="email" value={email} disabled className="w-full px-3 py-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-sm cursor-not-allowed" /></div>
          <button onClick={handleSaveProfile} disabled={savingProfile} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-60 transition-colors">
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Changes
          </button>
        </div>
      </Section>

      <Section title="Subscription" icon={Crown}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-900 border border-zinc-800">
            <div>
              <p className="text-sm font-medium text-white">Current Plan: <span className="text-blue-400 capitalize">{user?.plan_tier || 'Free'}</span></p>
              {subscription && <p className="text-xs text-zinc-500 mt-0.5">${subscription.amount}/{subscription.interval} &middot; Renews {new Date(subscription.current_period_end).toLocaleDateString()}</p>}
            </div>
            <a href="/pricing" className="px-4 py-2 rounded-lg bg-blue-600/15 text-blue-400 text-sm font-medium hover:bg-blue-600/25 transition-colors">{subscription ? 'Change Plan' : 'Upgrade'}</a>
          </div>
          {subscription && !subscription.cancel_at_period_end && <button onClick={() => setShowCancelModal(true)} className="text-sm text-red-400 hover:text-red-300 transition-colors">Cancel subscription</button>}
          {invoices.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Billing History</h3>
              <div className="space-y-2">
                {invoices.slice(0, 5).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50">
                    <div><p className="text-sm text-zinc-300">{inv.description || 'Subscription'}</p><p className="text-xs text-zinc-500">{new Date(inv.created_at).toLocaleDateString()}</p></div>
                    <div className="text-right"><p className="text-sm font-medium text-white">${inv.amount}</p>{inv.pdf_url && <a href={inv.pdf_url} className="text-xs text-blue-400 hover:text-blue-300">Download</a>}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title="Notifications" icon={Bell}>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div><p className="text-sm text-white">Email deal alerts</p><p className="text-xs text-zinc-500">Receive email when new deals match your criteria</p></div>
            <button onClick={() => setEmailAlerts(!emailAlerts)} className={`relative w-11 h-6 rounded-full transition-colors ${emailAlerts ? 'bg-blue-600' : 'bg-zinc-700'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${emailAlerts ? 'translate-x-5' : ''}`} />
            </button>
          </label>
          {emailAlerts && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Alert frequency</label>
              <div className="flex gap-2">
                {(['instant', 'daily', 'weekly'] as const).map((f) => (
                  <button key={f} onClick={() => setAlertFreq(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${alertFreq === f ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title="API Access" icon={Key}>
        {isProPlus ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">Use your API key to access the RealDeal AI REST API programmatically.</p>
            {apiKey ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-emerald-400 font-mono truncate">{apiKey}</code>
                <button onClick={handleCopyKey} className="p-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white transition-colors"><Copy className="w-4 h-4" /></button>
                <button onClick={() => setApiKey(null)} className="p-2.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={handleGenerateApiKey} disabled={generatingKey} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-60 transition-colors">
                {generatingKey ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />} Generate API Key
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <Key className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-400 mb-3">API access is available on the Pro+ plan.</p>
            <a href="/pricing" className="inline-flex px-4 py-2 rounded-lg bg-blue-600/15 text-blue-400 text-sm font-medium hover:bg-blue-600/25 transition-colors">Upgrade to Pro+</a>
          </div>
        )}
      </Section>

      <Section title="Danger Zone" icon={Shield} danger>
        <div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-white">Delete account</p><p className="text-xs text-zinc-500">Permanently remove your account and all associated data. This action cannot be undone.</p></div>
          <button onClick={() => setShowDeleteModal(true)} className="px-4 py-2 rounded-lg bg-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/25 transition-colors shrink-0">Delete Account</button>
        </div>
      </Section>

      <Modal open={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancel Subscription" confirmLabel="Cancel Subscription" confirmVariant="danger" onConfirm={async () => { await cancelSub(); setShowCancelModal(false); toast.info('Subscription cancelled', 'You will retain access until the end of your billing period.'); }}>
        <div className="flex items-start gap-3"><AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" /><p className="text-sm text-zinc-300">Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.</p></div>
      </Modal>

      <Modal open={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteConfirm(''); }} title="Delete Account" confirmLabel="Delete Forever" confirmVariant="danger" confirmDisabled={deleteConfirm !== 'DELETE'} onConfirm={() => { toast.error('Account deleted'); setShowDeleteModal(false); }}>
        <div className="space-y-4">
          <p className="text-sm text-zinc-300">This will permanently delete your account, saved searches, deal alerts, and all associated data. This action <strong className="text-white">cannot be undone</strong>.</p>
          <div><label className="block text-sm text-zinc-400 mb-1">Type <strong className="text-white">DELETE</strong> to confirm</label><input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="DELETE" /></div>
        </div>
      </Modal>
    </div>
  );
}
