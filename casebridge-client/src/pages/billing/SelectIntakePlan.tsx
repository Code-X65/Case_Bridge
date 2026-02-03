import { useNavigate } from 'react-router-dom';
import { Shield, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

const PLANS = [
    {
        id: 'basic',
        name: 'Basic Intake',
        price: '7,000',
        amount: 7000.00,
        sla: '72 Hours',
        features: ['Standard Review Queue', 'Email Notifications', 'Secure Document Vault'],
        color: 'from-slate-700 to-slate-900',
        recommended: false
    },
    {
        id: 'standard',
        name: 'Standard Priority',
        price: '15,000',
        amount: 15000.00,
        sla: '24 Hours',
        features: ['Priority Review Queue', 'SMS & Email Alerts', 'Associate Callback'],
        color: 'from-blue-600 to-indigo-700',
        recommended: true
    },
    {
        id: 'premium',
        name: 'Emergency Express',
        price: '30,000',
        amount: 30000.00,
        sla: '4–6 Hours',
        features: ['Immediate Assignment', 'Direct Partner Review', 'Urgent Handling'],
        color: 'from-amber-500 to-orange-600',
        recommended: false
    }
];

export default function SelectIntakePlan() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [processing, setProcessing] = useState<string | null>(null);

    const handleSelectPlan = async (plan: any) => {
        setProcessing(plan.id);

        try {
            // Create Invoice
            const { data: invoice, error } = await supabase
                .from('invoices')
                .insert({
                    client_id: user?.id,
                    plan_type: plan.id,
                    amount: plan.amount,
                    status: 'draft'
                })
                .select()
                .single();

            if (error) throw error;

            // Navigate to Payment
            const redirectTo = new URLSearchParams(window.location.search).get('redirect_to');
            const target = `/billing/invoices/${invoice.id}/pay` + (redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : '');
            navigate(target);

        } catch (err) {
            console.error(err);
            alert('Could not start billing process. Please try again.');
        } finally {
            setProcessing(null);
        }
    };

    return (
        <>
            <div className="max-w-5xl mx-auto py-12">
                <header className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Choose Your Intake Speed
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
                        CaseBridge processes thousands of reports. Select a priority level to determine how fast our legal team reviews your initial submission.
                    </p>
                    <div className="mt-8 inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest">
                        <Shield size={14} /> Official Case Opening Fee
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {PLANS.map((plan) => (
                        <div key={plan.id} className="relative group">
                            {/* Glow Effect */}
                            <div className={`absolute -inset-0.5 bg-gradient-to-br ${plan.color} rounded-3xl opacity-30 group-hover:opacity-100 transition duration-500 blur`}></div>

                            <div className="relative bg-[#0F172A] border border-white/10 p-8 rounded-3xl h-full flex flex-col">
                                {plan.recommended && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/50">
                                        Most Popular
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-lg text-slate-400">₦</span>
                                        <span className="text-4xl font-black text-white tracking-tight">{plan.price}</span>
                                    </div>
                                </div>

                                <div className="bg-white/5 rounded-xl p-4 mb-8 border border-white/5">
                                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Guaranteed SLA</p>
                                    <div className="flex items-center gap-2 text-white font-bold">
                                        <Clock size={16} className={plan.id === 'premium' ? 'text-amber-400' : 'text-indigo-400'} />
                                        Review within {plan.sla}
                                    </div>
                                </div>

                                <ul className="space-y-4 mb-8 flex-1">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                                            <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleSelectPlan(plan)}
                                    disabled={!!processing}
                                    className={`w-full py-4 text-white font-bold rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 ${processing === plan.id ? 'opacity-70 cursor-wait' : 'hover:scale-[1.02]'
                                        } bg-gradient-to-r ${plan.color}`}
                                >
                                    {processing === plan.id ? 'Starting...' : 'Select Plan'} <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="text-center text-slate-500 text-xs mt-12 max-w-xl mx-auto">
                    Note: This fee covers the administrative cost of the initial case review and intake processing. It does not guarantee case acceptance or constitute legal representation fees.
                </p>
            </div>
        </>
    );
}
