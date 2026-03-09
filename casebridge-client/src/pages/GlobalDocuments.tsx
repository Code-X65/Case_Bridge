import { useEffect, useState } from 'react';
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
                            id, filename, file_url, uploaded_at, uploaded_by_role, approval_status
                        )
                    ),
                    matter_updates(
                        client_visible,
                        report_documents(
                            client_visible,
                            document:document_id (
                                id, filename, file_url, uploaded_at, uploaded_by_role, approval_status
                            )
                        )
                    ),
                    case_report:case_report_id (
                        title,
                        case_report_documents (
                            file_name, file_path, uploaded_at, file_size, id, approval_status
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
                        approval_status: doc.approval_status,
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
            .createSignedUrl(fileUrl, 3600); // 1 hour

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
        <div className="animate-fade-in relative max-w-7xl mx-auto pb-10">
            {/* Ambient Background Blur */}
            <div className="absolute top-[0%] left-[20%] w-[30%] h-[30%] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

            <div className="relative z-10 px-2 sm:px-0">
                {/* Header Area */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-3">
                            Document Vault
                        </h1>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 shadow-[0_0_10px_rgba(201,162,77,0.1)]">
                                Canonical Security v1
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground bg-input px-3 py-1 rounded-full border border-border">
                                Identity Isolation Active
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input
                                type="text"
                                placeholder="Filter vault..."
                                className="bg-input border border-border rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all w-full text-foreground placeholder:text-muted-foreground shadow-inner"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setIsUploadOpen(true)}
                            className="w-full sm:w-auto px-6 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-[var(--radius-neumorph)] flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(201,162,77,0.3)] hover:shadow-[0_0_20px_rgba(201,162,77,0.4)] transition-all hover:-translate-y-0.5 active:scale-95 text-xs uppercase tracking-widest group"
                        >
                            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                            Upload to Vault
                        </button>
                    </div>
                </div>

                {/* View Tabs */}
                <div className="flex gap-2 p-1.5 rounded-2xl mb-10 w-full sm:w-fit bg-input border border-border shadow-inner overflow-x-auto no-scrollbar">
                    {[
                        { id: 'all', label: 'All Files', count: vaultDocs.length + cases.reduce((acc, c) => acc + c.docs.length, 0) },
                        { id: 'vault', label: 'Personal Vault', count: vaultDocs.length },
                        { id: 'matters', label: 'Matter Shared', count: cases.reduce((acc, c) => acc + c.docs.length, 0) }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 sm:flex-none whitespace-nowrap flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all
                                ${activeTab === tab.id
                                    ? 'bg-card text-primary shadow-sm border border-border'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50 border border-transparent'
                                }`}
                        >
                            {tab.label}
                            <span className={`px-2 py-0.5 rounded text-[10px] border ${activeTab === tab.id ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-transparent border-border text-muted-foreground'}`}>{tab.count}</span>
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-primary" size={40} />
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* 1. Personal Vault Section */}
                        {(activeTab === 'all' || activeTab === 'vault') && (
                            <div className="document-group">
                                <header className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl text-primary border border-primary/20 shadow-sm flex items-center justify-center shrink-0">
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-xl sm:text-2xl text-foreground tracking-tight leading-none mb-1.5">Personal Stored Vault</h2>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Private document library • Independent of cases</p>
                                    </div>
                                </header>

                                {filteredVault.length === 0 ? (
                                    <div className="bg-card/50 flex flex-col items-center justify-center py-16 sm:py-24 border border-dashed border-border rounded-[2rem] shadow-neumorph-inset">
                                        <div className="w-20 h-20 bg-input rounded-full border border-border flex items-center justify-center mb-6 shadow-sm">
                                            <Folder size={36} className="text-muted-foreground/50" />
                                        </div>
                                        <p className="text-foreground font-bold text-lg sm:text-xl mb-2">Your vault is empty</p>
                                        <p className="text-muted-foreground text-smtext-center max-w-sm px-4 mb-6">Securely upload documents for future reference or legal needs.</p>
                                        <button onClick={() => setIsUploadOpen(true)} className="px-6 py-3 bg-card border border-border rounded-[var(--radius-neumorph)] text-primary text-xs font-bold uppercase tracking-widest hover:border-primary/50 transition-all shadow-sm">Upload your first item</button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                        {filteredVault.map(doc => (
                                            <div key={doc.id} className="bg-card border border-border group hover:border-primary/40 transition-all duration-300 p-5 rounded-[1.5rem] relative overflow-hidden flex flex-col h-[180px] shadow-sm hover:shadow-neumorph">
                                                <div className="absolute top-0 right-0 p-4 flex gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                                                    <button onClick={() => handleViewDocument(doc.file_url, doc.file_name)} className="w-8 h-8 flex items-center justify-center bg-input border border-border hover:bg-primary hover:border-primary hover:text-primary-foreground text-muted-foreground rounded-lg transition-all shadow-sm" title="Preview">
                                                        <Eye size={14} />
                                                    </button>
                                                    <button onClick={() => handleDownload(doc.file_url, doc.id)} className="w-8 h-8 flex items-center justify-center bg-input border border-border hover:bg-primary hover:border-primary hover:text-primary-foreground text-muted-foreground rounded-lg transition-all shadow-sm" title="Download">
                                                        <Download size={14} />
                                                    </button>
                                                    <button onClick={() => handleDelete(doc.id, doc.file_url)} className="w-8 h-8 flex items-center justify-center bg-input border border-border hover:bg-destructive hover:border-destructive hover:text-white text-muted-foreground rounded-lg transition-all shadow-sm" title="Delete">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>

                                                <div className="flex-1 relative z-10">
                                                    <div className="w-12 h-12 bg-input border border-border rounded-xl flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground transition-all duration-500 shadow-sm">
                                                        <FileText size={24} />
                                                    </div>
                                                    <h4 className="font-bold text-sm text-foreground mb-2 truncate pr-16 group-hover:text-primary transition-colors" title={doc.file_name}>{doc.file_name}</h4>
                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 inline-block">{doc.category}</span>
                                                </div>

                                                <div className="pt-4 mt-auto border-t border-border flex items-center justify-between text-[10px] font-bold text-muted-foreground relative z-10">
                                                    <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                                    <span>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                                                </div>

                                                {/* Card Background gradient on hover */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0 pointer-events-none"></div>
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
                                            <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20 shrink-0 shadow-sm">
                                                        <Shield size={24} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h2 className="font-bold text-xl sm:text-2xl text-foreground tracking-tight leading-none mb-1.5 truncate">{group.title}</h2>
                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Active Matter Shared Docs</p>
                                                    </div>
                                                </div>
                                                <Link
                                                    to={`/cases/${group.id}`}
                                                    className="w-full sm:w-auto text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary-foreground flex items-center justify-center gap-2 px-6 py-3 bg-card rounded-[var(--radius-neumorph)] border border-border shadow-sm transition-all hover:bg-primary hover:border-primary active:scale-95"
                                                >
                                                    Workspace <ExternalLink size={14} />
                                                </Link>
                                            </header>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                                {filteredDocs.map((doc: any) => (
                                                    <div key={doc.id} className="bg-card border border-border group hover:border-primary/40 transition-all duration-300 p-5 rounded-[1.5rem] relative overflow-hidden flex flex-col h-[180px] shadow-sm hover:shadow-neumorph">
                                                        <div className="absolute top-0 right-0 p-4 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2 z-20">
                                                            <button
                                                                onClick={() => handleViewDocument(doc.file_url, doc.filename)}
                                                                className="w-8 h-8 flex items-center justify-center bg-input border border-border text-muted-foreground hover:bg-primary hover:border-primary hover:text-primary-foreground rounded-lg shadow-sm transition-all"
                                                                title="View Document"
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownload(doc.file_url, doc.id, group.id)}
                                                                className="w-8 h-8 flex items-center justify-center bg-input border border-border text-muted-foreground hover:bg-primary hover:border-primary hover:text-primary-foreground rounded-lg shadow-sm transition-all"
                                                                title="Download Document"
                                                            >
                                                                <Download size={14} />
                                                            </button>
                                                        </div>

                                                        <div className="flex-1 relative z-10">
                                                            <div className="w-12 h-12 bg-input border border-border rounded-xl flex items-center justify-center text-primary mb-4 group-hover:scale-110 group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground transition-all duration-500 shadow-sm">
                                                                <FileText size={20} />
                                                            </div>
                                                            <h4 className="font-bold text-sm text-foreground mb-2 truncate pr-20 group-hover:text-primary transition-colors" title={doc.filename}>{doc.filename}</h4>
                                                            <div className="flex flex-wrap gap-2 items-center">
                                                                <span className="text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 truncate inline-block">{doc.source}</span>
                                                                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border inline-block ${doc.approval_status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                                        doc.approval_status === 'rejected' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                                                                            'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                                                    }`}>
                                                                    {doc.approval_status || 'pending'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="pt-3 mt-auto border-t border-border flex items-center justify-between text-[10px] font-bold text-muted-foreground relative z-10">
                                                            <div className="flex flex-col">
                                                                <span className="text-muted-foreground/60 text-[8px] uppercase tracking-widest mb-0.5">Uploaded</span>
                                                                <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-muted-foreground/60 text-[8px] uppercase tracking-widest mb-0.5">Sender</span>
                                                                <span className="truncate max-w-[80px] text-right">{doc.uploaded_by_role.replace('_', ' ').toUpperCase()}</span>
                                                            </div>
                                                        </div>

                                                        {/* Card Background gradient on hover */}
                                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0 pointer-events-none"></div>
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
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={() => setIsUploadOpen(false)} />
                        <div className="relative bg-card border border-border w-full max-w-lg rounded-[2.5rem] p-8 sm:p-10 shadow-2xl overflow-hidden animate-fade-in">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>

                            <button onClick={() => setIsUploadOpen(false)} className="absolute top-6 right-6 w-10 h-10 bg-input border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card hover:border-primary/50 transition-all active:scale-90">
                                <X size={20} />
                            </button>

                            <div className="mb-10 text-center sm:text-left">
                                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 border border-primary/20 shadow-sm mx-auto sm:mx-0">
                                    <Plus size={32} />
                                </div>
                                <h3 className="text-3xl font-black text-foreground tracking-tight leading-none mb-2">Vault Deposit</h3>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Secure Document Staging Space</p>
                            </div>

                            <form onSubmit={handleUpload} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 ml-1">Document Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Driver's License, Tax Return 2025"
                                        value={uploadData.name}
                                        onChange={e => setUploadData({ ...uploadData, name: e.target.value })}
                                        className="w-full bg-input border border-border rounded-xl py-4 px-6 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner font-medium text-sm"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 ml-1">Category</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CATEGORIES.map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setUploadData({ ...uploadData, category: cat })}
                                                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm border
                                                    ${uploadData.category === cat
                                                        ? 'bg-primary border-primary text-primary-foreground shadow-[0_0_10px_rgba(201,162,77,0.3)]'
                                                        : 'bg-input border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <input type="file" onChange={onFileSelect} className="hidden" id="vault-file-input" />
                                    <label
                                        htmlFor="vault-file-input"
                                        className={`w-full h-36 border-2 border-dashed rounded-[1.5rem] flex flex-col items-center justify-center cursor-pointer transition-all shadow-inner
                                            ${selectedFile
                                                ? 'border-primary/50 bg-primary/5'
                                                : 'border-border bg-input hover:border-primary/40 hover:bg-card'
                                            }`}
                                    >
                                        {selectedFile ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-[0_0_15px_rgba(201,162,77,0.3)]">
                                                    <Check size={24} />
                                                </div>
                                                <p className="text-sm font-bold text-foreground max-w-[250px] truncate">{selectedFile.name}</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground shadow-sm">
                                                    <Download size={20} className="rotate-180" />
                                                </div>
                                                <p className="text-xs font-bold text-muted-foreground tracking-wide">Click to browse files</p>
                                                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mt-1">PDF, DOCX, PNG, JPG (MAX 50MB)</p>
                                            </div>
                                        )}
                                    </label>
                                </div>

                                <div className="pt-6 border-t border-border mt-8 flex flex-col-reverse sm:flex-row gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsUploadOpen(false)}
                                        className="w-full sm:w-1/3 py-4 bg-input hover:bg-card border border-border text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest transition-all rounded-[var(--radius-neumorph)] shadow-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!selectedFile || uploading}
                                        className="w-full sm:w-2/3 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-[var(--radius-neumorph)] shadow-[0_0_15px_rgba(201,162,77,0.3)] uppercase tracking-widest text-[10px] sm:text-xs disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3 active:scale-95"
                                    >
                                        {uploading ? <Loader2 className="animate-spin" size={18} /> : <Shield size={18} />}
                                        {uploading ? 'Transmitting...' : 'Encapsulate & Save'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Premium Document Viewer Modal */}
                {viewerOpen && viewingDocument && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={() => setViewerOpen(false)} />

                        <div className="relative bg-card border border-border w-full max-w-6xl h-full max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-neumorph flex flex-col animate-in zoom-in-95 duration-500">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 sm:p-8 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
                                <div className="flex items-center gap-4 sm:gap-6">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                                        <FileText size={28} />
                                    </div>
                                    <div className="min-w-0 pr-12 sm:pr-0">
                                        <h3 className="text-lg sm:text-xl font-black text-foreground truncate max-w-[200px] sm:max-w-md">{viewingDocument.name}</h3>
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1">Secure Vault Access Active</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setViewerOpen(false)}
                                    className="bg-input hover:bg-card p-3 rounded-2xl text-muted-foreground hover:text-foreground transition-all shadow-sm hover:shadow-neumorph border border-border active:scale-95"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Document Content */}
                            <div className="flex-1 overflow-hidden bg-input/20 relative m-2 sm:m-4 rounded-[1.5rem] border border-border/50">
                                <iframe
                                    src={viewingDocument.url}
                                    className="w-full h-full border-none"
                                    title={viewingDocument.name}
                                />
                            </div>

                            {/* Footer */}
                            <div className="p-6 sm:p-8 border-t border-border bg-gradient-to-l from-primary/5 to-transparent flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Shield size={14} className="text-primary/70" />
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-center sm:text-left">End-to-End Encryption • CaseBridge Secure Vault</p>
                                </div>
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <button
                                        onClick={() => setViewerOpen(false)}
                                        className="flex-1 sm:flex-none px-6 py-3 text-muted-foreground font-bold text-xs uppercase tracking-widest hover:text-foreground transition-colors"
                                    >
                                        Close
                                    </button>
                                    <a
                                        href={viewingDocument.url}
                                        download={viewingDocument.name}
                                        className="flex-1 sm:flex-none px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-2xl shadow-[0_0_20px_rgba(201,162,77,0.3)] uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <Download size={16} />
                                        Download File
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
