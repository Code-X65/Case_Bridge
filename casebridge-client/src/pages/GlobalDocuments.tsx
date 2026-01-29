import { useEffect, useState } from 'react';
import ClientLayout from '../components/ClientLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    FileText,
    Download,
    Search,
    Folder,
    ExternalLink,
    Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export default function GlobalDocuments() {
    const { user } = useAuth();
    const [cases, setCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchAllDocs = async () => {
            setLoading(true);

            // Fetch all matters + their direct case documents + their report-linked documents
            const { data: mattersData } = await supabase
                .from('matters')
                .select(`
                    id,
                    title,
                    case_documents(
                        client_visible,
                        document:document_id (
                            id, filename, file_url, uploaded_at, uploaded_by_role
                        )
                    ),
                    matter_updates(
                        client_visible,
                        report_documents(
                            client_visible,
                            document:document_id (
                                id, filename, file_url, uploaded_at, uploaded_by_role
                            )
                        )
                    ),
                    case_report:case_report_id (
                        title,
                        case_report_documents (
                            file_name, file_path, uploaded_at, file_size, id
                        )
                    )
                `)
                .eq('client_id', user?.id);

            if (mattersData) {
                const formatted = mattersData.map((m: any) => {
                    // Collect documents from both sources
                    const caseDocs = (m.case_documents || [])
                        .filter((cd: any) => cd.client_visible && cd.document)
                        .map((cd: any) => ({ ...cd.document, source: 'Case File' }));

                    const reportDocs = (m.matter_updates || [])
                        .filter((mu: any) => mu.client_visible)
                        .flatMap((mu: any) => (mu.report_documents || [])
                            .filter((rd: any) => rd.client_visible && rd.document)
                            .map((rd: any) => ({ ...rd.document, source: 'Legal Report' }))
                        );

                    // Collect Intake Documents
                    const intakeDocs = (m.case_report?.case_report_documents || []).map((doc: any) => ({
                        id: doc.id,
                        filename: doc.file_name,
                        file_url: doc.file_path,
                        uploaded_at: doc.uploaded_at,
                        uploaded_by_role: 'client',
                        source: 'Intake Evidence'
                    }));

                    // De-duplicate by document ID
                    const allDocs = [...caseDocs, ...reportDocs, ...intakeDocs];
                    const uniqueDocs = Array.from(new Map(allDocs.map(d => [d.id, d])).values());

                    return {
                        ...m,
                        docs: uniqueDocs
                    };
                }).filter(m => m.docs.length > 0);

                setCases(formatted);
            }

            setLoading(false);
        };

        if (user) fetchAllDocs();
    }, [user]);

    useGSAP(() => {
        if (!loading) {
            gsap.from('.document-group', {
                y: 20,
                opacity: 0,
                duration: 0.5,
                stagger: 0.1,
                ease: 'power2.out'
            });
        }
    }, [loading]);

    const handleDownload = async (fileUrl: string, docId: string, matterId: string) => {
        // Track View/Download Event
        await supabase.rpc('track_client_activity', {
            p_action: 'document_viewed',
            p_target_id: docId, // Target is the document
            p_metadata: { file_url: fileUrl, matter_id: matterId }
        });

        const { data } = await supabase.storage
            .from('case_documents')
            .createSignedUrl(fileUrl, 60);

        if (data) {
            window.open(data.signedUrl, '_blank');
        }
    };

    return (
        <ClientLayout>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
                        Document Vault
                    </h1>
                    <p className="text-muted-foreground mt-2 font-medium">Access all shared files and official reports across your legal matters.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={18} />
                        <input
                            type="text"
                            placeholder="Filter by name..."
                            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 transition-all w-64 text-white placeholder:text-muted-foreground/30"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <span className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent shadow-lg"></span>
                </div>
            ) : cases.length === 0 ? (
                <div className="glass-card flex flex-col items-center justify-center py-24 border-dashed border-white/10">
                    <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6 border border-white/5">
                        <Folder size={40} className="text-muted-foreground/20" />
                    </div>
                    <h3 className="text-2xl font-black mb-2">No Documents Yet</h3>
                    <p className="text-muted-foreground text-center max-w-sm text-sm">
                        As your legal team shares official reports and collected evidence, they will appear here for secure access.
                    </p>
                </div>
            ) : (
                <div className="space-y-12">
                    {cases.map((group) => {
                        const filteredDocs = group.docs.filter((d: any) =>
                            d.filename.toLowerCase().includes(searchTerm.toLowerCase())
                        );

                        if (filteredDocs.length === 0) return null;

                        return (
                            <div key={group.id} className="document-group">
                                <header className="flex items-center justify-between mb-6 px-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                                            <Shield size={18} />
                                        </div>
                                        <div>
                                            <h2 className="font-black text-xl tracking-tight leading-tight">{group.title}</h2>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">Matter Repository</p>
                                        </div>
                                    </div>
                                    <Link
                                        to={`/cases/${group.id}`}
                                        className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-blue-400 flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5 transition-all"
                                    >
                                        View Details <ExternalLink size={12} />
                                    </Link>
                                </header>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredDocs.map((doc: any) => (
                                        <div key={doc.id} className="glass-card p-6 hover:border-blue-500/50 transition-all group relative overflow-hidden flex flex-col justify-between">
                                            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleDownload(doc.file_url, doc.id, group.id)}
                                                    className="p-2.5 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-400 transition-colors"
                                                    title="Download Secure File"
                                                >
                                                    <Download size={18} />
                                                </button>
                                            </div>

                                            <div>
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all border border-white/10 shadow-sm">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div className="flex-1 pr-6 overflow-hidden">
                                                        <h4 className="font-bold text-sm mb-1 truncate leading-relaxed" title={doc.filename}>
                                                            {doc.filename}
                                                        </h4>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black text-blue-400/70 uppercase tracking-widest bg-blue-400/5 px-2 py-0.5 rounded border border-blue-400/10">
                                                                {doc.source}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] mb-1 font-bold">Uploaded</span>
                                                    <span className="text-[10px] font-bold text-slate-300">
                                                        {new Date(doc.uploaded_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] mb-1 font-bold">Origin</span>
                                                    <span className="text-[10px] font-bold text-slate-300">
                                                        {doc.uploaded_by_role.replace('_', ' ').toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </ClientLayout>
    );
}
