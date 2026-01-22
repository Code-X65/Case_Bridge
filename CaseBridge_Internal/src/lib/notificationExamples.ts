// ============================================================================
// NOTIFICATION SYSTEM - INTEGRATION EXAMPLES
// ============================================================================
// This file contains practical examples of how to integrate the notification
// system into your existing CaseBridge application.
// ============================================================================

import { supabase } from '@/lib/supabase';

// ============================================================================
// EXAMPLE 1: Trigger Notification When Court Report is Submitted
// ============================================================================

export async function submitCourtReport(
    caseId: string,
    reportData: any,
    firmId: string,
    userId: string
) {
    // 1. Save the court report
    const { data: report, error: reportError } = await supabase
        .from('court_reports')
        .insert({
            matter_id: caseId,
            ...reportData,
            submitted_by: userId,
        })
        .select()
        .single();

    if (reportError) throw reportError;

    // 2. Create notification for all Case Managers
    const { error: notificationError } = await supabase.rpc(
        'create_notification_for_case_managers',
        {
            p_firm_id: firmId,
            p_event_type: 'court_report_submitted',
            p_case_id: caseId,
            p_triggered_by: userId,
            p_metadata: {
                document_name: reportData.title || 'Court Report',
                is_first_report: reportData.is_first,
            },
        }
    );

    if (notificationError) {
        console.error('Failed to create notification:', notificationError);
        // Don't throw - notification failure shouldn't block the main action
    }

    return report;
}

// ============================================================================
// EXAMPLE 2: Notify When Case is Reassigned
// ============================================================================

export async function reassignCase(
    caseId: string,
    oldAssociateId: string,
    newAssociateId: string,
    firmId: string,
    reassignedBy: string
) {
    // 1. Get names for notification message
    const { data: oldAssociate } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', oldAssociateId)
        .single();

    const { data: newAssociate } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', newAssociateId)
        .single();

    // 2. Update assignment
    const { error: updateError } = await supabase
        .from('case_assignments')
        .update({ associate_id: newAssociateId })
        .eq('matter_id', caseId)
        .eq('associate_id', oldAssociateId);

    if (updateError) throw updateError;

    // 3. Notify Case Managers
    await supabase.rpc('create_notification_for_case_managers', {
        p_firm_id: firmId,
        p_event_type: 'case_reassigned',
        p_case_id: caseId,
        p_triggered_by: reassignedBy,
        p_metadata: {
            old_assignee: `${oldAssociate?.first_name} ${oldAssociate?.last_name}`,
            new_assignee: `${newAssociate?.first_name} ${newAssociate?.last_name}`,
            priority: 'high',
        },
    });
}

// ============================================================================
// EXAMPLE 3: Notify When Deadline is Approaching (Scheduled Job)
// ============================================================================

export async function checkApproachingDeadlines() {
    // This would typically run as a cron job or scheduled function

    // 1. Find cases with deadlines in the next 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const { data: cases } = await supabase
        .from('matters')
        .select('id, title, deadline, firm_id')
        .not('deadline', 'is', null)
        .lte('deadline', threeDaysFromNow.toISOString())
        .gte('deadline', new Date().toISOString())
        .not('status', 'in', '(Closed,Completed)');

    // 2. Create notifications for each case
    for (const case_ of cases || []) {
        const daysRemaining = Math.ceil(
            (new Date(case_.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        await supabase.rpc('create_notification_for_case_managers', {
            p_firm_id: case_.firm_id,
            p_event_type: 'deadline_approaching',
            p_case_id: case_.id,
            p_triggered_by: null, // System-generated
            p_metadata: {
                days_remaining: daysRemaining.toString(),
                deadline: case_.deadline,
                priority: 'urgent',
            },
        });
    }
}

// ============================================================================
// EXAMPLE 4: Notify When Document is Uploaded
// ============================================================================

export async function uploadDocument(
    caseId: string,
    file: File,
    firmId: string,
    uploadedBy: string
) {
    // 1. Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`${caseId}/${file.name}`, file);

    if (uploadError) throw uploadError;

    // 2. Create document record
    const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
            matter_id: caseId,
            file_name: file.name,
            file_path: uploadData.path,
            uploaded_by: uploadedBy,
        })
        .select()
        .single();

    if (docError) throw docError;

    // 3. Notify Case Managers
    await supabase.rpc('create_notification_for_case_managers', {
        p_firm_id: firmId,
        p_event_type: 'document_uploaded',
        p_case_id: caseId,
        p_triggered_by: uploadedBy,
        p_metadata: {
            document_name: file.name,
        },
    });

    return document;
}

// ============================================================================
// EXAMPLE 5: Notify When Case is Flagged as High-Risk
// ============================================================================

export async function flagCaseAsHighRisk(
    caseId: string,
    reason: string,
    firmId: string,
    flaggedBy: string
) {
    // 1. Update case
    const { error: updateError } = await supabase
        .from('matters')
        .update({
            is_flagged: true,
            flag_reason: reason,
            flagged_at: new Date().toISOString(),
            flagged_by: flaggedBy,
        })
        .eq('id', caseId);

    if (updateError) throw updateError;

    // 2. Create urgent notification
    await supabase.rpc('create_notification_for_case_managers', {
        p_firm_id: firmId,
        p_event_type: 'case_flagged',
        p_case_id: caseId,
        p_triggered_by: flaggedBy,
        p_metadata: {
            reason: reason,
            priority: 'urgent',
        },
    });

    // 3. Log the action
    await supabase.from('audit_logs').insert({
        firm_id: firmId,
        actor_id: flaggedBy,
        action: 'case_flagged',
        details: { case_id: caseId, reason },
    });
}

// ============================================================================
// EXAMPLE 6: Batch Notification for Multiple Events
// ============================================================================

export async function processDailyDigest(firmId: string) {
    // This could be a daily summary notification

    // 1. Get today's activity
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todaysCases } = await supabase
        .from('matters')
        .select('*')
        .eq('firm_id', firmId)
        .gte('created_at', today.toISOString());

    const { data: todaysReports } = await supabase
        .from('court_reports')
        .select('*')
        .eq('firm_id', firmId)
        .gte('created_at', today.toISOString());

    // 2. Create digest notification
    const casesCount = todaysCases?.length || 0;
    const reportsCount = todaysReports?.length || 0;

    if (casesCount > 0 || reportsCount > 0) {
        await supabase.rpc('create_notification_for_case_managers', {
            p_firm_id: firmId,
            p_event_type: 'associate_update', // Using existing type
            p_case_id: null,
            p_triggered_by: null,
            p_metadata: {
                cases_created: casesCount,
                reports_submitted: reportsCount,
                priority: 'low',
            },
        });
    }
}

