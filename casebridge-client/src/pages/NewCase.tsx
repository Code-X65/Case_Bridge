import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    FileText, Upload,
    Loader2, ShieldCheck, CreditCard, X, Clock, ArrowRight,
    AlertCircle, Check, Shield, Building2
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
    const [vaultDocs, setVaultDocs] = useState<any[]>([]);
    const [selectedVaultDocs, setSelectedVaultDocs] = useState<any[]>([]);
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
        if (data) {
            setFirms(data);
            // AUTO-SELECT if ONLY ONE firm exists (System restriction)
            if (data.length === 1) {
                setFormData(prev => ({ ...prev, preferredFirmId: data[0].id }));
            }
        }
    };

    // Transition Animation
    useGSAP(() => {
        gsap.fromTo('.step-content',
            { opacity: 0 },
            { opacity: 1, duration: 0.4, ease: 'power2.out' }
        );
    }, [step]);

    const handleNext = async () => {
        if (step === 1) { // Case Details Validation
            if (!formData.title || !formData.description || !formData.category) return;
        }

        if (step === 2) { // Just moved from Details to Documents
            // Fetch Vault Docs if not already fetched
            if (user && vaultDocs.length === 0) {
                const { data } = await supabase
                    .from('client_documents')
                    .select('*')
                    .eq('client_id', user.id)
                    .is('matter_id', null);
                setVaultDocs(data || []);
            }
        }

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

    const toggleVaultDoc = (doc: any) => {
        setSelectedVaultDocs(prev =>
            prev.find(d => d.id === doc.id)
                ? prev.filter(d => d.id !== doc.id)
                : [...prev, doc]
        );
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

            // 3. Upload New Documents
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

            // 4. Link Vault Documents
            if (selectedVaultDocs.length > 0) {
                for (const doc of selectedVaultDocs) {
                    await supabase.from('case_report_documents').insert({
                        case_report_id: caseData.id,
                        firm_id: formData.preferredFirmId,
                        file_name: doc.file_name,
                        file_path: doc.file_url, // In client_documents, file_url is the path
                        file_type: 'vault_link',
                        file_size: doc.file_size,
                        is_client_visible: true
                    });
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
                <div className="step-content glass-card max-w-2xl mx-auto text-center py-8 sm:py-12 px-5 sm:px-8">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400">
                        <ShieldCheck size={32} className="sm:w-10 sm:h-10" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold mb-4">Report a New Case</h2>
                    <p className="text-muted-foreground leading-relaxed mb-8 max-w-lg mx-auto text-sm sm:text-base">
                        This secure intake form allows you to submit case details to CaseBridge.
                        You will be asked to select an intake priority plan and make a payment before final submission.
                    </p>
                    <button onClick={handleNext} className="btn btn-primary w-full sm:w-fit sm:px-8">Start Case Report</button>
                </div>
            );

            // PHASE 2: DETAILS
            case 1: return (
                <div className="step-content glass-card max-w-2xl mx-auto p-5 sm:p-8">
                    <h2 className="text-lg sm:text-xl font-bold mb-6">Case Details</h2>
                    <div className="space-y-4 sm:space-y-6">
                        <div>
                            <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Case Category *</label>
                            <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} required className="w-full">
                                <option value="">Select a category...</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Case Title *</label>
                            <input type="text" placeholder="e.g. Contract Dispute" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required className="w-full" />
                        </div>
                        <div>
                            <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Description *</label>
                            <textarea rows={6} placeholder="Describe the situation..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required className="w-full" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Jurisdiction (Optional)</label>
                                <input type="text" value={formData.jurisdiction} onChange={e => setFormData({ ...formData, jurisdiction: e.target.value })} className="w-full" />
                            </div>
                            <div>
                                <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Managing Firm</label>
                                {firms.length === 1 ? (
                                    <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-xl py-3 px-4 text-white flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-blue-400" />
                                        <span className="font-bold">{firms[0].name}</span>
                                        <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded text-blue-300 uppercase ml-auto">Selected</span>
                                    </div>
                                ) : (
                                    <select value={formData.preferredFirmId} onChange={e => setFormData({ ...formData, preferredFirmId: e.target.value })} className="w-full">
                                        <option value="">Select a firm...</option>
                                        {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 mt-8 pt-6 border-t border-white/10">
                        <button onClick={handleBack} className="btn btn-secondary w-full sm:w-fit">Back</button>
                        <button onClick={handleNext} disabled={!formData.title || !formData.description || !formData.category} className="btn btn-primary w-full sm:w-fit">Next: Documents</button>
                    </div>
                </div>
            );

            // PHASE 3: DOCUMENTS
            case 2: return (
                <div className="step-content glass-card max-w-4xl mx-auto p-5 sm:p-8">
                    <h2 className="text-lg sm:text-xl font-bold mb-2">Supporting Documents</h2>
                    <p className="text-muted-foreground mb-8 text-sm sm:text-base">Upload new files or select from your secure vault.</p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* New Uploads */}
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Upload New</h3>
                            <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 sm:p-10 bg-white/5 mb-6 text-center">
                                <Upload size={28} className="mx-auto mb-4 text-slate-700" />
                                <input type="file" multiple onChange={handleFileChange} className="hidden" id="file-upload" />
                                <label htmlFor="file-upload" className="cursor-pointer btn btn-secondary w-full sm:w-fit mb-3">Choose Files</label>
                            </div>
                            {files.length > 0 && (
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {files.map((f, i) => (
                                        <div key={i} className="flex justify-between items-center text-xs bg-white/5 p-3 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <FileText size={14} className="text-blue-400 shrink-0" />
                                                <span className="truncate">{f.name}</span>
                                            </div>
                                            <button onClick={() => removeFile(i)} className="text-red-400 hover:bg-red-400/10 p-1.5 rounded-lg transition-colors">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Vault Selection */}
                        <div className="border-l border-white/5 pl-0 lg:pl-8">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Select from Vault</h3>
                            {vaultDocs.length === 0 ? (
                                <div className="bg-white/5 rounded-2xl p-8 text-center border border-white/5">
                                    <Shield size={24} className="mx-auto mb-3 text-slate-800" />
                                    <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">Vault is empty</p>
                                    <p className="text-[10px] text-slate-700 mt-2">New uploads can be saved to your vault after submission.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {vaultDocs.map(doc => (
                                        <button
                                            key={doc.id}
                                            onClick={() => toggleVaultDoc(doc)}
                                            className={`w-full flex items-center justify-between text-left p-3 rounded-xl border transition-all ${selectedVaultDocs.find(d => d.id === doc.id)
                                                ? 'bg-blue-600/10 border-blue-600/50 text-white'
                                                : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <FileText size={14} className={selectedVaultDocs.find(d => d.id === doc.id) ? 'text-blue-400' : 'text-slate-600'} />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold truncate">{doc.file_name}</p>
                                                    <p className="text-[8px] uppercase tracking-widest opacity-50">{doc.category}</p>
                                                </div>
                                            </div>
                                            {selectedVaultDocs.find(d => d.id === doc.id) && <Check size={14} className="text-blue-400 shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 mt-10 pt-6 border-t border-white/5">
                        <button onClick={handleBack} className="btn btn-secondary w-full sm:w-fit">Back</button>
                        <button onClick={handleNext} className="btn btn-primary w-full sm:w-fit">Next: Payment {(files.length + selectedVaultDocs.length) > 0 && `(${(files.length + selectedVaultDocs.length)})`}</button>
                    </div>
                </div>
            );

            // PHASE 4: SELECT PLAN & PAYMENT
            case 3: return (
                <div className="step-content px-4 sm:px-0 max-w-6xl mx-auto">
                    {processingPayment ? (
                        <div className="glass-card text-center py-12 sm:py-20 px-5 sm:px-8">
                            <Loader2 className="animate-spin w-12 h-12 sm:w-16 sm:h-16 text-blue-500 mx-auto mb-6" />
                            <h2 className="text-xl sm:text-2xl font-bold">Processing Secure Payment...</h2>
                            <p className="text-slate-400 mt-2 text-sm sm:text-base">Creating case file and uploading documents.</p>
                        </div>
                    ) : !invoice ? (
                        <>
                            <div className="text-center mb-10">
                                <h2 className="text-2xl sm:text-3xl font-bold mb-4">Select Intake Priority</h2>
                                <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
                                    Choose a plan defined by {firms.find(f => f.id === formData.preferredFirmId)?.name || 'the firm'} to determine how fast your case is reviewed.
                                </p>
                            </div>

                            {!formData.preferredFirmId ? (
                                <div className="glass-card text-center py-12 border-2 border-dashed border-white/10 mx-auto max-w-2xl">
                                    <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] sm:text-xs">Please select a firm in the previous step</p>
                                    <button onClick={handleBack} className="mt-4 text-sm text-blue-400 font-bold">Go Back</button>
                                </div>
                            ) : activePlans.length === 0 ? (
                                <div className="glass-card text-center py-12 border-2 border-dashed border-white/10 mx-auto max-w-2xl">
                                    <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] sm:text-xs">This firm has not yet configured priority tiers</p>
                                    <p className="text-slate-600 text-[10px] mt-2">Please select another firm or contact support.</p>
                                    <button onClick={handleBack} className="mt-4 text-sm text-blue-400 font-bold">Go Back</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {activePlans.map(plan => (
                                        <div key={plan.id} className={`relative bg-[#0F172A]/60 backdrop-blur-xl border ${plan.name.toLowerCase().includes('premium') || plan.name.toLowerCase().includes('standard') ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-white/10'} p-6 sm:p-8 rounded-[2rem] flex flex-col hover:border-blue-500 transition-all group`}>
                                            {(plan.name.toLowerCase().includes('premium') || plan.name.toLowerCase().includes('standard')) && (
                                                <div className="absolute top-0 right-0 bg-blue-600 text-[9px] sm:text-[10px] font-black px-4 py-1.5 rounded-bl-2xl rounded-tr-[1.9rem] uppercase tracking-widest">Recommended</div>
                                            )}
                                            <h3 className="font-black text-xl mb-2 text-white">{plan.name}</h3>
                                            <div className="flex items-baseline gap-1 mb-6">
                                                <span className="text-2xl sm:text-3xl font-black text-white">₦{Number(plan.price).toLocaleString()}</span>
                                                <span className="text-slate-500 text-[9px] sm:text-[10px] font-bold uppercase">/ report</span>
                                            </div>

                                            <div className="space-y-3 mb-8 flex-1">
                                                {Array.isArray(plan.features) && plan.features.map((f: any, idx: number) => (
                                                    <div key={idx} className="flex items-start gap-2">
                                                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                                        <span className="text-[11px] sm:text-xs text-slate-400 font-medium leading-relaxed">{typeof f === 'string' ? f : f.text}</span>
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
                            <div className="mt-8 sm:mt-12 flex justify-start">
                                <button onClick={handleBack} className="btn btn-secondary w-full sm:w-fit sm:px-8">Back</button>
                            </div>
                        </>
                    ) : (
                        // INVOICE CREATED -> SHOW PAY BUTTON
                        <div className="max-w-md mx-auto text-center glass-card p-6 sm:p-10">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400">
                                <CreditCard size={32} />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold mb-2">Invoice Generated</h2>
                            <p className="text-slate-400 mb-8 text-sm sm:text-base">Amount Due: <span className="text-white font-bold">₦{invoice.amount.toLocaleString()}</span></p>

                            <button onClick={handlePayClick} className="w-full py-4 bg-[#0BA4DB] hover:bg-[#0993C3] text-white font-bold rounded-xl shadow-lg mb-4 flex items-center justify-center gap-2 text-sm sm:text-base">
                                Pay Securely Now <ArrowRight size={16} />
                            </button>
                            <button onClick={() => setInvoice(null)} className="text-xs sm:text-sm text-slate-500 hover:text-white underline transition-colors">Change Plan</button>
                        </div>
                    )}
                </div>
            );

            default: return null;
        }
    };

    return (
        <>
            <div ref={containerRef} className="pb-10 sm:pb-20">
                <div className="mb-6 sm:mb-10 text-center">
                    <h1 className="text-2xl sm:text-3xl font-bold">New Case Report</h1>
                    <div className="flex justify-center gap-2 mt-4 sm:mt-6">
                        {steps.map((s, i) => (
                            <div
                                key={i}
                                className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${step >= i ? 'w-8 sm:w-10 bg-blue-500' : 'w-4 sm:w-6 bg-white/10'}`}
                                title={s.title}
                            ></div>
                        ))}
                    </div>
                </div>
                <div className="max-w-6xl mx-auto w-full px-4 sm:px-0">
                    {renderStep()}
                </div>
            </div>
        </>
    );
}
