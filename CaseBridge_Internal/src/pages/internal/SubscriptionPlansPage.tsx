import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import InternalSidebar from '@/components/layout/InternalSidebar';
import {
    Loader2, Plus, Trash2, Check,
    Zap, Gem, Target, Save,
    Edit3, Shield
} from 'lucide-react';

interface PlanFeature {
    text: string;
    included: boolean;
}

interface SubscriptionPlan {
    id: string;
    name: string;
    description: string;
    price: number;
    features: PlanFeature[];
    status: 'active' | 'archived';
}

const TIERS = ['Basic', 'Standard', 'Premium'];

export default function SubscriptionPlansPage() {
    const { session } = useInternalSession();
    const queryClient = useQueryClient();
    const [selectedTier, setSelectedTier] = useState<string>('Basic');

    // Form state for editing
    const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({
        name: 'Basic',
        description: '',
        price: 0,
        features: [],
        status: 'active'
    });

    const [newFeature, setNewFeature] = useState('');

    const { data: plans, isLoading } = useQuery({
        queryKey: ['subscription_plans', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('firm_id', session!.firm_id);

            if (error) throw error;
            return data as SubscriptionPlan[];
        }
    });

    // When a tier is selected, find it in the data or reset to default
    useEffect(() => {
        const existing = plans?.find(p => p.name.toLowerCase() === selectedTier.toLowerCase());
        if (existing) {
            setFormData(existing);
        } else {
            setFormData({
                name: selectedTier,
                description: `Default ${selectedTier} plan features.`,
                price: 0,
                features: [],
                status: 'active'
            });
        }
    }, [selectedTier, plans]);

    const saveMutation = useMutation({
        mutationFn: async (plan: Partial<SubscriptionPlan>) => {
            const existing = plans?.find(p => p.name.toLowerCase() === selectedTier.toLowerCase());

            if (existing) {
                const { error } = await supabase
                    .from('subscription_plans')
                    .update({
                        price: plan.price,
                        features: plan.features,
                        description: plan.description,
                        status: 'active',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('subscription_plans')
                    .insert([{
                        name: selectedTier,
                        price: plan.price,
                        features: plan.features,
                        description: plan.description,
                        firm_id: session!.firm_id,
                        status: 'active'
                    }]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscription_plans'] });
            alert(`${selectedTier} plan updated successfully.`);
        },
        onError: (err: any) => alert(err.message)
    });

    const addFeature = () => {
        if (!newFeature.trim()) return;
        setFormData(prev => ({
            ...prev,
            features: [...(prev.features || []), { text: newFeature, included: true }]
        }));
        setNewFeature('');
    };

    const removeFeature = (index: number) => {
        setFormData(prev => ({
            ...prev,
            features: (prev.features || []).filter((_, i) => i !== index)
        }));
    };

    if (isLoading) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

    return (
        <div className="min-h-screen bg-[#0F172A] text-white font-sans">
            <InternalSidebar />

            <main className="ml-64 p-12 max-w-7xl">
                <header className="mb-12">
                    <h1 className="text-4xl font-black mb-2 tracking-tight">Plan Governance</h1>
                    <p className="text-slate-400 text-lg">Manage features and pricing for the three standard service tiers.</p>
                </header>

                {/* Tier Selector Tabs */}
                <div className="flex gap-4 mb-10 bg-white/5 p-2 rounded-2xl w-fit">
                    {TIERS.map(tier => (
                        <button
                            key={tier}
                            onClick={() => setSelectedTier(tier)}
                            className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${selectedTier === tier
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            {tier}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* PLAN EDITOR */}
                    <div className="lg:col-span-5 space-y-8">
                        <section className="bg-[#1E293B] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Shield className="w-24 h-24" />
                            </div>

                            <h2 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                                <Edit3 className="w-4 h-4" /> Configure {selectedTier} Tier
                            </h2>

                            <div className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Plan Identifier (Read Only)</label>
                                    <div className="w-full bg-[#0F172A]/50 border border-slate-800 rounded-2xl p-4 text-slate-500 font-bold">
                                        {selectedTier}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Fee (NGN)</label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative flex-1">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₦</span>
                                            <input
                                                type="number"
                                                value={formData.price}
                                                onChange={e => setFormData(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                                                className="w-full bg-[#0F172A] border border-slate-700 rounded-2xl py-4 pl-10 pr-4 text-xl font-black text-white focus:border-indigo-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Include Features</label>
                                    <div className="flex gap-2 mb-4">
                                        <input
                                            type="text"
                                            placeholder="e.g. 24/7 Priority Support"
                                            value={newFeature}
                                            onChange={e => setNewFeature(e.target.value)}
                                            onKeyPress={e => e.key === 'Enter' && addFeature()}
                                            className="flex-1 bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none"
                                        />
                                        <button
                                            onClick={addFeature}
                                            className="bg-indigo-600 px-4 rounded-xl hover:bg-indigo-500 transition-colors"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                        {formData.features?.map((f, i) => (
                                            <div key={i} className="flex items-center justify-between bg-[#0F172A]/50 p-4 rounded-xl group border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                                    <span className="text-sm font-medium text-slate-200">{f.text}</span>
                                                </div>
                                                <button
                                                    onClick={() => removeFeature(i)}
                                                    className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {formData.features?.length === 0 && (
                                            <p className="text-center py-8 text-xs text-slate-600 italic">No features added yet</p>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => saveMutation.mutate(formData)}
                                    disabled={saveMutation.isPending}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {saveMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                                    Deploy {selectedTier} Plan
                                </button>
                            </div>
                        </section>
                    </div>

                    {/* LIVE PREVIEW CARD */}
                    <div className="lg:col-span-7 flex items-start justify-center pt-8">
                        <div className="w-full max-w-md">
                            <div className="text-center mb-8">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 text-center">Live Client View</p>
                                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full" />
                            </div>

                            <div className="bg-[#1E293B] border-2 border-indigo-500/30 rounded-[3rem] p-12 shadow-2xl relative">
                                {selectedTier === 'Premium' && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                                        Most Popular
                                    </div>
                                )}

                                <div className="text-center mb-10">
                                    <div className="w-16 h-16 bg-indigo-600/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
                                        {selectedTier === 'Basic' ? <Target className="w-8 h-8 text-indigo-400" /> :
                                            selectedTier === 'Standard' ? <Zap className="w-8 h-8 text-indigo-400" /> :
                                                <Gem className="w-8 h-8 text-indigo-400" />}
                                    </div>
                                    <h3 className="text-3xl font-black text-white mb-2">{formData.name}</h3>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="text-5xl font-black text-white">₦{formData.price?.toLocaleString()}</span>
                                        <span className="text-slate-500 font-bold">/ report</span>
                                    </div>
                                </div>

                                <div className="space-y-6 mb-12">
                                    {formData.features?.map((f, i) => (
                                        <div key={i} className="flex items-center gap-4">
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            </div>
                                            <span className="text-slate-300 font-medium">{f.text}</span>
                                        </div>
                                    ))}
                                    {formData.features?.length === 0 && (
                                        <div className="py-4 text-center">
                                            <p className="text-slate-600 text-sm">Add features to see them here</p>
                                        </div>
                                    )}
                                </div>

                                <button className="w-full bg-white text-[#0F172A] py-5 rounded-2xl font-black uppercase tracking-widest text-xs pointer-events-none opacity-50">
                                    Select {selectedTier}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
