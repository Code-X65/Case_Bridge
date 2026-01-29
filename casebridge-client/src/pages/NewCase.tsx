import React, { useState, useRef, useEffect } from 'react';
import ClientLayout from '../components/ClientLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    FileText, Upload,
    Loader2, ShieldCheck, CreditCard, X, Clock, ArrowRight,
    AlertCircle, Check
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { usePaystackPayment } from 'react-paystack';

const steps = [
    { title: 'Introduction', icon: ShieldCheck },
    { title: 'Case Details', icon: FileText },
    { title: 'Documents', icon: Upload },
    { title: 'Payment', icon: CreditCard },
];

export default function NewCase() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const invoiceId = searchParams.get('invoice');

    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [activePlans, setActivePlans] = useState<any[]>([]);
    // Invoice State:
    // If we have an invoice (from URL or created inline), we store it here.
    const [invoice, setInvoice] = useState<any>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [processingPayment, setProcessingPayment] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        category: '',
        title: '',
        description: '',
        jurisdiction: '',
        preferredFirmId: ''
    });

    const [firms, setFirms] = useState<any[]>([]);

    const categories = [
        'Corporate Law', 'Family Law', 'Real Estate',
        'Intellectual Property', 'Employment', 'Criminal Defense', 'Other'
    ];

    const containerRef = useRef(null);

    // Fetch plans when firm changes
    useEffect(() => {
        const fetchPlans = async () => {
            if (!formData.preferredFirmId) {
                setActivePlans([]);
                return;
            }

            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('firm_id', formData.preferredFirmId)
                .eq('status', 'active')
                .order('price', { ascending: true });

            if (error) {
                console.error("Error fetching plans:", error);
            } else {
                setActivePlans(data || []);
            }
        };
        fetchPlans();
    }, [formData.preferredFirmId]);

    // Initial check for existing invoice (if user navigated away and came back)
    useEffect(() => {
        const checkInvoice = async () => {
            if (!user) return;
            if (invoiceId) {
                const { data, error } = await supabase.from('invoices').select('*').eq('id', invoiceId).single();
                if (error) console.error("Error fetching invoice:", error);
                if (data && data.status === 'paid') {
                    const { count } = await supabase.from('case_reports').select('*', { count: 'exact', head: true }).eq('invoice_id', invoiceId);
                    if (count === 0) {
                        setInvoice(data);
                    }
                }
            }
        };
        checkInvoice();
        fetchFirms();
    }, [user, invoiceId]);

    const fetchFirms = async () => {
        const { data } = await supabase.from('firms').select('id, name').eq('status', 'active');
        if (data) setFirms(data);
    };

    // Transition Animation
    useGSAP(() => {
        gsap.fromTo('.step-content',
            { opacity: 0, x: 20 },
            { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }
        );
    }, [step]);

    const handleNext = () => {
        if (step === 1) { // Case Details Validation
            if (!formData.title || !formData.description || !formData.category) return;
        }
        // If moving to Payment Step (Index 3)
        // Check if invoice is already paid? Use logic inside render to show "Already Paid"

        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    // --- PAYMENT & SUBMISSION LOGIC ---

    const handleCreateInvoice = async (plan: any) => {
        setLoading(true);
        try {
            // Create Invoice
            const { data: inv, error } = await supabase
                .from('invoices')
                .insert({
                    client_id: user?.id,
                    firm_id: formData.preferredFirmId,
                    invoice_number: `INV-${Date.now()}`,
                    plan_type: plan.name, // Use plan name or ID? Let's use name as it's more human-readable in legacy fields
                    amount: plan.price,
                    status: 'draft'
                })
                .select()
                .single();

            if (error) throw error;
            setInvoice(inv);
        } catch (err: any) {
            console.error(err);
            alert("Error creating invoice: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Paystack Configuration Helper
    const getPaystackConfig = () => ({
        reference: (new Date()).getTime().toString(),
        email: user?.email || 'user@example.com',
        amount: invoice ? (invoice.amount * 100) : 0,
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_replace_me',
        currency: 'NGN',
    });

    // We instantiate hook manually when needed (button click)
    const initializePayment = usePaystackPayment(getPaystackConfig());

    const handlePaymentSuccess = async (reference: any) => {
        setProcessingPayment(true);
        console.log("Paystack Success:", reference);

        try {
            // 1. Confirm Invoice Payment
            const { error: payError } = await supabase.rpc('confirm_invoice_payment', {
                p_invoice_id: invoice.id,
                p_reference: reference.reference,
                p_status: 'success'
            });

            if (payError) throw payError;

            // 2. IMMEDIATE CASE SUBMISSION
            await submitCase(invoice.id, invoice.plan_type);

        } catch (err: any) {
            console.error('Processing Error:', err);
            alert('Payment succeeded but case submission failed: ' + err.message);
            setProcessingPayment(false);
        }
    };

    const handlePayClick = () => {
        if (!invoice) return;
        initializePayment({
            onSuccess: handlePaymentSuccess,
            onClose: () => console.log("Payment closed")
        });
    };

    // REFACTORED SUBMISSION FUNCTION
    const submitCase = async (verifiedInvoiceId: string, planType: string) => {
        try {
            const { data: caseData, error: caseError } = await supabase
                .from('case_reports')
                .insert({
                    client_id: user?.id,
                    category: formData.category,
                    title: formData.title,
                    description: formData.description,
                    jurisdiction: formData.jurisdiction,
                    preferred_firm_id: formData.preferredFirmId || null,
                    status: 'submitted',
                    invoice_id: verifiedInvoiceId,
                    intake_plan: planType
                })
                .select()
                .single();

            if (caseError) throw caseError;

            // 3. Upload Documents
            if (files.length > 0) {
                for (const file of files) {
                    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                    const filePath = `reports/${caseData.id}/${sanitizedName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('case_documents')
                        .upload(filePath, file);

                    if (!uploadError) {
                        await supabase.from('case_report_documents').insert({
                            case_report_id: caseData.id,
                            firm_id: formData.preferredFirmId,
                            file_name: file.name,
                            file_path: filePath,
                            file_type: file.type,
                            file_size: file.size,
                            is_client_visible: true
                        });
                    }
                }
            }

            // SUCCESS -> Redirect
            navigate('/cases');

        } catch (err: any) {
            console.error("Submission Error", err);
            // Critical failure after payment? Ideally shouldn't happen.
            // If it does, user has a paid invoice and can retry?
            alert("Case creation failed: " + err.message);
            setProcessingPayment(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            // PHASE 1: INTRO
            case 0: return (
                <div className="step-content glass-card max-w-2xl mx-auto text-center py-12">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400">
                        <ShieldCheck size={40} />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Report a New Case</h2>
                    <p className="text-muted-foreground leading-relaxed mb-8 max-w-lg mx-auto">
                        This secure intake form allows you to submit case details to CaseBridge.
                        You will be asked to select an intake priority plan and make a payment before final submission.
                    </p>
                    <button onClick={handleNext} className="btn btn-primary w-fit px-8">Start Case Report</button>
                </div>
            );

            // PHASE 2: DETAILS
            case 1: return (
                <div className="step-content glass-card max-w-2xl mx-auto">
                    <h2 className="text-xl font-bold mb-6">Case Details</h2>
                    <div className="space-y-6">
                        <div>
                            <label>Case Category *</label>
                            <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} required>
                                <option value="">Select a category...</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label>Case Title *</label>
                            <input type="text" placeholder="e.g. Contract Dispute" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                        </div>
                        <div>
                            <label>Description *</label>
                            <textarea rows={6} placeholder="Describe the situation..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
                        </div>
                        {/* Optional Fields Omitted for brevity in this specific snippet but can be kept */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label>Jurisdiction (Optional)</label>
                                <input type="text" value={formData.jurisdiction} onChange={e => setFormData({ ...formData, jurisdiction: e.target.value })} />
                            </div>
                            <div>
                                <label>Preferred Firm</label>
                                <select value={formData.preferredFirmId} onChange={e => setFormData({ ...formData, preferredFirmId: e.target.value })} className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-4 py-2 text-white">
                                    <option value="">Select a firm...</option>
                                    {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
                        <button onClick={handleBack} className="btn btn-secondary w-fit">Back</button>
                        <button onClick={handleNext} disabled={!formData.title || !formData.description || !formData.category} className="btn btn-primary w-fit">Next: Documents</button>
                    </div>
                </div>
            );

            // PHASE 3: DOCUMENTS
            case 2: return (
                <div className="step-content glass-card max-w-2xl mx-auto text-center py-12">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6"><Upload size={32} /></div>
                    <h2 className="text-xl font-bold mb-2">Supporting Documents</h2>
                    <p className="text-muted-foreground mb-8">Upload any relevant files. Multiple supported.</p>
                    <div className="border-2 border-dashed border-white/20 rounded-lg p-10 bg-white/5 mb-6">
                        <input type="file" multiple onChange={handleFileChange} className="hidden" id="file-upload" />
                        <label htmlFor="file-upload" className="cursor-pointer btn btn-secondary w-fit mb-3">Choose Files</label>
                    </div>
                    {files.length > 0 && (
                        <div className="text-left bg-white/5 rounded-lg p-4 mb-8 space-y-2">
                            {files.map((f, i) => (
                                <div key={i} className="flex justify-between text-sm"><span className="truncate">{f.name}</span> <button onClick={() => removeFile(i)} className="text-red-400"><X size={12} /></button></div>
                            ))}
                        </div>
                    )}
                    <div className="flex justify-between mt-8"><button onClick={handleBack} className="btn btn-secondary">Back</button><button onClick={handleNext} className="btn btn-primary">Next: Payment</button></div>
                </div>
            );

            // PHASE 4: SELECT PLAN & PAYMENT
            case 3: return (
                <div className="step-content glass-card max-w-4xl mx-auto py-12">
                    {processingPayment ? (
                        <div className="text-center py-20">
                            <Loader2 className="animate-spin w-16 h-16 text-blue-500 mx-auto mb-6" />
                            <h2 className="text-2xl font-bold">Processing Secure Payment...</h2>
                            <p className="text-slate-400 mt-2">Creating case file and uploading documents.</p>
                        </div>
                    ) : !invoice ? (
                        <>
                            <h2 className="text-3xl font-bold text-center mb-4">Select Intake Priority</h2>
                            <p className="text-center text-slate-400 mb-10 max-w-2xl mx-auto">
                                Choose a plan defined by {firms.find(f => f.id === formData.preferredFirmId)?.name || 'the firm'} to determine how fast your case is reviewed.
                            </p>

                            {!formData.preferredFirmId ? (
                                <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-2xl">
                                    <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Please select a firm in the previous step</p>
                                    <button onClick={handleBack} className="mt-4 text-sm text-blue-400 font-bold">Go Back</button>
                                </div>
                            ) : activePlans.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-2xl">
                                    <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">This firm has not yet configured priority tiers</p>
                                    <p className="text-slate-600 text-[10px] mt-2">Please select another firm or contact support.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {activePlans.map(plan => (
                                        <div key={plan.id} className={`relative bg-[#0F172A] border ${plan.name.toLowerCase().includes('premium') || plan.name.toLowerCase().includes('standard') ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-white/10'} p-8 rounded-[2rem] flex flex-col hover:border-blue-500 transition-all group`}>
                                            {(plan.name.toLowerCase().includes('premium') || plan.name.toLowerCase().includes('standard')) && (
                                                <div className="absolute top-0 right-0 bg-blue-600 text-[10px] font-black px-4 py-1.5 rounded-bl-2xl rounded-tr-[1.9rem] uppercase tracking-widest">Recommended</div>
                                            )}
                                            <h3 className="font-black text-xl mb-2 text-white">{plan.name}</h3>
                                            <div className="flex items-baseline gap-1 mb-6">
                                                <span className="text-3xl font-black text-white">₦{Number(plan.price).toLocaleString()}</span>
                                                <span className="text-slate-500 text-[10px] font-bold uppercase">/ report</span>
                                            </div>

                                            <div className="space-y-3 mb-8 flex-1">
                                                {Array.isArray(plan.features) && plan.features.map((f: any, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                        <span className="text-xs text-slate-400 font-medium">{typeof f === 'string' ? f : f.text}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => handleCreateInvoice(plan)}
                                                disabled={loading}
                                                className="w-full py-4 bg-white/5 group-hover:bg-blue-600 border border-white/5 group-hover:border-blue-600 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-[0.98] disabled:opacity-50"
                                            >
                                                {loading ? 'Preparing...' : 'Select Plan'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="mt-12 flex justify-start"><button onClick={handleBack} className="btn btn-secondary px-8">Back</button></div>
                        </>
                    ) : (
                        // INVOICE CREATED -> SHOW PAY BUTTON
                        <div className="max-w-md mx-auto text-center">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400"><CreditCard size={32} /></div>
                            <h2 className="text-2xl font-bold mb-2">Invoice Generated</h2>
                            <p className="text-slate-400 mb-8">Amount Due: <span className="text-white font-bold">₦{invoice.amount.toLocaleString()}</span></p>

                            <button onClick={handlePayClick} className="w-full py-4 bg-[#0BA4DB] hover:bg-[#0993C3] text-white font-bold rounded-xl shadow-lg mb-4 flex items-center justify-center gap-2">
                                Pay Securely Now <ArrowRight size={16} />
                            </button>
                            <button onClick={() => setInvoice(null)} className="text-sm text-slate-500 hover:text-white underline">Change Plan</button>
                        </div>
                    )}
                </div>
            );

            default: return null;
        }
    };

    return (
        <ClientLayout>
            <div ref={containerRef} className="pb-20">
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-bold">New Case Report</h1>
                    <div className="flex justify-center gap-2 mt-6">
                        {steps.map((_, i) => (
                            <div key={i} className={`h-2 w-8 rounded-full transition-all ${step >= i ? 'bg-blue-500' : 'bg-white/10'}`}></div>
                        ))}
                    </div>
                </div>
                {renderStep()}
            </div>
        </ClientLayout>
    );
}
