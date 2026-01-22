import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    Clock,
    FileText,
    Calendar,
    MoreVertical,
    CheckCircle2,
    Eye,
    ShieldCheck,
    Zap,
    Star,
    AlertCircle,
    DownloadCloud
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import { useState } from 'react';
import { getDocumentUrl } from '@/lib/storage';
import ClientCourtReports from '@/components/cases/ClientCourtReports';
import ClientActivityTimeline from '@/components/cases/ClientActivityTimeline';

export default function MatterDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [previewDoc, setPreviewDoc] = useState<any>(null);

    const { data: matter, isLoading: matterLoading } = useQuery({
        queryKey: ['matter', id],
        queryFn: async () => {
            // Get current authenticated user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Fetch only if the matter belongs to the current user
            const { data, error } = await supabase
                .from('matters')
                .select('*')
                .eq('id', id)
                .eq('client_id', user.id)
                .single();

            if (error) throw error;
            return data;
        },
    });

    const { data: documents, isLoading: docsLoading } = useQuery({
        queryKey: ['matter-documents', id],
        queryFn: async () => {
            // Get current authenticated user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // First verify the matter belongs to the user, then fetch documents
            const { data: matterCheck } = await supabase
                .from('matters')
                .select('id')
                .eq('id', id)
                .eq('client_id', user.id)
                .single();

            if (!matterCheck) return [];

            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('matter_id', id)
                .order('uploaded_at', { ascending: false });

            if (error) throw error;
            return data;
        },
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

    const isLoading = matterLoading || docsLoading;

    const getStatusStyles = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending review':
                return 'bg-amber-100/50 text-amber-700 border-amber-100';
            case 'active':
                return 'bg-blue-100/50 text-blue-700 border-blue-100';
            case 'closed':
                return 'bg-slate-100 text-slate-700 border-slate-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getTierIcon = (tier: string) => {
        switch (tier?.toLowerCase()) {
            case 'standard': return <Zap className="h-3 w-3 text-slate-400" />;
            case 'priority': return <Zap className="h-3 w-3 text-blue-500 fill-blue-500" />;
            case 'expert': return <Star className="h-3 w-3 text-amber-500 fill-amber-500" />;
            default: return null;
        }
    };

    const { data: caseLogs } = useQuery({
        queryKey: ['case-logs', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('case_logs')
                .select(`
                    *,
                    performer:profiles!case_logs_performed_by_fkey(first_name, last_name)
                `)
                .eq('matter_id', id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Clock className="animate-spin h-6 w-6 text-primary opacity-20" />
            </div>
        );
    }

    if (!matter) {
        return (
            <div className="text-center py-20 max-w-sm mx-auto">
                <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-black text-slate-900 uppercase">Case Not Found</h2>
                <Button asChild className="mt-6 font-bold h-10 px-6 rounded-xl" variant="default">
                    <Link to="/client/matters">Return to Cases</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12 max-w-6xl mx-auto">
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                    <Button variant="ghost" size="sm" asChild className="-ml-3 text-slate-400 hover:bg-slate-50 rounded-lg h-8 text-[10px] font-black uppercase tracking-widest">
                        <Link to="/client/matters">
                            <ArrowLeft className="mr-1.5 h-3 w-3" />
                            Cases
                        </Link>
                    </Button>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase tracking-tighter">{matter.title}</h1>
                        <Badge variant="outline" className={`${getStatusStyles(matter.status)} px-2 py-0 border font-black uppercase text-[8px] tracking-widest h-4 rounded-sm`}>
                            {matter.status}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold">
                        <div className="bg-slate-900 text-white px-2 py-1 rounded">
                            <span className="font-mono">{matter.matter_number}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 border border-slate-100 px-2 py-1 rounded">
                            <span className="uppercase tracking-wide opacity-60">Type:</span>
                            <span className="text-slate-700">{matter.matter_type}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 border border-slate-100 px-2 py-1 rounded">
                            {getTierIcon(matter.service_tier)}
                            <span className="text-slate-700">{matter.service_tier} Plan</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild size="sm" className="h-9 px-4 rounded-lg font-bold border-slate-200 text-xs shadow-sm">
                        <Link to="/client/documents">
                            <FileText className="mr-1.5 h-3.5 w-3.5 text-primary" />
                            Media
                        </Link>
                    </Button>
                    <Button variant="outline" asChild size="sm" className="h-9 px-4 rounded-lg font-bold border-slate-200 text-xs shadow-sm">
                        <Link to="/client/consultations">
                            <Calendar className="mr-1.5 h-3.5 w-3.5 text-primary" />
                            Advice
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-slate-100">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card className="border-none ring-1 ring-slate-100 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-slate-50/30 border-b border-slate-50 py-4 px-6">
                            <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">Case Description</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <p className="text-slate-700 leading-relaxed text-sm font-medium opacity-90 whitespace-pre-wrap">
                                {matter.description}
                            </p>
                            <Separator className="my-6" />
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div>
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">Filed On</span>
                                    <span className="text-slate-900 font-bold text-xs">{new Date(matter.created_at).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">Last Update</span>
                                    <span className="text-slate-900 font-bold text-xs">{new Date(matter.updated_at).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">Fee Status</span>
                                    <Badge className="bg-green-50 text-green-700 border-none px-1.5 py-0 text-[8px] font-black">₪ CONFIRMED</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none ring-1 ring-slate-100 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-slate-50/30 border-b border-slate-50 flex flex-row items-center justify-between py-4 px-6">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-slate-400" />
                                <CardTitle className="text-xs font-black text-slate-900 uppercase tracking-widest">Evidence Vault</CardTitle>
                            </div>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-400 border-none font-black text-[9px] px-2 h-5">
                                {documents?.length || 0} ITEMS
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-3">
                            {!documents || documents.length === 0 ? (
                                <div className="py-12 text-center text-slate-300">
                                    <p className="text-[10px] font-black uppercase tracking-widest">No documents attached</p>
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    {documents.map((doc: any) => (
                                        <div key={doc.id} className="p-3 rounded-xl flex items-center justify-between border border-slate-50 hover:bg-slate-50/50 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 bg-white rounded-lg border border-slate-100 flex items-center justify-center">
                                                    <FileText className="h-4 w-4 text-slate-300" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900 truncate max-w-[150px] sm:max-w-xs">{doc.file_name}</p>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase">{new Date(doc.uploaded_at).toLocaleDateString()} • {(doc.size_bytes / 1024 / 1024).toFixed(1)} MB</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-blue-600 shadow-sm"
                                                    onClick={() => setPreviewDoc(doc)}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-slate-900 shadow-sm"
                                                    onClick={() => handleDownload(doc.file_path, doc.file_name)}
                                                >
                                                    <DownloadCloud className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Court Reports Section */}
                    <Card className="border-none ring-1 ring-slate-100 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-slate-50/30 border-b border-slate-50 py-4 px-6">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-slate-400" />
                                <CardTitle className="text-xs font-black text-slate-900 uppercase tracking-widest">Court Reports</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <ClientCourtReports matterId={id!} />
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-500">
                    <Card className="border-none ring-1 ring-slate-100 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-slate-50/30 border-b border-slate-50 py-4 px-6">
                            <CardTitle className="text-xs font-black text-slate-900 uppercase tracking-widest">Progress Tracker</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <ClientActivityTimeline logs={caseLogs || []} />
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-dashed border-2 border-primary/10 rounded-2xl p-6 text-center space-y-3">
                        <div className="bg-white h-9 w-9 rounded-xl shadow-sm flex items-center justify-center mx-auto ring-1 ring-slate-50">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                        </div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Legal Review</h4>
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">Our senior partners are auditing your submission. Estimated review time: 24-48 hours.</p>
                    </Card>
                </div>
            </div>

            <DocumentPreviewDialog
                isOpen={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
                document={previewDoc}
            />
        </div>
    );
}
