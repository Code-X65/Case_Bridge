import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, Shield, History, Info } from 'lucide-react';

interface AuditLog {
    id: string;
    action: string;
    details: any;
    created_at: string;
}

interface CaseAuditHistoryProps {
    matterId: string;
}

export default function CaseAuditHistory({ matterId }: CaseAuditHistoryProps) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAuditLogs = async () => {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('matter_id', matterId)
                .order('created_at', { ascending: false });

            if (error) console.error("Error fetching audit logs:", error);
            else setLogs(data || []);
            setLoading(false);
        };

        if (matterId) fetchAuditLogs();
    }, [matterId]);

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'lifecycle_transition': return 'Status Changed';
            case 'document_uploaded': return 'Document Added';
            case 'document_approved': return 'Document Verified';
            case 'signature_completed': return 'Document Signed';
            case 'review_started': return 'Review Initiated';
            case 'matter_created': return 'Case Accepted';
            default: return action.replace(/_/g, ' ').toUpperCase();
        }
    };

    if (loading) return <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-input rounded-2xl" />)}
    </div>;

    if (logs.length === 0) return (
        <div className="bg-input/30 border border-dashed border-border rounded-3xl p-8 text-center">
            <Info size={32} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No history items found yet</p>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Shield size={16} className="text-primary" />
                <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Verified Case History</h3>
            </div>
            <div className="relative space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/50">
                {logs.map((log) => (
                    <div key={log.id} className="relative pl-12">
                        <div className="absolute left-0 top-1 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-primary shadow-sm z-10">
                            <History size={16} />
                        </div>
                        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-neumorph transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-foreground uppercase tracking-widest">
                                    {getActionLabel(log.action)}
                                </span>
                                <span className="text-[9px] font-bold text-muted-foreground flex items-center gap-1">
                                    <Clock size={10} />
                                    {new Date(log.created_at).toLocaleString()}
                                </span>
                            </div>
                            {log.details && log.details.to && (
                                <p className="text-xs text-muted-foreground">
                                    Workflow status moved to <span className="text-primary font-bold">{log.details.to.replace(/_/g, ' ').toUpperCase()}</span>
                                </p>
                            )}
                            {log.action === 'document_uploaded' && (
                                <p className="text-xs text-muted-foreground">
                                    New evidence or filing was added to the case vault.
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
