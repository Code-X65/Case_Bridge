import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Lock, CreditCard, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { useAuth } from '../../contexts/AuthContext';

export default function InvoicePaymentPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get('redirect_to');
    const { user } = useAuth();
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchInvoice();
    }, [id]);

    const fetchInvoice = async () => {
        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            alert('Invoice not found');
            navigate('/billing/plans');
            return;
        }
        setInvoice(data);
        setLoading(false);

        // If already paid, redirect
        if (data.status === 'paid') {
            navigate('/cases/new?invoice=' + data.id);
        }
    };

    // Paystack Configuration
    const config = {
        reference: (new Date()).getTime().toString(),
        email: user?.email || 'customer@example.com',
        amount: invoice ? (invoice.amount * 100) : 0, // Paystack amount is in kobo
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_replace_me',
        currency: 'NGN',
    };

    // We instantiate the hook but don't call it immediately.
    // The hook returns an initializePayment function. 
    // We wrapper it because config depends on `invoice` state which might be null initially.
    // However, react-paystack hook doesn't like changing config. 
    // Best practice: Render the button component or use a trigger function when data is ready.
    // Here we will use the hook and only trigger when ready.

    const initializePayment = usePaystackPayment(config);

    const onSuccess = async (reference: any) => {
        setProcessing(true);
        console.log("Paystack Success:", reference);

        try {
            // Confirm payment backend-side (Simulated via RPC for now, but using REAL ref)
            const { error } = await supabase.rpc('confirm_invoice_payment', {
                p_invoice_id: id,
                p_reference: reference.reference,
                p_status: 'success'
            });

            if (error) throw error;

            // Refresh & Redirect
            await fetchInvoice();

            if (redirectTo) {
                // Append invoice ID if not present, though usually app logic handles it.
                // For CaseBridge New Case specifically:
                if (redirectTo.includes('/cases/new')) {
                    navigate(`${redirectTo}?invoice=${id}`);
                } else {
                    navigate(redirectTo);
                }
            } else {
                navigate('/cases/new?invoice=' + id);
            }
        } catch (err: any) {
            console.error('Confirmation Error:', err);
            alert('Payment was successful but system update failed. Reference: ' + reference.reference);
        } finally {
            setProcessing(false);
        }
    };

    const onClose = () => {
        console.log('Payment closed');
        setProcessing(false);
    };

    const handlePaymentClick = () => {
        if (!invoice) return;
        setProcessing(true);
        // Trigger Paystack
        initializePayment({ onSuccess, onClose });
    };

    if (loading) return (
        <>
            <div className="flex justify-center items-center py-40">
                <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
            </div>
        </>
    );

    return (
        <>
            <div className="max-w-md mx-auto py-20 relative">

                {/* Security Badge */}
                <div className="flex justify-center mb-8">
                    <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <Lock size={12} /> 256-Bit Secure Live Payment
                    </div>
                </div>

                <div className="bg-[#1E293B] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

                    <div className="text-center mb-8">
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Invoice Total</p>
                        <div className="flex items-baseline justify-center gap-1 text-white">
                            <span className="text-xl">₦</span>
                            <span className="text-5xl font-black tracking-tighter">{invoice.amount.toLocaleString()}</span>
                        </div>
                        <p className="text-slate-500 text-xs mt-4">For {invoice.plan_type.toUpperCase()} Intake Priority</p>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between text-sm py-3 border-b border-white/5">
                            <span className="text-slate-400">Invoice ID</span>
                            <span className="font-mono text-slate-300 text-xs">{invoice.id.slice(0, 8)}...</span>
                        </div>
                        <div className="flex justify-between text-sm py-3 border-b border-white/5">
                            <span className="text-slate-400">Date</span>
                            <span className="text-slate-300">{new Date(invoice.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between text-sm py-3 border-b border-white/5">
                            <span className="text-slate-400">Provider</span>
                            <span className="text-slate-300 font-bold flex items-center gap-2">
                                <CreditCard size={14} /> Paystack Live
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handlePaymentClick}
                        disabled={processing}
                        className="w-full py-4 bg-[#0BA4DB] hover:bg-[#0993C3] text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-4"
                    >
                        {processing ? <Loader2 className="animate-spin" /> : <div className="flex items-center gap-2">Pay Securely Now <ArrowRight size={16} /></div>}
                    </button>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                        <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                        <p className="text-xs text-amber-500/80 leading-relaxed">
                            <strong>Note:</strong> Your intake SLA timer ({invoice.plan_type === 'premium' ? '6h' : '24-72h'}) begins immediately after successful payment confirmation.
                        </p>
                    </div>

                </div>

                <div className="mt-8 flex justify-center gap-6 opacity-30 grayscale items-center">
                    {/* Mock Logos for Trust */}
                    <span className="text-xl font-black text-white">Paystack</span>
                    <span className="text-xl font-black text-white">Visa</span>
                    <span className="text-xl font-black text-white">Mastercard</span>
                </div>
            </div>
        </>
    );
}
