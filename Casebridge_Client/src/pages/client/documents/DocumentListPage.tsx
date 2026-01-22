import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getDocumentUrl, deleteDocument } from '@/lib/storage';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    FileText,
    Download,
    Trash2,
    Search,
    Eye,
    FolderOpen,
    FileCheck
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { UploadDocumentDialog } from '@/components/documents/UploadDocumentDialog';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

export default function DocumentListPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [previewDoc, setPreviewDoc] = useState<any>(null);
    const queryClient = useQueryClient();

    const { data: documents, isLoading } = useQuery({
        queryKey: ['documents'],
        queryFn: async () => {
            // Get current authenticated user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Fetch only documents from matters belonging to the current user
            const { data, error } = await supabase
                .from('documents')
                .select('*, matters!inner(title, matter_number, client_id)')
                .eq('matters.client_id', user.id)
                .order('uploaded_at', { ascending: false });

            if (error) throw error;
            return data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: ({ id, path }: { id: string, path: string }) => deleteDocument(id, path),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            toast({
                title: "Internal Error",
                description: "Record scrubbed from vault.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Operation Failed",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const handleDownload = async (path: string, name: string) => {
        try {
            const url = await getDocumentUrl(path);
            if (url) {
                const link = document.createElement('a');
                link.href = url;
                link.download = name;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (err) {
            console.error('Download failed', err);
        }
    };

    const handleDelete = async (id: string, path: string) => {
        if (confirm('Permanently delete this file?')) {
            deleteMutation.mutate({ id, path });
        }
    };

    const filteredDocs = documents?.filter(doc =>
        doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.matters?.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatFileSize = (bytes: number) => {
        if (!bytes) return 'N/A';
        const kb = bytes / 1024;
        return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(1)} KB`;
    };

    return (
        <div className="space-y-6 pb-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase tracking-tighter">Document Vault</h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Securely manage legal files across your cases.
                    </p>
                </div>
                <UploadDocumentDialog />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative w-full sm:max-w-xs px-2">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                    <Input
                        placeholder="Search vault..."
                        className="pl-9 h-9 bg-slate-50/50 border-transparent focus:bg-white focus:ring-primary rounded-xl text-xs font-semibold transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="px-4">
                    <Badge variant="outline" className="h-6 px-2 rounded-lg bg-slate-50 border-slate-100 text-[9px] font-black uppercase text-slate-400">
                        {documents?.length || 0} SECURED FILES
                    </Badge>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ring-1 ring-slate-100">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 h-12">
                            <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest text-slate-400">File & Metadata</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Linked Case</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Size</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filed On</TableHead>
                            <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Manage</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-6 w-6 border-2 border-slate-100 border-t-primary rounded-full animate-spin" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing secure files...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredDocs?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center">
                                    <div className="flex flex-col items-center gap-3 opacity-20">
                                        <FolderOpen className="h-10 w-10 text-slate-900" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Vault is empty</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredDocs?.map((doc) => (
                                <TableRow key={doc.id} className="group hover:bg-slate-50 transition-all border-b border-slate-50">
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                                                <FileText className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                                            </div>
                                            <div className="max-w-[200px]">
                                                <p className="text-xs font-bold text-slate-900 truncate tracking-tight">{doc.file_name}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Badge variant="outline" className="bg-transparent text-[8px] font-black uppercase text-slate-400 px-1 border-slate-200">{(doc.file_type || 'bin').split('/')[1]}</Badge>
                                                    <span className="text-[9px] font-black text-green-600 uppercase tracking-widest opacity-80 flex items-center gap-1"><FileCheck className="h-2.5 w-2.5" /> Secured</span>
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col max-w-[150px]">
                                            <p className="text-xs font-bold text-slate-700 truncate uppercase tracking-tight">{doc.matters?.title}</p>
                                            <p className="text-[9px] text-slate-400 font-mono font-black uppercase tracking-tighter">{doc.matters?.matter_number}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-[11px] font-bold text-slate-400">{formatFileSize(doc.size_bytes)}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-[11px] font-bold text-slate-500">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50"
                                                onClick={() => setPreviewDoc(doc)}
                                                title="Preview Document"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg text-slate-300 hover:text-slate-900 hover:bg-slate-100"
                                                onClick={() => handleDownload(doc.file_path, doc.file_name)}
                                                title="Download Document"
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50"
                                                onClick={() => handleDelete(doc.id, doc.file_path)}
                                                title="Delete Document"
                                                disabled={deleteMutation.isPending}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <DocumentPreviewDialog
                isOpen={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
                document={previewDoc}
            />
        </div>
    );
}
