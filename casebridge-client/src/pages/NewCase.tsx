import React, { useState, useRef } from 'react';
import ClientLayout from '../components/ClientLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    ChevronRight, CheckCircle2, FileText, Upload,
    AlertTriangle, Loader2, ShieldCheck
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const steps = [
    { title: 'Introduction', icon: ShieldCheck },
    { title: 'Case Details', icon: FileText },
    { title: 'Documents', icon: Upload },
    { title: 'Review', icon: CheckCircle2 },
];

export default function NewCase() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);

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

    // Fetch Firms
    React.useEffect(() => {
        const fetchFirms = async () => {
            const { data } = await supabase.from('firms').select('id, name').eq('status', 'active');
            if (data) setFirms(data);
        };
        fetchFirms();
    }, []);

    // Transition Animation
    useGSAP(() => {
        gsap.fromTo('.step-content',
            { opacity: 0, x: 20 },
            { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }
        );
    }, [step]);

    const handleNext = () => {
        // Validation per step
        if (step === 1) {
            if (!formData.title || !formData.description || !formData.category) return;
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => setStep(prev => prev - 1);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // 2. Insert Case
            const { data: caseData, error: caseError } = await supabase
                .from('case_reports')
                .insert({
                    client_id: user?.id,
                    category: formData.category,
                    title: formData.title,
                    description: formData.description,
                    jurisdiction: formData.jurisdiction,
                    preferred_firm_id: formData.preferredFirmId || null,
                    status: 'submitted'
                })
                .select()
                .single();

            if (caseError) throw caseError;

            // Audit will be handled by DB Trigger on case_reports

            // 3. Upload Documents
            if (files.length > 0) {
                for (const file of files) {
                    const filePath = `reports/${caseData.id}/${file.name}`;
                    const { error: uploadError } = await supabase.storage
                        .from('case_documents')
                        .upload(filePath, file);

                    if (uploadError) {
                        console.error('Upload error:', uploadError);
                        throw new Error(`Failed to upload ${file.name}`);
                    }

                    const { error: dbError } = await supabase.from('case_report_documents').insert({
                        case_report_id: caseData.id,
                        file_name: file.name,
                        file_path: filePath,
                        file_type: file.type,
                        file_size: file.size
                    });

                    if (dbError) {
                        console.error('DB error:', dbError);
                        throw new Error(`Failed to register ${file.name}`);
                    }
                }
            }

            // Success Transition
            setStep(4); // Success Step

        } catch (err) {
            console.error(err);
            alert('Failed to submit case. Please try again.');
        } finally {
            setLoading(false);
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
                        Our network of legal professionals will review your submission securely.
                    </p>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg text-yellow-200 text-sm max-w-md mx-auto mb-8 flex gap-3 text-left">
                        <AlertTriangle className="shrink-0" size={20} />
                        <p className="m-0">
                            <strong>Disclaimer:</strong> Submitting this report does <strong>not</strong> create a lawyer–client relationship.
                            Please do not include sensitive financial or deeply personal identifiers until requested.
                        </p>
                    </div>

                    <button onClick={handleNext} className="btn btn-primary w-fit px-8">
                        Start Case Report
                    </button>
                </div>
            );

            // PHASE 2: DETAILS
            case 1: return (
                <div className="step-content glass-card max-w-2xl mx-auto">
                    <h2 className="text-xl font-bold mb-6">Case Details</h2>

                    <div className="space-y-6">
                        <div>
                            <label>Case Category *</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                required
                            >
                                <option value="">Select a category...</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label>Case Title *</label>
                            <input
                                type="text"
                                placeholder="e.g. Contract Dispute with Contractor"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label>Description *</label>
                            <textarea
                                rows={6}
                                placeholder="Describe the situation clearly..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label>Jurisdiction (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. New York, NY"
                                    value={formData.jurisdiction}
                                    onChange={e => setFormData({ ...formData, jurisdiction: e.target.value })}
                                />
                            </div>
                            <div>
                                <label>Preferred Firm (Optional)</label>
                                <select
                                    value={formData.preferredFirmId}
                                    onChange={e => setFormData({ ...formData, preferredFirmId: e.target.value })}
                                    className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select a firm...</option>
                                    {firms.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
                        <button onClick={handleBack} className="btn btn-secondary w-fit">Back</button>
                        <button
                            onClick={handleNext}
                            disabled={!formData.title || !formData.description || !formData.category}
                            className={`btn btn-primary w-fit ${(!formData.title || !formData.description || !formData.category) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Next: Documents
                        </button>
                    </div>
                </div>
            );

            // PHASE 3: DOCUMENTS
            case 2: return (
                <div className="step-content glass-card max-w-2xl mx-auto text-center py-12">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Upload size={32} />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Supporting Documents</h2>
                    <p className="text-muted-foreground mb-8">Upload any relevant files (PDF, DOCX, Images). This is optional.</p>

                    <div className="border-2 border-dashed border-white/20 rounded-lg p-10 hover:border-blue-500/50 transition-colors bg-white/5 mb-6">
                        <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                            <span className="btn btn-secondary w-fit mb-3 pointer-events-none">Choose Files</span>
                            <span className="text-xs text-muted-foreground">Max 10MB per file</span>
                        </label>
                    </div>

                    {files.length > 0 && (
                        <div className="text-left bg-white/5 rounded-lg p-4 mb-8">
                            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Selected Files:</h4>
                            <ul className="space-y-2">
                                {files.map((f, i) => (
                                    <li key={i} className="text-sm flex items-center gap-2">
                                        <FileText size={14} className="text-blue-400" /> {f.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
                        <button onClick={handleBack} className="btn btn-secondary w-fit">Back</button>
                        <button onClick={handleNext} className="btn btn-primary w-fit">Next: Review</button>
                    </div>
                </div>
            );

            // PHASE 4: REVIEW
            case 3: return (
                <div className="step-content glass-card max-w-2xl mx-auto">
                    <h2 className="text-xl font-bold mb-6">Review & Submit</h2>

                    <div className="space-y-4 mb-8">
                        <div className="p-4 bg-white/5 rounded-lg">
                            <label className="text-xs text-muted-foreground uppercase">Category</label>
                            <p className="font-semibold">{formData.category}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-lg">
                            <label className="text-xs text-muted-foreground uppercase">Title</label>
                            <p className="font-semibold">{formData.title}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-lg">
                            <label className="text-xs text-muted-foreground uppercase">Description</label>
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{formData.description}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-lg flex justify-between">
                            <div>
                                <label className="text-xs text-muted-foreground uppercase">Documents</label>
                                <p className="font-semibold">{files.length} files attached</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg mb-8 flex gap-3">
                        <ShieldCheck className="text-blue-400 shrink-0" size={20} />
                        <p className="text-sm text-blue-200 m-0">
                            By submitting, you confirm the information is accurate. This action cannot be undone.
                        </p>
                    </div>

                    <div className="flex justify-between pt-6 border-t border-white/10">
                        <button onClick={handleBack} className="btn btn-secondary w-fit" disabled={loading}>Back</button>
                        <button onClick={handleSubmit} className="btn btn-primary w-fit px-8" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : 'Submit Case Report'}
                        </button>
                    </div>
                </div>
            );

            // SUCCESS
            case 4: return (
                <div className="step-content glass-card max-w-xl mx-auto text-center py-16">
                    <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-400">
                        <CheckCircle2 size={48} />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Case Submitted!</h2>
                    <p className="text-muted-foreground mb-8 text-lg">
                        Your case report has been securely transmitted. You can track its status in your dashboard.
                    </p>
                    <button onClick={() => navigate('/cases')} className="btn btn-primary w-fit px-10">
                        View My Cases
                    </button>
                </div>
            );

            default: return null;
        }
    };

    return (
        <ClientLayout>
            <div ref={containerRef} className="pb-20">
                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-bold">New Case Report</h1>

                    {/* Stepper */}
                    <div className="flex items-center justify-center gap-2 mt-8 max-w-xl mx-auto">
                        {steps.map((s, i) => (
                            <div key={i} className="flex items-center">
                                <div className={`flex flex-col items-center gap-2 ${step >= i ? 'text-blue-400' : 'text-muted-foreground/30'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${step >= i ? 'bg-blue-500 border-blue-500 text-white' : 'border-white/20'}`}>
                                        {step > i ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{i + 1}</span>}
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">{s.title}</span>
                                </div>
                                {i < steps.length - 1 && (
                                    <div className={`h-[2px] w-16 mx-4 transition-colors ${step > i ? 'bg-blue-500' : 'bg-white/10'}`}></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {renderStep()}
            </div>
        </ClientLayout>
    );
}
