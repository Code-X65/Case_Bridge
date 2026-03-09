import {
    Clock, FileText, Download,
    Eye, Shield, X
} from 'lucide-react';
import { format } from 'date-fns';

interface PreviewProps {
    report: {
        title: string;
        content: string;
        created_at: string;
        is_final?: boolean;
    };
    authorName: string;
    matterTitle: string;
    attachments: any[];
    onClose: () => void;
}

export default function ClientReportPreview({ report, authorName, matterTitle, attachments, onClose }: PreviewProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-background/90 backdrop-blur-xl" onClick={onClose} />

            <div className="relative bg-[#0F172A] border border-white/10 w-full max-w-md h-full max-h-[85vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-500">
                {/* Mobile Status Bar Simulation */}
                <div className="h-6 flex items-center justify-center bg-black/20">
                    <div className="w-16 h-1 rounded-full bg-white/10 mt-2"></div>
                </div>

                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-gradient-to-b from-indigo-500/5 to-transparent flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Live Client Preview</p>
                        <h3 className="text-sm font-bold text-white uppercase tracking-tight opacity-50">Mobile Optimized View</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Simulated Screen Content */}
                <div className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar space-y-8 bg-[#0F172A]">

                    {/* Case Header in Mobile View */}
                    <div className="space-y-4">
                        <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
                            {matterTitle}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="px-4 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                Active Case
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                <Clock size={12} /> Filed {format(new Date(), 'MMM d, yyyy')}
                            </div>
                        </div>
                    </div>

                    {/* The Report Card (Mirroring Client UI) */}
                    <div className="bg-[#1E293B] border border-white/10 shadow-lg rounded-[2rem] p-6 border-l-4 border-l-indigo-500 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
                                {report.is_final ? 'Final Report' : 'Progress Update'}
                            </span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                                {format(new Date(report.created_at || new Date()), 'MMM d')}
                            </span>
                        </div>

                        <h3 className="text-lg font-black text-white mb-4">{report.title}</h3>
                        <div
                            className="text-slate-400 leading-relaxed text-sm mb-8 prose prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: report.content || 'Report content will appear here...' }}
                        />

                        {/* Attachments Section */}
                        {attachments.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-3">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Attached Evidence</p>
                                {attachments.map((doc, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-black/20 border border-white/5 rounded-2xl p-3 group">
                                        <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">
                                            <FileText size={16} />
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-300 truncate flex-1">{doc.name || doc.filename}</span>
                                        <div className="flex items-center gap-1">
                                            <Eye size={14} className="text-slate-600" />
                                            <Download size={14} className="text-slate-600" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Counsel Sidebar Simulation */}
                    <div className="bg-[#1E293B] border border-white/10 rounded-[2rem] p-6">
                        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Shield size={12} className="text-indigo-400" /> Assigned Counsel
                        </h2>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 font-black text-sm shadow-inner shrink-0">
                                {authorName.charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-white mb-0.5">{authorName}</h4>
                                <p className="text-[9px] text-indigo-400/80 font-bold uppercase tracking-widest">Lead Counsel</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer / Action simulation */}
                <div className="p-6 border-t border-white/5 bg-black/20">
                    <button disabled className="w-full py-3.5 bg-indigo-600/50 border border-indigo-500/20 text-indigo-300 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 opacity-50">
                        View Complete Timeline
                    </button>
                    <p className="text-[8px] text-slate-600 text-center mt-4 font-bold uppercase tracking-tighter italic">End-to-End Encryption Enabled</p>
                </div>
            </div>
        </div>
    );
}
