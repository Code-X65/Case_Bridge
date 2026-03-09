import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import {
    FileText, PenTool, X, Loader2, Send, MessageSquare
} from 'lucide-react';
import { useToast } from '@/components/common/ToastService';

interface SignRequestModalProps {
    doc: {
        id: string;
        filename: string;
    };
    matterId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function SignRequestModal({ doc, matterId, onClose, onSuccess }: SignRequestModalProps) {
    const { session } = useInternalSession();
    const { toast } = useToast();
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const send = async () => {
        setIsLoading(true);
        try {
            // Fetch client_id from the matter
            const { data: matter } = await supabase
                .from('matters')
                .select('client_id, firm_id')
                .eq('id', matterId)
                .single();

            if (!matter?.client_id) {
                toast('No client is linked to this matter. Please assign one first.', 'error');
                return;
            }

            const { error } = await supabase.from('signature_requests').insert({
                document_id: doc.id,
                matter_id: matterId,
                requested_by: session?.user_id,
                client_id: matter.client_id,
                firm_id: matter.firm_id,
                message: message || `Please review and sign the document: "${doc.filename}"`,
                status: 'pending',
            });

            if (error) throw error;

            // Update document's esign_status
            await supabase.from('documents').update({ esign_status: 'sent' }).eq('id', doc.id);

            onSuccess();
        } catch (err: any) {
            toast('Failed to send signature request: ' + err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                            <PenTool className="w-5 h-5 text-indigo-400" /> Request eSignature
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">The client will be notified and prompted to sign.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
                        <X size={18} />
                    </button>
                </div>

                <div className="bg-white/5 rounded-xl p-4 mb-6 flex items-center gap-3 border border-white/10">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">
                        <FileText size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{doc.filename}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Document to sign</p>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <MessageSquare size={12} /> Message to Client (optional)
                    </label>
                    <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="e.g. Please review and sign the attached agreement at your earliest convenience."
                        rows={3}
                        className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    />
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 border border-white/10 text-slate-400 hover:text-white rounded-xl text-sm font-bold transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={send}
                        disabled={isLoading}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Send Request
                    </button>
                </div>
            </div>
        </div>
    );
}
