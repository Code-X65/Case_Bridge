import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, User, Download, Clock, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface ClientCourtReportDetailsDialogProps {
    report: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reportNumber: number;
}

export function ClientCourtReportDetailsDialog({ report, open, onOpenChange, reportNumber }: ClientCourtReportDetailsDialogProps) {
    if (!report) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white border-none shadow-2xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <DialogTitle className="text-sm font-black text-slate-900 uppercase tracking-widest">
                                    Court Report #{reportNumber}
                                </DialogTitle>
                                {report.close_case && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                                        Final Report
                                    </span>
                                )}
                            </div>
                            <DialogDescription className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(report.created_at), 'MMMM dd, yyyy')}
                                <span className="text-slate-300">•</span>
                                <Clock className="h-3 w-3" />
                                {format(new Date(report.created_at), 'h:mm a')}
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Author Info */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="h-8 w-8 bg-white border border-slate-200 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-slate-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-900">
                                Submitted by {report.associate?.first_name} {report.associate?.last_name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                                Associate Lawyer
                            </p>
                        </div>
                    </div>

                    {/* Report Text */}
                    <div>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                            Report Details
                        </h4>
                        <div className="prose prose-sm prose-slate max-w-none text-slate-700 font-medium leading-relaxed bg-white rounded-lg">
                            <p className="whitespace-pre-wrap">{report.report_content}</p>
                        </div>
                    </div>

                    {/* Attachments */}
                    {report.attachments && report.attachments.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Paperclip className="h-4 w-4 text-slate-400" />
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                    Attached Documents ({report.attachments.length})
                                </h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {report.attachments.map((attachment: any) => (
                                    <a
                                        key={attachment.id}
                                        href={`${supabase.storage.from('court-reports').getPublicUrl(attachment.file_path).data.publicUrl}`}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all"
                                    >
                                        <div className="h-8 w-8 bg-slate-50 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-white transition-colors">
                                            <FileText className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-900 truncate group-hover:text-primary transition-colors">
                                                {attachment.file_name}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-medium">
                                                {attachment.file_size ? `${(attachment.file_size / 1024).toFixed(1)} KB` : 'Unknown size'}
                                            </p>
                                        </div>
                                        <Download className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors mt-1" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
