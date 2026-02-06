import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    FileText,
    Download,
    Search,
    Folder,
    ExternalLink,
    Shield,
    Plus,
    X,
    Trash2,
    Loader2,
    Filter,
    Check,
    Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

const CATEGORIES = ['Identity', 'Financial', 'Evidence', 'Corporate', 'General'];

export default function GlobalDocuments() {
    const { user } = useAuth();
    const [cases, setCases] = useState<any[]>([]);
    const [vaultDocs, setVaultDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // all, vault, matters

    // Upload State
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadData, setUploadData] = useState({ name: '', category: 'General' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Document Viewer State
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewingDocument, setViewingDocument] = useState<{ url: string; name: string } | null>(null);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // 1. Fetch Personal Vault (Documents with no matter_id)
            const { data: vaultData } = await supabase
                .from('client_documents')
                .select('*')
                .eq('client_id', user.id)
                .is('matter_id', null)
                .order('uploaded_at', { ascending: false });

            setVaultDocs(vaultData || []);

            // 2. Fetch Matter Repositories
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
                    const caseDocs = (m.case_documents || [])
                        .filter((cd: any) => cd.client_visible && cd.document)
                        .map((cd: any) => ({ ...cd.document, source: 'Case File' }));

                    const reportDocs = (m.matter_updates || [])
                        .filter((mu: any) => mu.client_visible)
                        .flatMap((mu: any) => (mu.report_documents || [])
                            .filter((rd: any) => rd.client_visible && rd.document)
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

                    return { ...m, docs: uniqueDocs };
                }).filter(m => m.docs.length > 0);

                setCases(formatted);
            }
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    useGSAP(() => {
        if (!loading) {
            gsap.from('.document-group', {
                opacity: 0,
                y: 20,
                duration: 0.5,
                stagger: 0.1,
                ease: 'power2.out'
            });
        }
    }, [loading, activeTab]);

    const handleDownload = async (fileUrl: string, docId: string, matterId?: string) => {
        await supabase.rpc('track_vault_activity', {
            p_action: 'document_viewed',
            p_target_id: docId,
            p_metadata: { file_url: fileUrl, matter_id: matterId || null }
        });

        const { data } = await supabase.storage
            .from('case_documents')
            .createSignedUrl(fileUrl, 60);

        if (data) window.open(data.signedUrl, '_blank');
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

    const handleDelete = async (docId: string, filePath: string) => {
        if (!confirm("Are you sure you want to remove this document from your vault?")) return;

        try {
            const { error } = await supabase
                .from('client_documents')
                .delete()
                .eq('id', docId);

            if (error) throw error;

            // Also remove from storage
            await supabase.storage.from('case_documents').remove([filePath]);

            await fetchData();
        } catch (err: any) {
            alert("Error deleting document: " + err.message);
        }
    };

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            if (!uploadData.name) setUploadData(prev => ({ ...prev, name: file.name }));
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || uploading) return;

        setUploading(true);
        try {
            const { data: profile } = await supabase.from('client_profiles').select('firm_id').eq('id', user?.id).single();
            if (!profile) throw new Error("Client profile not found");

            const timestamp = Date.now();
            const filePath = `vault/${user?.id}/${timestamp}_${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

            const { error: storageError } = await supabase.storage
                .from('case_documents')
                .upload(filePath, selectedFile);

            if (storageError) throw storageError;

            const { error: dbError } = await supabase
                .from('client_documents')
                .insert({
                    client_id: user?.id,
                    firm_id: profile.firm_id,
                    file_name: uploadData.name || selectedFile.name,
                    file_url: filePath,
                    file_size: selectedFile.size,
                    category: uploadData.category
                });

            if (dbError) throw dbError;

            await fetchData();
            setIsUploadOpen(false);
            setSelectedFile(null);
            setUploadData({ name: '', category: 'General' });
        } catch (err: any) {
            alert("Upload failed: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const filteredVault = vaultDocs.filter(d =>
        d.file_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="pb-20">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 px-4 sm:px-0">
                <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 tracking-tight leading-none mb-4">
                        Document Vault
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20">
                            Canonical Security v1
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 bg-white/5 px-3 py-1 rounded-full">
                            Identity Isolation Active
                        </span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Filter vault..."
                            className="bg-[#0F172A] border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all w-full text-white placeholder:text-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsUploadOpen(true)}
                        className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-1 active:scale-95 text-xs uppercase tracking-widest"
                    >
                        <Plus size={18} />
                        Upload to Vault
                    </button>
                </div>
            </div>

            {/* View Tabs */}
            <div className="flex gap-1 bg-white/5 p-1 rounded-2xl mb-10 max-w-md mx-4 sm:mx-0">
                {[
                    { id: 'all', label: 'All Files', count: vaultDocs.length + cases.reduce((acc, c) => acc + c.docs.length, 0) },
                    { id: 'vault', label: 'Personal Vault', count: vaultDocs.length },
                    { id: 'matters', label: 'Matter Shared', count: cases.reduce((acc, c) => acc + c.docs.length, 0) }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {tab.label}
                        <span className={`px-1.5 py-0.5 rounded ${activeTab === tab.id ? 'bg-white/20' : 'bg-white/10'}`}>{tab.count}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-blue-500" size={40} />
                </div>
            ) : (
                <div className="space-y-16">
                    {/* 1. Personal Vault Section */}
                    {(activeTab === 'all' || activeTab === 'vault') && (
                        <div className="document-group">
                            <header className="flex items-center gap-3 mb-6 px-4 sm:px-0">
                                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 shadow-inner">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h2 className="font-black text-xl sm:text-2xl text-white tracking-tighter uppercase italic leading-none">Personal Stored Vault</h2>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-2">Private document library • Independent of cases</p>
                                </div>
                            </header>

                            {filteredVault.length === 0 ? (
                                <div className="glass-card flex flex-col items-center justify-center py-20 border-dashed border-white/5 mx-4 sm:mx-0">
                                    <Folder size={48} className="text-slate-800 mb-6" />
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Your vault is empty</p>
                                    <button onClick={() => setIsUploadOpen(true)} className="mt-4 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:underline transition-all">Upload your first item</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4 sm:px-0">
                                    {filteredVault.map(doc => (
                                        <div key={doc.id} className="glass-card group hover:border-indigo-500/30 transition-all p-6 relative overflow-hidden flex flex-col h-44 bg-gradient-to-br from-white/[0.03] to-transparent">
                                            <div className="absolute top-0 right-0 p-4 flex gap-2 sm:opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => handleDownload(doc.file_url, doc.id)} className="p-2 bg-white/5 hover:bg-blue-600 text-white rounded-lg transition-all shadow-xl" title="Download">
                                                    <Download size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(doc.id, doc.file_url)} className="p-2 bg-white/5 hover:bg-red-600 text-white rounded-lg transition-all shadow-xl" title="Delete">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            <div className="flex-1">
                                                <div className="w-10 h-10 bg-slate-800/50 rounded-xl flex items-center justify-center text-indigo-400 mb-4 border border-white/5 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                                    <FileText size={20} />
                                                </div>
                                                <h4 className="font-bold text-sm text-white mb-2 truncate pr-16" title={doc.file_name}>{doc.file_name}</h4>
                                                <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded border border-indigo-400/10">{doc.category}</span>
                                            </div>

                                            <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between opacity-50 text-[9px] font-bold">
                                                <span className="text-slate-500">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                                <span className="text-slate-500">{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 2. Matter Repositories Section */}
                    {(activeTab === 'all' || activeTab === 'matters') && (
                        <div className="space-y-12">
                            {cases.map((group) => {
                                const filteredDocs = group.docs.filter((d: any) =>
                                    d.filename.toLowerCase().includes(searchTerm.toLowerCase())
                                );
                                if (filteredDocs.length === 0) return null;

                                return (
                                    <div key={group.id} className="document-group">
                                        <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 px-4 sm:px-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20 shrink-0 shadow-lg">
                                                    <Shield size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h2 className="font-black text-xl sm:text-2xl text-white tracking-tighter uppercase leading-none truncate">{group.title}</h2>
                                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-2">Active Matter Shared Docs</p>
                                                </div>
                                            </div>
                                            <Link
                                                to={`/cases/${group.id}`}
                                                className="w-fit text-[9px] font-black uppercase tracking-[0.2em] text-blue-400 hover:text-white flex items-center gap-2 px-5 py-2.5 bg-blue-400/10 rounded-2xl border border-blue-400/20 transition-all hover:bg-blue-600 hover:border-blue-600"
                                            >
                                                Workspace <ExternalLink size={12} />
                                            </Link>
                                        </header>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4 sm:px-0">
                                            {filteredDocs.map((doc: any) => (
                                                <div key={doc.id} className="glass-card group hover:border-blue-500/30 transition-all p-6 relative overflow-hidden flex flex-col h-44 bg-gradient-to-br from-white/[0.03] to-transparent">
                                                    <div className="absolute top-0 right-0 p-4 sm:opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                                                        <button
                                                            onClick={() => handleViewDocument(doc.file_url, doc.filename)}
                                                            className="p-2 bg-indigo-600 text-white rounded-lg shadow-xl hover:bg-indigo-500"
                                                            title="View Document"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownload(doc.file_url, doc.id, group.id)}
                                                            className="p-2 bg-blue-600 text-white rounded-lg shadow-xl hover:bg-blue-500"
                                                            title="Download Document"
                                                        >
                                                            <Download size={14} />
                                                        </button>
                                                    </div>

                                                    <div className="flex-1">
                                                        <div className="w-10 h-10 bg-slate-800/50 rounded-xl flex items-center justify-center text-blue-400 mb-4 border border-white/5 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                                                            <FileText size={20} />
                                                        </div>
                                                        <h4 className="font-bold text-sm text-white mb-2 truncate pr-14" title={doc.filename}>{doc.filename}</h4>
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/10 truncate inline-block max-w-full">{doc.source}</span>
                                                    </div>

                                                    <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between opacity-50 text-[9px] font-bold">
                                                        <div className="flex flex-col">
                                                            <span className="text-slate-600 text-[7px] uppercase tracking-tighter mb-0.5">Uploaded</span>
                                                            <span className="text-slate-400">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-slate-600 text-[7px] uppercase tracking-tighter mb-0.5">Sender</span>
                                                            <span className="text-slate-400">{doc.uploaded_by_role.replace('_', ' ').toUpperCase()}</span>
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
                </div>
            )}

            {/* Upload Modal Overlay */}
            {isUploadOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0F172A]/90 backdrop-blur-xl" onClick={() => setIsUploadOpen(false)} />
                    <div className="relative glass-card border border-white/10 w-full max-w-lg rounded-[2.5rem] p-10 shadow-3xl overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600"></div>

                        <button onClick={() => setIsUploadOpen(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-all active:rotate-90">
                            <X size={24} />
                        </button>

                        <div className="mb-10">
                            <div className="w-16 h-16 bg-blue-600/20 rounded-[1.5rem] flex items-center justify-center text-blue-400 mb-6 border border-blue-600/30">
                                <Plus size={32} />
                            </div>
                            <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">Vault Deposit</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-3">Canonical Document Staging</p>
                        </div>

                        <form onSubmit={handleUpload} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-[0.22em] mb-3 ml-1">Identity & Metadata</label>
                                <input
                                    type="text"
                                    placeholder="Document Name"
                                    value={uploadData.name}
                                    onChange={e => setUploadData({ ...uploadData, name: e.target.value })}
                                    className="w-full bg-[#0F172A] border border-white/5 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-bold"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-[0.22em] mb-3 ml-1">Classification Core</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setUploadData({ ...uploadData, category: cat })}
                                            className={`py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all ${uploadData.category === cat
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10 hover:text-white'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4">
                                <input type="file" onChange={onFileSelect} className="hidden" id="vault-file-input" />
                                <label
                                    htmlFor="vault-file-input"
                                    className={`w-full h-32 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all ${selectedFile ? 'border-blue-600/50 bg-blue-600/5' : 'border-white/5 bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    {selectedFile ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                                                <Check size={20} />
                                            </div>
                                            <p className="text-xs font-bold text-white max-w-[200px] truncate">{selectedFile.name}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Loader2 size={24} className="text-slate-800 mb-2" />
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Select Binary Asset</p>
                                        </>
                                    )}
                                </label>
                            </div>

                            <div className="pt-8 border-t border-white/5 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsUploadOpen(false)}
                                    className="flex-1 py-4 text-xs font-black text-slate-500 hover:text-white uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedFile || uploading}
                                    className="flex-[1.5] py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 uppercase tracking-widest text-[10px] disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-2"
                                >
                                    {uploading ? <Loader2 className="animate-spin" size={16} /> : <Shield size={16} />}
                                    {uploading ? 'Transmitting...' : 'Encapsulate & Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Document Viewer Modal */}
            {viewerOpen && viewingDocument && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0F172A]/95 backdrop-blur-xl" onClick={() => setViewerOpen(false)} />
                    <div className="relative glass-card border border-white/10 w-full max-w-6xl h-[90vh] rounded-3xl overflow-hidden shadow-3xl flex flex-col">
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
                        <div className="p-4 border-t border-white/5 bg-gradient-to-r from-blue-600/5 to-transparent flex justify-between items-center">
                            <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">Secure Document View</p>
                            <a
                                href={viewingDocument.url}
                                download
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-xl shadow-blue-600/20 uppercase tracking-widest text-xs transition-all flex items-center gap-2"
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
