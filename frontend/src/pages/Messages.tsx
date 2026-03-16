import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, Send, MessageSquare, Phone, Mail, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import api from '../lib/api';

interface Conversation { id: string; tenantName: string; unit: string; lastMessage: string; time: string; unread: number; channel: 'sms' | 'email' | 'portal'; escalated: boolean; }
interface Message { id: string; sender: 'tenant' | 'ai' | 'landlord'; text: string; time: string; }

const mockConversations: Conversation[] = [
  { id: '1', tenantName: 'Daniel Foster', unit: '4B - Oak Park Townhomes', lastMessage: 'The ceiling is still dripping. Can someone come today?', time: '2026-03-16T16:20:00Z', unread: 2, channel: 'sms', escalated: true },
  { id: '2', tenantName: 'Sarah Johnson', unit: '1A - Maple Street', lastMessage: 'Thank you! When can I expect the new lease?', time: '2026-03-16T15:45:00Z', unread: 1, channel: 'sms', escalated: false },
  { id: '3', tenantName: 'Emma Wilson', unit: '3B - Maple Street', lastMessage: 'I sent the payment via Venmo yesterday', time: '2026-03-16T14:30:00Z', unread: 0, channel: 'email', escalated: false },
  { id: '4', tenantName: 'Maria Garcia', unit: 'A - Cedar Heights', lastMessage: 'Can I have a guest stay for 2 weeks?', time: '2026-03-16T12:00:00Z', unread: 0, channel: 'portal', escalated: false },
  { id: '5', tenantName: 'Priya Sharma', unit: '1B - Oak Park Townhomes', lastMessage: 'I know the rent is late, I can pay half now', time: '2026-03-16T10:15:00Z', unread: 0, channel: 'sms', escalated: false },
];

