import { useInternalSession } from '@/hooks/useInternalSession';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import {
    CreditCard,
    History,
    Zap,
    ShieldCheck,
    Clock,
    Download,
    ExternalLink,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react';
import InternalLayout from '@/components/layout/InternalLayout';
import { format } from 'date-fns';

export default function FirmBillingPage() {
    const { session } = useInternalSession();

    // 1. Fetch Subscription Details
    const { data: subscription, isLoading: subLoading } = useQuery({
        queryKey: ['firm_subscription', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('firm_subscriptions')
                .select('*')
                .eq('firm_id', session!.firm_id)
                .single();
            if (error) throw error;
            return data;
        }
    });

    // 2. Fetch Payment History
    const { data: payments, isLoading: paymentsLoading } = useQuery({
        queryKey: ['firm_payments', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('firm_payments')
                .select('*')
                .eq('firm_id', session!.firm_id)
                .order('paid_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const isTrial = subscription?.tier === 'trial';
    const isPastDue = subscription?.status === 'past_due';

    return (
        <InternalLayout>
            <div className="max-w-6xl mx-auto">
                <header className="mb-12">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <CreditCard className="w-5 h-5 text-indigo-400" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">Financial Governance</span>
                    </div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter">
                        Billing & <span className="text-indigo-500">Subscription</span>
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Manage your firm's platform access, service tiers, and payment history.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    {/* Current Plan Card */}
                    <div className="lg:col-span-2 bg-[#1E293B]/30 border border-white/10 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden backdrop-blur-md">
                        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                            <Zap className="w-40 h-40" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                                <div>
                                    <span className="text-[10px] font-black uppercase bg-indigo-600 px-3 py-1 rounded-full text-white mb-4 inline-block">
                                        Current Plan
                                    </span>
                                    <h2 className="text-5xl font-black italic uppercase italic tracking-tighter text-white">
                                        {subscription?.tier || '...'} <span className="text-indigo-500">Tier</span>
                                    </h2>
                                    <p className="text-slate-400 mt-2 flex items-center gap-2">
                                        <Clock size={16} />
                                        {isTrial ? 'Trial ends' : 'Next billing date'}:
                                        <span className="text-white font-bold">
                                            {subscription?.current_period_end ? format(new Date(subscription.current_period_end), 'MMM dd, yyyy') : 'N/A'}
                                        </span>
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
                                        Upgrade Plan
                                    </button>
                                    <button className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all">
                                        Manage Billing
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <MetricBox
                                    label="Account Status"
                                    value={subscription?.status?.toUpperCase() || '...'}
                                    icon={ShieldCheck}
                                    color={isPastDue ? 'text-rose-400' : 'text-emerald-400'}
                                />
                                <MetricBox
                                    label="Usage Limit"
                                    value="Unlimited"
                                    icon={Zap}
                                    color="text-indigo-400"
                                />
                                <MetricBox
                                    label="Payment Method"
                                    value="Mastercard •••• 4242"
                                    icon={CreditCard}
                                    color="text-slate-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quick Notifications / Alerts */}
                    <div className="space-y-6">
                        {isTrial && (
                            <div className="bg-indigo-600/10 border border-indigo-600/20 p-6 rounded-[2rem] relative overflow-hidden group">
                                <div className="relative z-10">
                                    <h4 className="font-black text-white uppercase text-xs mb-2 flex items-center gap-2">
                                        <Zap size={14} className="text-indigo-400" /> Trial active
                                    </h4>
                                    <p className="text-sm text-slate-400 leading-relaxed mb-4">
                                        You are currently on a 14-day free trial. Upgrade now to avoid service interruption.
                                    </p>
                                    <button className="text-xs font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors">
                                        See Pricing Details
                                    </button>
                                </div>
                            </div>
                        )}

                        {isPastDue && (
                            <div className="bg-rose-600/10 border border-rose-600/20 p-6 rounded-[2rem]">
                                <h4 className="font-black text-rose-400 uppercase text-xs mb-2 flex items-center gap-2">
                                    <AlertTriangle size={14} /> payment failed
                                </h4>
                                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                                    Your last payment attempt failed. Please update your billing information to continue.
                                </p>
                                <button className="text-xs font-black text-rose-400 uppercase tracking-widest hover:text-white transition-colors">
                                    Retry Payment
                                </button>
                            </div>
                        )}

                        <div className="bg-[#1E293B]/30 border border-white/5 p-6 rounded-[2rem]">
                            <h4 className="font-black text-slate-500 uppercase text-xs mb-4">Support Contact</h4>
                            <p className="text-sm text-slate-400 mb-4 font-medium italic">
                                "Our billing team is available 24/7 for tailored enterprise solutions."
                            </p>
                            <a href="mailto:billing@casebridge.com" className="text-xs font-bold text-white underline decoration-indigo-500/50 underline-offset-4">
                                contact@casebridge.com
                            </a>
                        </div>
                    </div>
                </div>

                {/* Transaction History */}
                <div className="bg-[#1E293B]/30 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-md">
                    <div className="p-8 md:p-10 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-3">
                                <History size={20} className="text-indigo-400" /> Payment History
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">Download and manage your firm's invoices.</p>
                        </div>
                        <button className="hidden sm:flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                            <Download size={14} /> Export CSV
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] uppercase tracking-widest text-slate-500 bg-white/[0.02]">
                                    <th className="px-10 py-6">Invoice ID</th>
                                    <th className="px-10 py-6">Date</th>
                                    <th className="px-10 py-6">Amount</th>
                                    <th className="px-10 py-6">Status</th>
                                    <th className="px-10 py-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments?.map((payment) => (
                                    <tr key={payment.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-10 py-5">
                                            <span className="text-xs font-mono text-slate-400">#{payment.transaction_reference?.slice(0, 8).toUpperCase()}</span>
                                        </td>
                                        <td className="px-10 py-5">
                                            <span className="text-sm font-bold text-slate-200">
                                                {format(new Date(payment.paid_at), 'MMM dd, yyyy')}
                                            </span>
                                        </td>
                                        <td className="px-10 py-5">
                                            <span className="text-sm font-black text-white">
                                                {payment.currency} {payment.amount.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-10 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${payment.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                <span className={`text-[10px] font-black uppercase ${payment.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {payment.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-5 text-right">
                                            <button className="inline-flex items-center gap-2 text-indigo-400 hover:text-white font-black text-[10px] uppercase italic transition-all group-hover:translate-x-1">
                                                View Invoice <ExternalLink size={12} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {(!payments || payments.length === 0) && !paymentsLoading && (
                                    <tr>
                                        <td colSpan={5} className="px-10 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <History size={40} className="text-slate-800" />
                                                <p className="text-slate-500 font-medium italic text-sm">No transaction history found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </InternalLayout>
    );
}

function MetricBox({ label, value, icon: Icon, color }: any) {
    return (
        <div className="bg-black/20 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                {label} <Icon size={12} className="text-slate-600" />
            </p>
            <p className={`text-sm font-black tracking-tight ${color}`}>{value}</p>
        </div>
    );
}
