import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import InternalSidebar from '@/components/layout/InternalSidebar';
import {
    FileText,
    Download,
    Search,
    Folder,
    ExternalLink,
    Shield,
    Loader2,
    Eye,
    X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function InternalDocumentVault() {
    const { session } = useInternalSession();
    const [cases, setCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Document Viewer State
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewingDocument, setViewingDocument] = useState<{ url: string; name: string } | null>(null);

    useEffect(() => {
        const fetchAllDocs = async () => {
            if (!session?.firm_id) return;
            setLoading(true);

            console.log('Fetching vault items...');

            // 1. Fetch Matters (Active Cases)
            // Removed the lifecycle_state filter to ensure we get everything if possible, though matters usually have state.
            // RLS handles visibility.
            const { data: mattersData, error: mattersError } = await supabase
                .from('matters')
                .select(`
                    id,
                    title,
                    lifecycle_state,
                    case_documents(
                        document:document_id (
                            id, filename, file_url, uploaded_at, uploaded_by_role
                        )
                    ),
                    matter_updates(
                        report_documents(
                            document:document_id (
                                id, filename, file_url, uploaded_at, uploaded_by_role
                            )
                        )
                    ),
                    case_report:case_report_id (
                        id,
                        title,
                        case_report_documents (
                            file_name, file_path, uploaded_at, file_size, id
                        )
                    )
                `);

            if (mattersError) console.error('Error fetching matters:', mattersError);


            // 2. Fetch Pending Intakes (Not yet turned into matters)
            // RLS for case_reports should allow Case Managers to view all in firm.
            // Associate Lawyers might not see unassigned reports unless explicitly assigned (which makes them matters usually)
            // But we'll try to fetch.
            const { data: intakesData, error: intakesError } = await supabase
                .from('case_reports')
                .select(`
                    id,
                    title,
                    status,
                    case_report_documents (
                        file_name, file_path, uploaded_at, file_size, id
                    )
                `)
                .neq('status', 'rejected');

            if (intakesError) console.error('Error fetching intakes:', intakesError);

            const allGroups: any[] = [];

            // Process Matters
            if (mattersData) {
                const matterGroups = mattersData.map((m: any) => {
                    const caseDocs = (m.case_documents || [])
                        .filter((cd: any) => cd.document)
                        .map((cd: any) => ({ ...cd.document, source: 'Case File' }));

                    const reportDocs = (m.matter_updates || [])
                        .flatMap((mu: any) => (mu.report_documents || [])
                            .filter((rd: any) => rd.document)
                            .map((rd: any) => ({ ...rd.document, source: 'Legal Report' }))
                        );

                    const intakeDocs = (m.case_report?.case_report_documents || []).map((doc: any) => ({
                        id: doc.id,
                        filename: doc.file_name,
                        file_url: doc.file_path,
                        uploaded_at: doc.uploaded_at,
                        uploaded_by_role: 'client',
                        source: 'Intake Evidence'
                    }));

                    const allDocs = [...caseDocs, ...reportDocs, ...intakeDocs];

                    const uniqueDocs = Array.from(new Map(allDocs.map(d => [d.id, d])).values());
                    uniqueDocs.sort((a: any, b: any) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());

                    return {
                        id: m.id,
                        title: m.title,
                        lifecycle_state: m.lifecycle_state,
                        docs: uniqueDocs,
                        is_matter: true
                    };
                }).filter((g: any) => g.docs.length > 0);
                allGroups.push(...matterGroups);
            }

            // Process Intakes (that aren't already matters)
            if (intakesData) {
                // Get IDs of case reports already linked to matters
                const linkedReportIds = new Set(mattersData?.map((m: any) => m.case_report?.id).filter(Boolean));

                const intakeGroups = intakesData
                    .filter((r: any) => !linkedReportIds.has(r.id))
                    .map((r: any) => {
                        const docs = (r.case_report_documents || []).map((doc: any) => ({
                            id: doc.id,
                            filename: doc.file_name,
                            file_url: doc.file_path,
                            uploaded_at: doc.uploaded_at,
                            uploaded_by_role: 'client',
                            source: 'Intake Evidence'
                        }));

                        docs.sort((a: any, b: any) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());

                        return {
                            id: r.id,
                            title: r.title,
                            lifecycle_state: r.status,
                            docs: docs,
                            is_matter: false
                        };
                    })
                    .filter((g: any) => g.docs.length > 0);

                allGroups.push(...intakeGroups);
            }

            setCases(allGroups);
            setLoading(false);
        };

        fetchAllDocs();
    }, [session]);

    useGSAP(() => {
        if (!loading) {
            gsap.from('.document-group', {
                opacity: 0,
                duration: 0.5,
                stagger: 0.1,
                ease: 'power2.out'
            });
        }
    }, [loading]);

    const handleDownload = async (fileUrl: string) => {
        const { data } = await supabase.storage
            .from('case_documents')
            .createSignedUrl(fileUrl, 60);

        if (data) {
            window.open(data.signedUrl, '_blank');
        }
    };

    const handleViewDocument = async (fileUrl: string, fileName: string) => {
        const { data } = await supabase.storage
            .from('case_documents')
            .createSignedUrl(fileUrl, 60);

        if (data) {
            setViewingDocument({ url: data.signedUrl, name: fileName });
            setViewerOpen(true);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#0F172A] text-white font-sans">
            <InternalSidebar />

            <main className="flex-1 ml-64 p-8">
                <div className="max-w-7xl mx-auto">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Internal Document Vault</h1>
                            <p className="text-slate-400">
                                {session?.role === 'associate_lawyer'
                                    ? 'Secure access to all documents across your assigned cases.'
                                    : 'Centralized repository of all firm case documents and evidence.'}
                            </p>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Filter by document name..."
                                className="bg-[#1E293B] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-all w-64 text-white placeholder:text-slate-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="animate-spin text-indigo-500" size={32} />
                        </div>
                    ) : cases.length === 0 ? (
                        <div className="bg-[#1E293B] border border-white/5 rounded-2xl flex flex-col items-center justify-center py-24 border-dashed">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                <Folder size={32} className="text-slate-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-white">No Documents Found</h3>
                            <p className="text-slate-500 text-center max-w-sm text-sm">
                                {session?.role === 'associate_lawyer'
                                    ? 'Documents will appear here once you are assigned to active cases.'
                                    : 'No documents have been uploaded to any active matters yet.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-10">
                            {cases.map((group) => {
                                const filteredDocs = group.docs.filter((d: any) =>
                                    d.filename.toLowerCase().includes(searchTerm.toLowerCase())
                                );

                                if (filteredDocs.length === 0) return null;

                                return (
                                    <div key={group.id} className="document-group">
                                        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                                    <BriefcaseIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h2 className="font-bold text-lg text-white">{group.title}</h2>
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${group.lifecycle_state === 'in_progress' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                                                        }`}>
                                                        {group.lifecycle_state.replace('_', ' ')}
                                                    </span>
                                                    {!group.is_matter && (
                                                        <span className="ml-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                                            Pending Intake
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <Link
                                                to={group.is_matter ? `/internal/matter/${group.id}` : `/intake/${group.id}`}
                                                className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white flex items-center gap-1 transition-colors"
                                            >
                                                Open Workspace <ExternalLink size={12} />
                                            </Link>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {filteredDocs.map((doc: any) => (
                                                <div key={doc.id} className="bg-[#1E293B] hover:bg-[#1E293B]/80 border border-white/5 hover:border-indigo-500/30 rounded-xl p-4 transition-all group flex flex-col justify-between h-36">
                                                    <div>
                                                        <div className="flex justify-between items-start">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${doc.source === 'Intake Evidence' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'
                                                                }`}>
                                                                <FileText size={16} />
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleViewDocument(doc.file_url, doc.filename)}
                                                                    className="text-slate-500 hover:text-indigo-400 transition-colors"
                                                                    title="View Document"
                                                                >
                                                                    <Eye size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDownload(doc.file_url)}
                                                                    className="text-slate-500 hover:text-white transition-colors"
                                                                    title="Download"
                                                                >
                                                                    <Download size={16} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <p className="text-sm font-bold text-white truncate mb-1" title={doc.filename}>{doc.filename}</p>
                                                            <div className="flex items-center justify-between mt-2">
                                                                <span className="text-[9px] font-bold uppercase text-slate-500">{doc.source}</span>
                                                                <span className="text-[9px] text-slate-600">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                    }
                </div>
            </main>

            {/* Document Viewer Modal */}
            {viewerOpen && viewingDocument && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0F172A]/95 backdrop-blur-xl" onClick={() => setViewerOpen(false)} />
                    <div className="relative bg-[#1E293B] border border-white/10 w-full max-w-6xl h-[90vh] rounded-3xl overflow-hidden shadow-3xl flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-r from-indigo-600/10 to-transparent">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-600/30">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{viewingDocument.name}</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Document Viewer</p>
                                </div>
                            </div>
                            <button onClick={() => setViewerOpen(false)} className="text-slate-500 hover:text-white transition-all active:rotate-90">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Document Content */}
                        <div className="flex-1 overflow-hidden bg-slate-900/50">
                            <iframe
                                src={viewingDocument.url}
                                className="w-full h-full"
                                title={viewingDocument.name}
                            />
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/5 bg-gradient-to-r from-indigo-600/5 to-transparent flex justify-between items-center">
                            <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">Internal Secure View</p>
                            <a
                                href={viewingDocument.url}
                                download
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-xl shadow-indigo-600/20 uppercase tracking-widest text-xs transition-all flex items-center gap-2"
                            >
                                <Download size={14} />
                                Download
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const BriefcaseIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
);
