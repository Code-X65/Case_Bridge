import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
    Banknote,
    TrendingUp,
    Clock,
    CheckCircle2,
    Filter,
    ArrowUpRight,
    Calendar
} from 'lucide-react';
import { format } from 'date-fns';

export default function EarningsPage() {
    const { data: profile } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data } = await supabase
                .from('profiles')
                .select('firm_id')
                .eq('id', user.id)
                .single();

            return data;
        },
    });

    const { data: earningsData, isLoading } = useQuery({
        queryKey: ['firm-earnings', profile?.firm_id],
        queryFn: async () => {
            if (!profile?.firm_id) return null;

            // 1. Get all matters for this firm to identify relevant clients
            const { data: matters } = await supabase
                .from('matters')
                .select('client_id')
                .or(`firm_id.eq.${profile.firm_id},firm_id.is.null`);

            const clientIds = [...new Set(matters?.map(m => m.client_id) || [])];

            if (clientIds.length === 0) return {
                totalRevenue: 0,
                pendingRevenue: 0,
                count: 0,
                transactions: []
            };

            // 2. Fetch payments for these clients
            const { data: payments, error: pError } = await supabase
                .from('payments')
                .select(`
                    *,
                    client:profiles!payments_client_id_fkey(first_name, last_name, email)
                `)
                .in('client_id', clientIds)
                .order('created_at', { ascending: false });

            if (pError) throw pError;

            // 3. Fetch pending invoices
            const { data: pendingInvoices } = await supabase
                .from('invoices')
                .select('amount')
                .in('client_id', clientIds)
                .eq('status', 'Pending');

            const totalRevenue = payments?.filter(p => p.status === 'Success')
                .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

            const pendingRevenue = pendingInvoices?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;

            return {
                totalRevenue,
                pendingRevenue,
                count: payments?.length || 0,
                transactions: payments || []
            };
        },
        enabled: !!profile?.firm_id,
    });

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-slate-900 uppercase tracking-tight">
                        Earning Statistics
                    </h1>
                    <p className="text-sm text-slate-600 font-medium mt-1">
                        Financial oversight and revenue tracking for CaseBridge
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="h-10 px-4 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-md hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Last 30 Days
                    </button>
                    <button className="h-10 px-4 bg-primary text-white font-semibold text-sm uppercase tracking-wide rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filter
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Revenue */}
                <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-24 w-24 text-green-600" />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-green-50 rounded-md flex items-center justify-center">
                            <Banknote className="h-6 w-6 text-green-600" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Subscription</p>
                    </div>
                    <p className="text-4xl font-semibold text-slate-900 mb-2">
                        ₦{(earningsData?.totalRevenue || 0).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-green-600">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>+12.5% from last month</span>
                    </div>
                </div>

                {/* Pending Payouts */}
                <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-md flex items-center justify-center">
                            <Clock className="h-6 w-6 text-amber-600" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pending Invoices</p>
                    </div>
                    <p className="text-4xl font-semibold text-slate-900 mb-2">
                        ₦{(earningsData?.pendingRevenue || 0).toLocaleString()}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                        Awaiting payment from clients
                    </p>
                </div>

                {/* Successful Payments */}
                <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-md flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Successful Transactions</p>
                    </div>
                    <p className="text-4xl font-semibold text-slate-900 mb-2">
                        {earningsData?.transactions?.filter(p => p.status === 'Success').length || 0}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                        Cleared and processed payments
                    </p>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden text-slate-900">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                        Recent Transactions
                    </h2>
                    <button className="text-[10px] font-semibold uppercase text-primary hover:underline">
                        Export CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Transaction ID</th>
                                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Client</th>
                                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Method</th>
                                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Date</th>
                                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Amount</th>
                                <th className="px-6 py-4 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                                        Loading financial records...
                                    </td>
                                </tr>
                            ) : earningsData?.transactions?.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                                        No transaction data available
                                    </td>
                                </tr>
                            ) : (
                                earningsData?.transactions?.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-slate-900 font-mono">
                                                #{payment.id.slice(0, 8).toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">
                                                    {payment.client?.first_name} {payment.client?.last_name}
                                                </p>
                                                <p className="text-[10px] text-slate-500 font-medium">
                                                    {payment.client?.email}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center">
                                                    <ArrowUpRight className="h-3 w-3 text-slate-400" />
                                                </div>
                                                <span className="text-xs font-medium text-slate-600">Online Payment</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-slate-900">
                                                ₦{Number(payment.amount).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-[9px] font-semibold uppercase rounded-md ${payment.status === 'Success' ? 'bg-green-100 text-green-700' :
                                                    payment.status === 'Failed' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                                                }`}>
                                                {payment.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
