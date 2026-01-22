import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { FileText, Upload, X, Loader2, CheckCircle2 } from 'lucide-react';

interface CourtReportSubmissionProps {
    matterId: string;
    matterStatus: string;
    isAssigned: boolean;
}

export default function CourtReportSubmission({ matterId, matterStatus, isAssigned }: CourtReportSubmissionProps) {
    const queryClient = useQueryClient();
    const [reportContent, setReportContent] = useState('');
    const [closeCase, setCloseCase] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const submitReportMutation = useMutation({
        mutationFn: async () => {
            if (!reportContent.trim()) {
                throw new Error('Report content is required');
            }

            const { data: rpcData, error } = await supabase.rpc('submit_court_report', {
                p_matter_id: matterId,
                p_report_content: reportContent,
                p_close_case: closeCase
            });

            if (error) {
                console.error('RPC Error:', error);
                throw error;
            }

            const reportId = rpcData?.report_id;
            const isFirstReport = rpcData?.is_first_report;

            if (!reportId) {
                throw new Error('Failed to get report ID from submission');
            }

            if (attachments.length > 0) {
                for (const file of attachments) {
                    try {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${reportId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                        const { error: uploadError } = await supabase.storage
                            .from('court-reports')
                            .upload(fileName, file);

                        if (uploadError) continue;

                        await supabase
                            .from('court_report_attachments')
                            .insert({
                                court_report_id: reportId,
                                file_name: file.name,
                                file_path: fileName,
                                file_size: file.size,
                                file_type: file.type
                            });
                    } catch (fileError) {
                        console.error('Error processing file:', file.name, fileError);
                    }
                }
            }

            return { report_id: reportId, is_first_report: isFirstReport };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['matter', matterId] });
            queryClient.invalidateQueries({ queryKey: ['court-reports', matterId] });
            queryClient.invalidateQueries({ queryKey: ['case-logs', matterId] });

            toast({
                title: 'Report Submitted',
                description: data?.is_first_report
                    ? 'Your first court report has been submitted and the case is now active.'
                    : closeCase
                        ? 'Final report submitted and case has been closed.'
                        : 'Court report submitted successfully.',
            });

            setReportContent('');
            setCloseCase(false);
            setAttachments([]);
            setIsDialogOpen(false);
        },
        onError: (error: any) => {
            console.error('Submission error:', error);
            toast({
                title: 'Submission Failed',
                description: error.message || 'Failed to submit court report',
                variant: 'destructive',
            });
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setAttachments(prev => [...prev, ...newFiles]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    if (!isAssigned || ['Closed', 'Completed'].includes(matterStatus)) {
        return null;
    }

    return (
        <>
            <button
                onClick={() => setIsDialogOpen(true)}
                className="inline-flex items-center gap-2 px-6 h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-sm uppercase tracking-wide rounded-md transition-all shadow-lg shadow-primary/20"
            >
                <FileText className="h-5 w-5" />
                Submit Court Report
            </button>

            {isDialogOpen && (
                <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-md shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                                        Submit Court Report
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        Provide case updates and documentation
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDialogOpen(false)}
                                className="h-8 w-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                    Case Report <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={reportContent}
                                    onChange={(e) => setReportContent(e.target.value)}
                                    placeholder="Enter detailed case report including court proceedings, evidence presented, witness testimonies, and any significant developments..."
                                    className="w-full min-h-[200px] p-4 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-y"
                                    required
                                />
                                <p className="text-xs text-slate-500 mt-2 font-medium">
                                    {reportContent.length} characters
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                    Attachments (Optional)
                                </label>

                                <div className="space-y-3">
                                    <label className="flex items-center justify-center gap-2 w-full h-12 border-2 border-dashed border-slate-200 rounded-md hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group">
                                        <Upload className="h-4 w-4 text-slate-400 group-hover:text-primary" />
                                        <span className="text-xs font-bold text-slate-600 group-hover:text-primary">
                                            Upload Documents
                                        </span>
                                        <input
                                            type="file"
                                            multiple
                                            onChange={handleFileChange}
                                            className="hidden"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        />
                                    </label>

                                    {attachments.length > 0 && (
                                        <div className="space-y-2">
                                            {attachments.map((file, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-100"
                                                >
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold text-slate-900 truncate">
                                                                {file.name}
                                                            </p>
                                                            <p className="text-[10px] text-slate-500 font-medium">
                                                                {(file.size / 1024).toFixed(1)} KB
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeAttachment(index)}
                                                        className="p-1 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-600 transition-colors"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {['Active', 'Ongoing'].includes(matterStatus) && (
                                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-md">
                                    <input
                                        type="checkbox"
                                        id="closeCase"
                                        checked={closeCase}
                                        onChange={(e) => setCloseCase(e.target.checked)}
                                        className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                    />
                                    <div className="flex-1">
                                        <label
                                            htmlFor="closeCase"
                                            className="text-xs font-bold text-amber-900 cursor-pointer"
                                        >
                                            Close Case with this Report
                                        </label>
                                        <p className="text-xs text-amber-700 mt-1 font-medium">
                                            Check this box if this is the final report and the case should be marked as completed.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setIsDialogOpen(false)}
                                className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wide rounded-md hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => submitReportMutation.mutate()}
                                disabled={submitReportMutation.isPending || !reportContent.trim()}
                                className="px-6 py-2 bg-primary text-white font-semibold text-xs uppercase tracking-wide rounded-md hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitReportMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4" />
                                        Submit Report
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
