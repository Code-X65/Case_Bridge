import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, CreditCard, ArrowRight } from 'lucide-react';

export default function InvoicesPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchInvoices();
    }, [user]);

    const fetchInvoices = async () => {
        const { data } = await supabase
            .from('invoices')
            .select('*')
            .eq('client_id', user?.id)
            .order('created_at', { ascending: false });

        if (data) setInvoices(data);
        setLoading(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'pending': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'failed': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'draft': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
            default: return 'text-slate-400';
        }
    };

    return (
        <>
            <div className="max-w-5xl mx-auto py-12">
                <header className="flex justify-between items-end mb-10">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Billing History</h1>
                        <p className="text-slate-400">View and manage your intake priority invoices.</p>
                    </div>
                </header>

                <div className="glass-card overflow-hidden">
                    {loading ? (
                        <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
                    ) : invoices.length === 0 ? (
                        <div className="p-12 text-center">
                            <CreditCard size={48} className="mx-auto text-slate-600 mb-4" />
                            <h3 className="text-lg font-bold text-slate-300">No Invoices Found</h3>
                            <p className="text-slate-500 mb-6">You haven't initiated any intake priority plans yet.</p>
                            <button onClick={() => navigate('/billing/plans')} className="btn btn-primary">
                                Start New Case Intake
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-white/5 text-xs uppercase font-bold text-slate-500">
                                    <tr>
                                        <th className="px-6 py-4">Invoice ID</th>
                                        <th className="px-6 py-4">Plan / Service</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {invoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                                {inv.id.substring(0, 8)}...
                                            </td>
                                            <td className="px-6 py-4 font-medium text-white capitalize">
                                                {inv.plan_type} Intake
                                            </td>
                                            <td className="px-6 py-4 font-bold text-white">
                                                ₦{inv.amount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border ${getStatusColor(inv.status)}`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400">
                                                {new Date(inv.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {inv.status === 'paid' ? (
                                                    <button
                                                        onClick={() => navigate(`/cases/new?invoice=${inv.id}`)}
                                                        className="text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center justify-end gap-1 ml-auto"
                                                    >
                                                        Use Credit <ArrowRight size={12} />
                                                    </button>
                                                ) : inv.status === 'draft' || inv.status === 'pending' ? (
                                                    <button
                                                        onClick={() => navigate(`/billing/invoices/${inv.id}/pay`)}
                                                        className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-400 transition-colors shadow-lg shadow-blue-500/20"
                                                    >
                                                        Pay Now
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-600 text-xs">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