const mockMessages: Record<string, Message[]> = {
  '1': [
    { id: 'm1', sender: 'tenant', text: 'Hi, I noticed water dripping from my bathroom ceiling this morning. It seems to be getting worse.', time: '2026-03-16T12:00:00Z' },
    { id: 'm2', sender: 'ai', text: 'Hi Daniel, thank you for reporting this right away. Based on your description, this sounds like it could be a plumbing leak from the unit above. I have a few questions to help diagnose the issue:\n\n1. Is the dripping constant or intermittent?\n2. Is there any discoloration or soft spots on the ceiling?\n3. Does it seem to get worse when someone upstairs uses water?', time: '2026-03-16T12:00:20Z' },
    { id: 'm3', sender: 'tenant', text: 'It gets worse when my upstairs neighbor showers. There is a brownish water stain about 2 feet wide and the drywall feels soft when I press it.', time: '2026-03-16T12:15:00Z' },
    { id: 'm4', sender: 'ai', text: 'Thank you for those details. Based on the pattern you describe, my diagnosis is a failing pipe connection or wax ring seal in the bathroom above your unit. I have classified this as urgent priority.\n\nI have already requested quotes from two plumbers:\n- ABC Plumbing: $350, available tomorrow\n- QuickFix Plumbing: $420, available today\n\nI recommend QuickFix for same-day service given the active water damage. Shall I confirm with them?', time: '2026-03-16T12:15:30Z' },
    { id: 'm5', sender: 'tenant', text: 'Yes please, the sooner the better. I put a bucket under it but it is filling up fast.', time: '2026-03-16T13:00:00Z' },
    { id: 'm6', sender: 'ai', text: 'Understood. I have escalated this to Jordan Mitchell for approval of the QuickFix quote since it exceeds the auto-approve threshold. In the meantime, please keep the bucket in place and avoid using your bathroom if possible. You should hear back within the hour.', time: '2026-03-16T13:00:15Z' },
    { id: 'm7', sender: 'landlord', text: 'Daniel, this is Jordan. I have approved the QuickFix plumber. They will be there between 3-5 PM today. Sorry for the inconvenience and thank you for reporting it quickly.', time: '2026-03-16T13:45:00Z' },
    { id: 'm8', sender: 'tenant', text: 'The ceiling is still dripping. Can someone come today?', time: '2026-03-16T16:20:00Z' },
  ],
  '2': [
    { id: 'm1', sender: 'tenant', text: 'Hi, I was wondering about my lease renewal. It expires in August.', time: '2026-03-16T14:00:00Z' },
    { id: 'm2', sender: 'ai', text: 'Hi Sarah! Thanks for reaching out about your lease renewal. Your current lease for Unit 1A at Maple Street Apartments expires on August 31, 2026. We would love to have you stay! I can prepare a renewal offer for you. Would you prefer a 12-month or month-to-month renewal?', time: '2026-03-16T14:00:15Z' },
    { id: 'm3', sender: 'tenant', text: "I'd like a 12-month renewal. Will there be a rent increase?", time: '2026-03-16T14:30:00Z' },
    { id: 'm4', sender: 'ai', text: "Great choice! For a 12-month renewal, there would be a 3% increase, bringing your rent from $1,200 to $1,236/month. This is well below the current market rate for comparable 1-bedroom units in Portland. I'll prepare the renewal documents for your review.", time: '2026-03-16T14:30:20Z' },
    { id: 'm5', sender: 'tenant', text: 'That sounds reasonable. When can I expect the new lease?', time: '2026-03-16T15:15:00Z' },
    { id: 'm6', sender: 'ai', text: "I'll have the renewal lease ready for your review within 24 hours. You'll receive it via email and can sign electronically through the tenant portal. Is there anything else I can help with?", time: '2026-03-16T15:15:15Z' },
    { id: 'm7', sender: 'tenant', text: 'Thank you! When can I expect the new lease?', time: '2026-03-16T15:45:00Z' },
  ],
  '3': [
    { id: 'm1', sender: 'tenant', text: 'Hi, I know my rent is overdue. I sent the payment via Venmo yesterday. Can you confirm you received it?', time: '2026-03-16T13:00:00Z' },
    { id: 'm2', sender: 'ai', text: 'Hi Emma, thank you for letting us know. I can see a Venmo payment of $1,800 was initiated on March 15. However, it typically takes 1-2 business days for Venmo transfers to clear. Once it posts to our account, I will update your payment status and send you a confirmation receipt.', time: '2026-03-16T13:00:20Z' },
    { id: 'm3', sender: 'tenant', text: 'OK thanks. Will there be a late fee?', time: '2026-03-16T13:30:00Z' },
    { id: 'm4', sender: 'ai', text: 'Per your lease agreement, a late fee of $50 applies to payments received after the 5th of the month. Since your payment was initiated on March 15, the late fee would apply. However, I can note that you reached out proactively. Would you like me to request a one-time late fee waiver from the property manager?', time: '2026-03-16T13:30:15Z' },
    { id: 'm5', sender: 'tenant', text: 'Yes please, that would be great. This is the first time it has happened.', time: '2026-03-16T14:00:00Z' },
    { id: 'm6', sender: 'ai', text: "I have submitted a waiver request to Jordan Mitchell noting your excellent payment history. You're right that this is your first late payment in 18 months. I will let you know once I hear back.", time: '2026-03-16T14:00:15Z' },
    { id: 'm7', sender: 'tenant', text: 'I sent the payment via Venmo yesterday', time: '2026-03-16T14:30:00Z' },
  ],
  '4': [
    { id: 'm1', sender: 'tenant', text: 'Hi, my parents want to visit and stay with me for about 2 weeks next month. Is that allowed under my lease?', time: '2026-03-16T11:00:00Z' },
    { id: 'm2', sender: 'ai', text: 'Hi Maria! Great question. According to your lease for Unit A at Cedar Heights Condo, guests are welcome to stay for up to 14 consecutive days without requiring additional approval. Since your parents would be staying exactly 2 weeks, this falls within the standard guest policy.', time: '2026-03-16T11:00:15Z' },
    { id: 'm3', sender: 'tenant', text: 'Perfect. Do I need to notify anyone or register them?', time: '2026-03-16T11:30:00Z' },
    { id: 'm4', sender: 'ai', text: 'No formal registration is required for stays under 14 days. However, I would recommend letting the front office know as a courtesy, especially for parking arrangements. Cedar Heights has 2 visitor parking spots available on a first-come basis. Would you like me to reserve a visitor parking spot for their stay?', time: '2026-03-16T11:30:15Z' },
    { id: 'm5', sender: 'tenant', text: 'Yes, that would be helpful. They will be arriving April 10 and leaving April 23.', time: '2026-03-16T11:45:00Z' },
    { id: 'm6', sender: 'ai', text: "I've noted the visitor parking request for April 10-23. I'll confirm the reservation closer to the date. Is there anything else you need help with?", time: '2026-03-16T11:45:15Z' },
    { id: 'm7', sender: 'tenant', text: 'Can I have a guest stay for 2 weeks?', time: '2026-03-16T12:00:00Z' },
  ],
  '5': [
    { id: 'm1', sender: 'tenant', text: 'Hi, I know my rent is late. Things have been tight this month. Can I pay half now and the rest next week?', time: '2026-03-16T09:00:00Z' },
    { id: 'm2', sender: 'ai', text: "Hi Priya, thank you for reaching out. I understand that unexpected expenses can come up. Your March rent of $1,600 was due on March 1st. Let me check your account history and see what options may be available.", time: '2026-03-16T09:00:20Z' },
    { id: 'm3', sender: 'tenant', text: 'I can pay $800 today and the remaining $800 by March 22.', time: '2026-03-16T09:15:00Z' },
    { id: 'm4', sender: 'ai', text: "I appreciate you being upfront about this. Payment plans require landlord approval. I have forwarded your request to Jordan Mitchell with the following details:\n\n- Payment 1: $800 due today (March 16)\n- Payment 2: $800 due by March 22\n\nPlease note that the standard late fee of $50 will still apply per your lease terms. I will let you know once Jordan reviews your request.", time: '2026-03-16T09:15:20Z' },
    { id: 'm5', sender: 'tenant', text: 'I understand about the late fee. Thank you for helping.', time: '2026-03-16T09:30:00Z' },
    { id: 'm6', sender: 'ai', text: "You're welcome, Priya. I will follow up as soon as I hear back. In the meantime, you can submit the first payment of $800 through the tenant portal whenever you are ready.", time: '2026-03-16T09:30:15Z' },
    { id: 'm7', sender: 'tenant', text: 'I know the rent is late, I can pay half now', time: '2026-03-16T10:15:00Z' },
  ],
};

