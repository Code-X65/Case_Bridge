import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    FileText, Upload,
    Loader2, ShieldCheck, CreditCard, X, Clock, ArrowRight,
    AlertCircle, Check, Shield, Building2, ChevronRight, ChevronLeft
} from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';

const steps = [
    { title: 'Introduction', icon: ShieldCheck },
    { title: 'Details', icon: FileText },
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
        adverse_parties: '',
        preferredFirmId: ''
    });

    const [firms, setFirms] = useState<any[]>([]);

    const categories = [
        'Corporate Law', 'Family Law', 'Real Estate',
        'Intellectual Property', 'Employment', 'Criminal Defense', 'Other'
    ];

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
            if (data.length === 1) {
                setFormData(prev => ({ ...prev, preferredFirmId: data[0].id }));
            }
        }
    };

    const handleNext = async () => {
        if (step === 1) { // Case Details Validation
            if (!formData.title || !formData.description || !formData.category) return;
        }

        if (step === 2) { // Just moved from Details to Documents
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
        window.scrollTo(0, 0);
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
        window.scrollTo(0, 0);
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

    const handleCreateInvoice = async (plan: any) => {
        setLoading(true);
        try {
            const { data: inv, error } = await supabase
                .from('invoices')
                .insert({
                    client_id: user?.id,
                    firm_id: formData.preferredFirmId,
                    invoice_number: `INV-${Date.now()}`,
                    plan_type: plan.name,
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

    const getPaystackConfig = () => ({
        reference: (new Date()).getTime().toString(),
        email: user?.email || 'user@example.com',
        amount: invoice ? (invoice.amount * 100) : 0,
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_replace_me',
        currency: 'NGN',
    });

    const initializePayment = usePaystackPayment(getPaystackConfig());

    const handlePaymentSuccess = async (reference: any) => {
        setProcessingPayment(true);
        console.log("Paystack Success:", reference);

        try {
            const { error: payError } = await supabase.rpc('confirm_invoice_payment', {
                p_invoice_id: invoice.id,
                p_reference: reference.reference,
                p_status: 'success'
            });

            if (payError) throw payError;
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
                    adverse_parties: formData.adverse_parties,
                    preferred_firm_id: formData.preferredFirmId || null,
                    status: 'submitted',
                    invoice_id: verifiedInvoiceId,
                    intake_plan: planType
                })
                .select()
                .single();

            if (caseError) throw caseError;

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

            if (selectedVaultDocs.length > 0) {
                for (const doc of selectedVaultDocs) {
                    await supabase.from('case_report_documents').insert({
                        case_report_id: caseData.id,
                        firm_id: formData.preferredFirmId,
                        file_name: doc.file_name,
                        file_path: doc.file_url,
                        file_type: 'vault_link',
                        file_size: doc.file_size,
                        is_client_visible: true
                    });
                }
            }

            navigate('/cases');

        } catch (err: any) {
            console.error("Submission Error", err);
            alert("Case creation failed: " + err.message);
            setProcessingPayment(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 0: return (
                <div className="bg-card border border-border shadow-neumorph rounded-[2rem] max-w-2xl mx-auto text-center p-8 sm:p-12 animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -z-10 pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                    <div className="w-20 h-20 bg-input border border-border rounded-full flex items-center justify-center mx-auto mb-8 text-primary shadow-sm relative z-10">
                        <ShieldCheck size={36} />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black mb-4 text-foreground tracking-tight z-10 relative">Report a New Case</h2>
                    <p className="text-muted-foreground leading-relaxed mb-10 max-w-lg mx-auto text-sm sm:text-base z-10 relative">
                        This secure intake form allows you to submit case details to CaseBridge.
                        You will be asked to provide details, attach documents, and select an intake priority plan.
                    </p>
                    <button onClick={handleNext} className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-[var(--radius-neumorph)] shadow-[0_0_15px_rgba(201,162,77,0.3)] hover:shadow-[0_0_20px_rgba(201,162,77,0.4)] transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-wider mx-auto active:scale-95 group z-10 relative">
                        Start Intake Process
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            );

            case 1: return (
                <div className="bg-card border border-border shadow-neumorph rounded-[2rem] max-w-2xl mx-auto p-6 sm:p-10 animate-fade-in">
                    <h2 className="text-xl sm:text-2xl font-black mb-8 text-foreground tracking-tight">Case Details</h2>
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Case Category *</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                required
                                className="w-full bg-input border border-border rounded-xl py-3.5 px-4 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner"
                            >
                                <option value="" disabled>Select a category...</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Case Title *</label>
                            <input
                                type="text"
                                placeholder="e.g. Contract Dispute with Vendor"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                required
                                className="w-full bg-input border border-border rounded-xl py-3.5 px-4 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Description *</label>
                            <textarea
                                rows={6}
                                placeholder="Describe the situation in detail..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                required
                                className="w-full bg-input border border-border rounded-xl py-4 px-4 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Adverse Parties (Opponent)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. John Doe, ABC Corp"
                                    value={formData.adverse_parties}
                                    onChange={e => setFormData({ ...formData, adverse_parties: e.target.value })}
                                    className="w-full bg-input border border-border rounded-xl py-3.5 px-4 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Jurisdiction (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Lagos, Nigeria"
                                    value={formData.jurisdiction}
                                    onChange={e => setFormData({ ...formData, jurisdiction: e.target.value })}
                                    className="w-full bg-input border border-border rounded-xl py-3.5 px-4 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Managing Firm</label>
                                {firms.length === 1 ? (
                                    <div className="w-full bg-primary/10 border border-primary/20 rounded-xl py-3.5 px-4 text-foreground flex items-center gap-3 shadow-sm">
                                        <Building2 className="w-4 h-4 text-primary" />
                                        <span className="font-bold text-sm truncate">{firms[0].name}</span>
                                        <span className="text-[9px] bg-primary/20 px-2 py-0.5 rounded text-primary font-bold uppercase ml-auto shrink-0 border border-primary/20">Selected</span>
                                    </div>
                                ) : (
                                    <select
                                        value={formData.preferredFirmId}
                                        onChange={e => setFormData({ ...formData, preferredFirmId: e.target.value })}
                                        className="w-full bg-input border border-border rounded-xl py-3.5 px-4 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner"
                                    >
                                        <option value="" disabled>Select a firm...</option>
                                        {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-8 pt-6 border-t border-border">
                        <button onClick={handleBack} className="w-full sm:w-auto px-6 py-3.5 bg-input hover:bg-card border border-border text-foreground rounded-[var(--radius-neumorph)] text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2">
                            <ChevronLeft size={16} /> Back
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={!formData.title || !formData.description || !formData.category}
                            className="w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-[var(--radius-neumorph)] shadow-[0_0_15px_rgba(201,162,77,0.3)] disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-95 group"
                        >
                            Next: Documents <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            );

            case 2: return (
                <div className="bg-card border border-border shadow-neumorph rounded-[2rem] max-w-4xl mx-auto p-6 sm:p-10 animate-fade-in">
                    <h2 className="text-xl sm:text-2xl font-black mb-2 text-foreground tracking-tight">Supporting Documents</h2>
                    <p className="text-muted-foreground mb-8 text-sm">Upload new files or quickly attach documents from your secure vault.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                        {/* New Uploads */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Upload size={16} className="text-primary" />
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Upload New</h3>
                            </div>
                            <div className="border border-dashed border-border rounded-2xl p-8 bg-input/50 mb-6 text-center shadow-inner hover:border-primary/50 transition-colors">
                                <Upload size={32} className="mx-auto mb-4 text-muted-foreground/60" />
                                <input type="file" multiple onChange={handleFileChange} className="hidden" id="file-upload" />
                                <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center justify-center px-6 py-3 bg-card border border-border text-foreground rounded-[var(--radius-neumorph)] text-xs font-bold uppercase tracking-wider hover:border-primary/50 hover:text-primary transition-all shadow-sm">
                                    Browse Files
                                </label>
                            </div>
                            {files.length > 0 && (
                                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 no-scrollbar">
                                    {files.map((f, i) => (
                                        <div key={i} className="flex justify-between items-center bg-card border border-border p-3.5 rounded-xl shadow-sm">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                    <FileText size={14} />
                                                </div>
                                                <span className="truncate text-sm font-bold text-foreground pr-4">{f.name}</span>
                                            </div>
                                            <button onClick={() => removeFile(i)} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-white rounded-lg transition-colors border border-transparent hover:border-destructive shrink-0">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Vault Selection */}
                        <div className="md:border-l md:border-border md:pl-12 pt-8 md:pt-0 border-t border-border md:border-t-0">
                            <div className="flex items-center gap-2 mb-4">
                                <Shield size={16} className="text-primary" />
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Select from Vault</h3>
                            </div>

                            {vaultDocs.length === 0 ? (
                                <div className="bg-input/50 border border-border rounded-2xl p-8 text-center shadow-inner">
                                    <Shield size={32} className="mx-auto mb-3 text-muted-foreground/50" />
                                    <p className="text-xs text-foreground font-bold uppercase tracking-widest">Vault is empty</p>
                                    <p className="text-[10px] text-muted-foreground mt-2 max-w-[200px] mx-auto">New uploads can be automatically saved to your vault after submission.</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                                    {vaultDocs.map(doc => (
                                        <button
                                            key={doc.id}
                                            onClick={() => toggleVaultDoc(doc)}
                                            className={`w-full flex items-center justify-between text-left p-3.5 rounded-xl border transition-all shadow-sm
                                                ${selectedVaultDocs.find(d => d.id === doc.id)
                                                    ? 'bg-primary/10 border-primary shadow-[0_0_10px_rgba(201,162,77,0.15)] ring-1 ring-primary/20'
                                                    : 'bg-card border-border hover:border-primary/40 hover:bg-input'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors
                                                    ${selectedVaultDocs.find(d => d.id === doc.id) ? 'bg-primary text-primary-foreground' : 'bg-input border border-border text-muted-foreground'}`
                                                }>
                                                    <FileText size={14} />
                                                </div>
                                                <div className="min-w-0 pr-4">
                                                    <p className={`text-sm font-bold truncate transition-colors ${selectedVaultDocs.find(d => d.id === doc.id) ? 'text-primary' : 'text-foreground'}`}>{doc.file_name}</p>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">{doc.category}</p>
                                                </div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all
                                                ${selectedVaultDocs.find(d => d.id === doc.id) ? 'bg-primary border-primary text-primary-foreground scale-110' : 'bg-input border-border text-transparent scale-100'}`
                                            }>
                                                <Check size={12} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-10 pt-6 border-t border-border">
                        <button onClick={handleBack} className="w-full sm:w-auto px-6 py-3.5 bg-input hover:bg-card border border-border text-foreground rounded-[var(--radius-neumorph)] text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2">
                            <ChevronLeft size={16} /> Back
                        </button>
                        <button onClick={handleNext} className="w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-[var(--radius-neumorph)] shadow-[0_0_15px_rgba(201,162,77,0.3)] transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-95 group">
                            Next: Payment {(files.length + selectedVaultDocs.length) > 0 && `(${(files.length + selectedVaultDocs.length)})`} <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            );

            case 3: return (
                <div className="animate-fade-in">
                    {processingPayment ? (
                        <div className="bg-card border border-border shadow-neumorph rounded-[2rem] max-w-lg mx-auto text-center py-16 px-8">
                            <div className="relative w-20 h-20 mx-auto mb-8">
                                <div className="absolute inset-0 border-4 border-input rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                                <Shield className="absolute inset-0 m-auto text-primary w-8 h-8 animate-pulse" />
                            </div>
                            <h2 className="text-2xl font-black mb-2 text-foreground">Processing Secure Payment</h2>
                            <p className="text-muted-foreground text-sm">Please do not close this window. We are creating your case file and securely encrypting documents.</p>
                        </div>
                    ) : !invoice ? (
                        <div className="max-w-5xl mx-auto">
                            <div className="text-center mb-10">
                                <h2 className="text-2xl sm:text-3xl font-black mb-3 text-foreground tracking-tight">Select Intake Priority</h2>
                                <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
                                    Choose an intake plan defined by <span className="text-foreground font-bold">{firms.find(f => f.id === formData.preferredFirmId)?.name || 'the firm'}</span> to determine how quickly your case is reviewed.
                                </p>
                            </div>

                            {!formData.preferredFirmId ? (
                                <div className="bg-card/50 border border-dashed border-border rounded-[2rem] text-center py-16 max-w-2xl mx-auto shadow-neumorph-inset">
                                    <div className="w-16 h-16 bg-input rounded-full border border-border flex items-center justify-center mx-auto mb-4">
                                        <AlertCircle className="w-8 h-8 text-muted-foreground/60" />
                                    </div>
                                    <p className="text-foreground font-bold mb-4">Firm Not Selected</p>
                                    <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">Please go back to step 1 and select a firm to see their available priority tiers.</p>
                                    <button onClick={() => setStep(1)} className="px-6 py-2 bg-card border border-border rounded-[var(--radius-neumorph)] text-xs font-bold uppercase tracking-widest text-primary hover:border-primary/50 transition-colors shadow-sm">Edit Details</button>
                                </div>
                            ) : activePlans.length === 0 ? (
                                <div className="bg-card/50 border border-dashed border-border rounded-[2rem] text-center py-16 max-w-2xl mx-auto shadow-neumorph-inset">
                                    <div className="w-16 h-16 bg-input rounded-full border border-border flex items-center justify-center mx-auto mb-4">
                                        <Clock className="w-8 h-8 text-muted-foreground/60" />
                                    </div>
                                    <p className="text-foreground font-bold mb-2">No Plans Available</p>
                                    <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">This firm has not yet configured priority tiers. Please select another firm or contact support.</p>
                                    <button onClick={() => setStep(1)} className="px-6 py-2 bg-card border border-border rounded-[var(--radius-neumorph)] text-xs font-bold uppercase tracking-widest text-primary hover:border-primary/50 transition-colors shadow-sm">Select Another Firm</button>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:px-4">
                                        {activePlans.map(plan => {
                                            const isRecommended = plan.name.toLowerCase().includes('premium') || plan.name.toLowerCase().includes('standard');

                                            return (
                                                <div
                                                    key={plan.id}
                                                    className={`relative bg-card rounded-[2rem] p-8 flex flex-col transition-all duration-300 group
                                                    ${isRecommended
                                                            ? 'border-2 border-primary shadow-[0_0_20px_rgba(201,162,77,0.15)] scale-100 lg:scale-[1.02] z-10'
                                                            : 'border border-border shadow-sm hover:border-primary/50 hover:shadow-neumorph'
                                                        }`}
                                                >
                                                    {isRecommended && (
                                                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[9px] font-black px-4 py-1.5 rounded-bl-xl rounded-tr-[1.8rem] uppercase tracking-widest shadow-sm">
                                                            Recommended
                                                        </div>
                                                    )}

                                                    <h3 className={`font-black text-xl mb-3 ${isRecommended ? 'text-primary' : 'text-foreground'}`}>
                                                        {plan.name}
                                                    </h3>

                                                    <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-border">
                                                        <span className="text-3xl font-black text-foreground">₦{Number(plan.price).toLocaleString()}</span>
                                                        <span className="text-muted-foreground text-[10px] font-bold uppercase">/ report</span>
                                                    </div>

                                                    <div className="space-y-4 mb-8 flex-1">
                                                        {Array.isArray(plan.features) ? plan.features.map((f: any, idx: number) => (
                                                            <div key={idx} className="flex items-start gap-3">
                                                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
                                                                    <Check className="w-3 h-3 text-primary" />
                                                                </div>
                                                                <span className="text-xs text-muted-foreground font-medium leading-relaxed">{typeof f === 'string' ? f : f.text}</span>
                                                            </div>
                                                        )) : (
                                                            <p className="text-xs text-muted-foreground italic">Priority processing features included.</p>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={() => handleCreateInvoice(plan)}
                                                        disabled={loading}
                                                        className={`w-full py-4 rounded-[var(--radius-neumorph)] font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2
                                                            ${isRecommended
                                                                ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(201,162,77,0.3)]'
                                                                : 'bg-input hover:bg-card border border-border text-foreground hover:border-primary/50 shadow-inner hover:shadow-sm hover:text-primary'
                                                            }`}
                                                    >
                                                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : null}
                                                        {loading ? 'Preparing...' : 'Select Plan'}
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="mt-12 flex justify-center">
                                        <button onClick={handleBack} className="px-8 py-3.5 bg-input hover:bg-card border border-border text-foreground rounded-[var(--radius-neumorph)] text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-2">
                                            <ChevronLeft size={16} /> Edit Documents
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        // INVOICE CREATED -> SHOW PAY BUTTON
                        <div className="max-w-md mx-auto text-center bg-card border border-border shadow-neumorph rounded-[2rem] p-8 sm:p-12 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] -z-10 pointer-events-none translate-x-1/2 -translate-y-1/2"></div>

                            <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 text-primary shadow-[0_0_15px_rgba(201,162,77,0.2)]">
                                <CreditCard size={32} />
                            </div>
                            <h2 className="text-2xl font-black mb-2 text-foreground tracking-tight">Invoice Generated</h2>
                            <p className="text-muted-foreground mb-8 text-sm">
                                Secure payment for <span className="font-bold text-foreground mx-1">{invoice.plan_type}</span> Priority Intake
                            </p>

                            <div className="bg-input/50 border border-border rounded-2xl p-6 mb-8 shadow-inner flex flex-col gap-2">
                                <div className="flex justify-between items-center text-sm font-bold text-muted-foreground w-full">
                                    <span>Plan</span>
                                    <span className="text-foreground">{invoice.plan_type}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold text-muted-foreground w-full">
                                    <span>Matter Registration</span>
                                    <span className="text-foreground">₦0.00</span>
                                </div>
                                <div className="w-full h-px bg-border my-2"></div>
                                <div className="flex justify-between items-center w-full">
                                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Total Due</span>
                                    <span className="text-2xl font-black text-primary">₦{invoice.amount.toLocaleString()}</span>
                                </div>
                            </div>

                            <button onClick={handlePayClick} className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-[var(--radius-neumorph)] shadow-[0_0_15px_rgba(201,162,77,0.3)] mb-4 flex items-center justify-center gap-2 text-sm uppercase tracking-wider transition-all active:scale-95 group">
                                Pay Securely Now <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button onClick={() => setInvoice(null)} className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                                Cancel & Change Plan
                            </button>
                        </div>
                    )}
                </div>
            );

            default: return null;
        }
    };

    return (
        <div className="pb-16 sm:pb-24 pt-4">
            <div className="mb-10 sm:mb-16 text-center px-4">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-6">New Case Report</h1>

                {/* Custom Stepper */}
                <div className="flex items-center justify-center max-w-sm mx-auto">
                    {steps.map((s, i) => (
                        <React.Fragment key={i}>
                            <div className="flex flex-col items-center gap-2 relative">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center z-10 transition-all duration-300 shadow-sm
                                    ${step > i
                                        ? 'bg-primary border-primary text-primary-foreground shadow-[0_0_10px_rgba(201,162,77,0.3)]'
                                        : step === i
                                            ? 'bg-card border-2 border-primary text-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-background'
                                            : 'bg-input border border-border text-muted-foreground'
                                    }`}
                                >
                                    {step > i ? <Check size={16} strokeWidth={3} /> : <s.icon size={18} />}
                                </div>
                                <span className={`absolute -bottom-6 whitespace-nowrap text-[9px] font-bold uppercase tracking-widest transition-colors
                                    ${step >= i ? 'text-primary' : 'text-muted-foreground opacity-50'}`}>
                                    {s.title}
                                </span>
                            </div>
                            {i < steps.length - 1 && (
                                <div className="flex-1 h-1 mx-2 rounded-full bg-input border border-border shadow-inner relative overflow-hidden">
                                    <div className={`absolute top-0 left-0 h-full bg-primary transition-all duration-500 rounded-full ${step > i ? 'w-full' : 'w-0'}`}></div>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <div className="w-full px-4 sm:px-6 mt-16 sm:mt-12">
                {renderStep()}
            </div>
        </div>
    );
}
