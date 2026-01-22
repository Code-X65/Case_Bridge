import { Clock, FileText, UserCheck, AlertCircle, CheckCircle2, XCircle, Edit3, User } from 'lucide-react';
import { format } from 'date-fns';

interface ActivityTimelineProps {
    logs: any[];
}

export default function ClientActivityTimeline({ logs }: ActivityTimelineProps) {
    const getActivityIcon = (action: string) => {
        switch (action) {
            case 'status_changed':
                return { icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' };
            case 'court_report_submitted':
                return { icon: FileText, color: 'text-green-600', bg: 'bg-green-50' };
            case 'lawyer_assigned':
                return { icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50' };
            case 'case_created':
                return { icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-50' };
            case 'case_updated':
                return { icon: Edit3, color: 'text-amber-600', bg: 'bg-amber-50' };
            case 'case_closed':
                return { icon: XCircle, color: 'text-slate-600', bg: 'bg-slate-50' };
            default:
                return { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50' };
        }
    };

    const getActivityTitle = (log: any) => {
        switch (log.action) {
            case 'status_changed':
                return `Status: ${log.details?.new_status || 'Updated'}`;
            case 'court_report_submitted':
                return log.details?.is_first_report ? 'First Court Report' : 'Court Report Update';
            case 'lawyer_assigned':
                return 'Lawyer Assigned';
            case 'case_created':
                return 'Case Filed';
            case 'case_updated':
                return 'Case Updated';
            case 'case_closed':
                return 'Case Closed';
            default:
                return log.action.replace(/_/g, ' ');
        }
    };

    const getActivityDescription = (log: any) => {
        switch (log.action) {
            case 'status_changed':
                return log.details?.note || `Progress updated to ${log.details?.new_status || 'the next phase'}.`;
            case 'court_report_submitted':
                if (log.details?.close_case) {
                    return 'Final legal report submitted.';
                }
                return 'A new progress report has been submitted by your lawyer.';
            case 'lawyer_assigned':
                return 'A legal specialist has been assigned to your case.';
            default:
                return null;
        }
    };

    if (!logs || logs.length === 0) {
        return (
            <div className="text-center py-10 opacity-60">
                <Clock className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Waiting for activity</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {logs.map((log, index) => {
                const { icon: Icon, color, bg } = getActivityIcon(log.action);
                const title = getActivityTitle(log);
                const description = getActivityDescription(log);

                return (
                    <div key={log.id} className="relative flex gap-4">
                        {/* Connection Line */}
                        {index !== logs.length - 1 && (
                            <div className="absolute left-[9px] top-6 w-[1px] h-[calc(100%+24px)] bg-slate-100" />
                        )}

                        {/* Icon */}
                        <div className={`shrink-0 relative z-10 w-5 h-5 ${bg} rounded-full flex items-center justify-center ring-4 ring-white`}>
                            <Icon className={`h-2.5 w-2.5 ${color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className={`text-[11px] font-black uppercase tracking-tighter ${index === 0 ? 'text-slate-900' : 'text-slate-500'}`}>
                                    {title}
                                </h3>
                                <span className="text-[9px] font-bold text-slate-400">
                                    {format(new Date(log.created_at), 'MMM dd')}
                                </span>
                            </div>

                            {description && (
                                <p className="text-[10px] text-slate-500 leading-tight font-medium">
                                    {description}
                                </p>
                            )}

                            <div className="flex items-center gap-1.5 pt-1">
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">
                                    {format(new Date(log.created_at), 'h:mm a')}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
