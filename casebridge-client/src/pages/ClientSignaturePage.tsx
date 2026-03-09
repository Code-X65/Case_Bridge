import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    PenTool, CheckCircle2, FileText, AlertCircle,
    Loader2, RotateCcw, Type, Pen, ArrowLeft, Shield
} from 'lucide-react';

type SignMode = 'draw' | 'type';

export default function ClientSignaturePage() {
    const { requestId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [request, setRequest] = useState<any>(null);
    const [document, setDocument] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<SignMode>('draw');
    const [typedName, setTypedName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const fetchRequest = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('signature_requests')
                .select(`*, document:document_id(id, filename, file_url)`)
                .eq('id', requestId)
                .single();

            if (error || !data) {
                setError('Signature request not found or has expired.');
            } else if (data.client_id !== user?.id) {
                setError('You are not authorised to sign this document.');
            } else if (data.status === 'signed') {
                setSubmitted(true);
                setRequest(data);
            } else if (data.status === 'expired') {
                setError('This signature request has expired.');
            } else {
                setRequest(data);
                setDocument(data.document);
            }
            setLoading(false);
        };

        if (user && requestId) fetchRequest();
    }, [user, requestId]);

    const setupCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    };

    useEffect(() => { if (mode === 'draw') setTimeout(setupCanvas, 50); }, [mode]);

    const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        }
        return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        isDrawing.current = true;
        const canvas = canvasRef.current!;
        lastPos.current = getPos(e, canvas);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current) return;
        e.preventDefault();
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const pos = getPos(e, canvas);
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastPos.current = pos;
    };

    const stopDrawing = () => { isDrawing.current = false; };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const getSignatureData = (): string | null => {
        if (mode === 'draw') {
            const canvas = canvasRef.current;
            if (!canvas) return null;
            return canvas.toDataURL('image/png');
        } else {
            if (!typedName.trim()) return null;
            // Render typed signature to canvas
            const offscreen = document.createElement('canvas');
            offscreen.width = 400;
            offscreen.height = 80;
            const ctx = offscreen.getContext('2d')!;
            ctx.font = '48px Georgia, serif';
            ctx.fillStyle = '#1e293b';
            ctx.fillText(typedName, 10, 60);
            return offscreen.toDataURL('image/png');
        }
    };

    const handleSubmit = async () => {
        const sigData = getSignatureData();
        if (!sigData) {
            alert(mode === 'draw' ? 'Please draw your signature.' : 'Please type your name.');
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('signature_requests')
                .update({
                    signature_data: sigData,
                    status: 'signed',
                    signed_at: new Date().toISOString()
                })
                .eq('id', requestId);

            if (error) throw error;

            // Update document esign_status
            await supabase.from('documents').update({ esign_status: 'completed' }).eq('id', request.document_id);

            setSubmitted(true);
        } catch (err: any) {
            alert('Submission failed: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDecline = async () => {
        if (!confirm('Are you sure you want to decline this signature request?')) return;
        await supabase.from('signature_requests').update({ status: 'declined' }).eq('id', requestId);
        navigate('/dashboard');
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A0F1C]">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A0F1C] p-6">
            <div className="text-center max-w-md">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Unable to Load</h2>
                <p className="text-slate-400 mb-6">{error}</p>
                <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all">Go to Dashboard</button>
            </div>
        </div>
    );

    if (submitted) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A0F1C] p-6">
            <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Document Signed</h2>
                <p className="text-slate-400 mb-2">You have successfully signed <strong className="text-white">{document?.filename || 'the document'}</strong>.</p>
                <p className="text-xs text-slate-500 mb-8">A confirmation has been sent to your legal team. No further action is required.</p>
                <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center gap-2 mx-auto">
                    <ArrowLeft size={16} /> Return to Dashboard
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0A0F1C] py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-4">
                        <Shield size={12} /> Secure eSignature
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2">Sign Document</h1>
                    <p className="text-slate-400 text-sm">Your signature is legally binding. Please review the document before signing.</p>
                </div>

                {/* Document Info Card */}
                <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 mb-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                        <FileText size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{document?.filename}</p>
                        {request?.message && <p className="text-sm text-slate-400 mt-1 italic">"{request.message}"</p>}
                    </div>
                    {document?.file_url && (
                        <button
                            onClick={async () => {
                                const { data } = await supabase.storage.from('case_documents').createSignedUrl(document.file_url, 60);
                                if (data) window.open(data.signedUrl, '_blank');
                            }}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/10"
                        >
                            View PDF
                        </button>
                    )}
                </div>

                {/* Signature Mode Selector */}
                <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 mb-6">
                    <div className="flex items-center gap-2 mb-6">
                        <button
                            onClick={() => setMode('draw')}
                            className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === 'draw' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                        >
                            <Pen size={16} /> Draw Signature
                        </button>
                        <button
                            onClick={() => setMode('type')}
                            className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === 'type' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                        >
                            <Type size={16} /> Type Name
                        </button>
                    </div>

                    {mode === 'draw' ? (
                        <div>
                            <div className="relative border-2 border-dashed border-white/10 rounded-xl overflow-hidden bg-white cursor-crosshair">
                                <canvas
                                    ref={canvasRef}
                                    width={600}
                                    height={160}
                                    className="w-full h-40 touch-none"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                />
                                <div className="absolute bottom-3 left-0 right-0 border-b border-slate-300 mx-4 pointer-events-none" />
                                <p className="absolute bottom-1 left-4 text-[10px] text-slate-400 pointer-events-none select-none">Sign above</p>
                            </div>
                            <button onClick={clearCanvas} className="mt-3 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                                <RotateCcw size={12} /> Clear
                            </button>
                        </div>
                    ) : (
                        <div>
                            <input
                                type="text"
                                value={typedName}
                                onChange={e => setTypedName(e.target.value)}
                                placeholder="Type your full legal name"
                                className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-4 text-white text-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
                            />
                            {typedName && (
                                <div className="mt-4 bg-white rounded-xl p-4 text-center">
                                    <p className="text-[#1e293b] text-4xl" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{typedName}</p>
                                    <p className="text-slate-400 text-[10px] mt-2 border-t border-slate-200 pt-2">Digital Signature Preview</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Legal note */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-6">
                    <p className="text-xs text-amber-400/80 leading-relaxed">
                        <strong className="text-amber-400">Legal Notice:</strong> By clicking "I Agree & Sign", you consent to sign this document electronically. Your signature has the same legal validity as a handwritten signature under applicable electronic signature laws.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    <button
                        onClick={handleDecline}
                        className="flex-1 py-4 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-xl font-bold transition-all"
                    >
                        Decline
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 text-sm"
                    >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <PenTool size={18} />}
                        I Agree & Sign Document
                    </button>
                </div>
            </div>
        </div>
    );
}