// ============================================================================
// EXAMPLE 7: Custom Notification with Manual Creation
// ============================================================================

export async function sendCustomNotification(
    firmId: string,
    title: string,
    message: string,
    caseId?: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
) {
    // Get all active Case Managers in the firm
    const { data: caseManagers } = await supabase
        .from('profiles')
        .select('id')
        .eq('firm_id', firmId)
        .eq('internal_role', 'case_manager')
        .eq('status', 'active');

    // Create notification for each Case Manager
    const notifications = caseManagers?.map((cm) => ({
        recipient_user_id: cm.id,
        recipient_role: 'case_manager',
        event_type: 'associate_update', // Generic type
        event_category: 'team_activity',
        firm_id: firmId,
        case_id: caseId || null,
        triggered_by: null,
        title: title,
        message: message,
        priority: priority,
        metadata: {},
    }));

    const { error } = await supabase.from('notifications').insert(notifications);

    if (error) throw error;
}

// ============================================================================
// EXAMPLE 8: React Component Integration
// ============================================================================

/*
import { useNotificationSubscription, useUnreadNotificationCount } from '@/hooks/useNotifications';
import NotificationBell from '@/components/notifications/NotificationBell';

export function AppHeader() {
    const { data: profile } = useCurrentUser();
    const { data: unreadCount } = useUnreadNotificationCount();
    
    // Subscribe to real-time notifications
    useNotificationSubscription();
    
    return (
        <header className="flex items-center justify-between p-4">
            <h1>CaseBridge</h1>
            
            {profile?.internal_role === 'case_manager' && (
                <div className="flex items-center gap-4">
                    <NotificationBell />
                    {unreadCount > 0 && (
                        <span className="text-sm text-slate-600">
                            {unreadCount} new notifications
                        </span>
                    )}
                </div>
            )}
        </header>
    );
}
*/

// ============================================================================
// EXAMPLE 9: Notification Preferences (Future Enhancement)
// ============================================================================

export async function updateNotificationPreferences(
    userId: string,
    preferences: {
        email_notifications?: boolean;
        browser_notifications?: boolean;
        notification_categories?: string[];
    }
) {
    // This would store user preferences for notification delivery
    const { error } = await supabase
        .from('notification_preferences')
        .upsert({
            user_id: userId,
            ...preferences,
            updated_at: new Date().toISOString(),
        });

    if (error) throw error;
}

// ============================================================================
// EXAMPLE 10: Notification Analytics
// ============================================================================

export async function getNotificationStats(firmId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: stats } = await supabase
        .from('notifications')
        .select('event_category, priority, read_at')
        .eq('firm_id', firmId)
        .gte('created_at', startDate.toISOString());

    return {
        total: stats?.length || 0,
        unread: stats?.filter((n) => !n.read_at).length || 0,
        byCategory: stats?.reduce((acc, n) => {
            acc[n.event_category] = (acc[n.event_category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        byPriority: stats?.reduce((acc, n) => {
            acc[n.priority] = (acc[n.priority] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
    };
}