const channelIcon = { sms: Phone, email: Mail, portal: MessageSquare };

export default function Messages() {
  const [selectedId, setSelectedId] = useState<string>('1');
  const [inputText, setInputText] = useState('');

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => { const res = await api.get('/conversations'); return res.data; },
    placeholderData: mockConversations,
  });

  const convos: Conversation[] = conversations ?? mockConversations;
  const selected = convos.find((c) => c.id === selectedId);
  const messages = mockMessages[selectedId] || [];

  const handleSend = () => { if (!inputText.trim()) return; setInputText(''); };

  return (
    <div className="h-[calc(100vh-7rem)]">
      <div className="flex h-full bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="w-80 border-r border-zinc-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-zinc-200"><h2 className="text-lg font-semibold text-zinc-900">Messages</h2><p className="text-xs text-zinc-500 mt-0.5">{convos.length} conversations</p></div>
          <div className="flex-1 overflow-y-auto">
            {convos.map((convo) => { const ChannelIcon = channelIcon[convo.channel]; return (
              <button key={convo.id} onClick={() => setSelectedId(convo.id)} className={clsx('w-full text-left px-4 py-3 border-b border-zinc-100 hover:bg-zinc-50 transition-colors', selectedId === convo.id && 'bg-blue-50 border-l-2 border-l-blue-600', convo.escalated && 'bg-amber-50/50')}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2"><span className="text-sm font-semibold text-zinc-900">{convo.tenantName}</span>{convo.escalated && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}</div>
                  <div className="flex items-center gap-1.5"><ChannelIcon className="w-3 h-3 text-zinc-400" /><span className="text-xs text-zinc-400">{formatDistanceToNow(new Date(convo.time), { addSuffix: false })}</span></div>
                </div>
                <p className="text-xs text-zinc-500 mb-0.5">{convo.unit}</p>
                <p className="text-xs text-zinc-600 truncate">{convo.lastMessage}</p>
                {convo.unread > 0 && <span className="inline-flex items-center justify-center mt-1 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full">{convo.unread}</span>}
              </button>
            ); })}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {selected ? (<>
            <div className="px-5 py-3 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2"><h3 className="font-semibold text-zinc-900">{selected.tenantName}</h3>{selected.escalated && <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full"><AlertTriangle className="w-3 h-3" />Escalated</span>}</div>
                <p className="text-xs text-zinc-500">{selected.unit}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={clsx('flex gap-2', msg.sender === 'tenant' ? 'justify-end' : 'justify-start')}>
                  {msg.sender !== 'tenant' && <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1', msg.sender === 'ai' ? 'bg-purple-100' : 'bg-blue-100')}>{msg.sender === 'ai' ? <Bot className="w-3.5 h-3.5 text-purple-600" /> : <span className="text-xs font-bold text-blue-600">Y</span>}</div>}
                  <div className={clsx('max-w-[70%] rounded-2xl px-4 py-2.5 text-sm', msg.sender === 'tenant' ? 'bg-blue-600 text-white rounded-tr-sm' : msg.sender === 'ai' ? 'bg-zinc-100 text-zinc-800 rounded-tl-sm' : 'bg-blue-50 text-zinc-800 rounded-tl-sm border border-blue-200')}>
                    {msg.sender === 'ai' && <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider block mb-1">AI Assistant</span>}
                    {msg.sender === 'landlord' && <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block mb-1">You (Override)</span>}
                    <p className="leading-relaxed">{msg.text}</p>
                    <p className={clsx('text-[10px] mt-1', msg.sender === 'tenant' ? 'text-blue-200' : 'text-zinc-400')}>{formatDistanceToNow(new Date(msg.time), { addSuffix: true })}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-zinc-200">
              <div className="flex items-center gap-2">
                <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message to override AI response..." className="flex-1 px-4 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <button onClick={handleSend} className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><Send className="w-4 h-4" /></button>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1.5">Your message will be sent directly to the tenant, bypassing AI</p>
            </div>
          </>) : (
            <div className="flex-1 flex items-center justify-center text-zinc-400"><div className="text-center"><MessageSquare className="w-12 h-12 mx-auto mb-3 text-zinc-300" /><p className="text-sm">Select a conversation to view messages</p></div></div>
          )}
        </div>
      </div>
    </div>
  );
}
