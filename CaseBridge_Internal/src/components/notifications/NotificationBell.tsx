import { Bell, Check, CheckCheck, Archive, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import {
    useUnreadNotificationCount,
    useRecentNotifications,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
    useArchiveNotification,
    useNotificationSubscription,
    getPriorityColor,
    getCategoryIcon,
    type Notification,
} from '@/hooks/useNotifications';

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { data: unreadCount = 0 } = useUnreadNotificationCount();
    const { data: notifications = [] } = useRecentNotifications(20);
    const markAsRead = useMarkNotificationRead();
    const markAllAsRead = useMarkAllNotificationsRead();
    const archiveNotification = useArchiveNotification();

    // Subscribe to real-time notifications
    useNotificationSubscription();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read_at) {
            await markAsRead.mutateAsync(notification.id);
        }
        setIsOpen(false);
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead.mutateAsync();
    };

    const handleArchive = async (e: React.MouseEvent, notificationId: string) => {
        e.stopPropagation();
        await archiveNotification.mutateAsync(notificationId);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-md shadow-2xl border border-slate-200 z-50 max-h-[600px] flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                                Notifications
                            </h3>
                            {unreadCount > 0 && (
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {unreadCount} unread
                                </p>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-md transition-colors"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm font-medium text-slate-600">
                                    No notifications yet
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    You'll be notified of important case updates
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {notifications.map((notification) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onClick={() => handleNotificationClick(notification)}
                                        onArchive={(e) => handleArchive(e, notification.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-slate-200">
                            <Link
                                to="/notifications"
                                className="block text-center text-xs font-semibold text-primary hover:text-primary/80 uppercase tracking-wide"
                                onClick={() => setIsOpen(false)}
                            >
                                View All Notifications
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

interface NotificationItemProps {
    notification: Notification;
    onClick: () => void;
    onArchive: (e: React.MouseEvent) => void;
}

function NotificationItem({ notification, onClick, onArchive }: NotificationItemProps) {
    const isUnread = !notification.read_at;
    const priorityColor = getPriorityColor(notification.priority);
    const categoryIcon = getCategoryIcon(notification.event_category);

    const notificationLink = notification.case_id
        ? `/cases/${notification.case_id}`
        : '#';

    return (
        <div
            className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer group relative ${isUnread ? 'bg-blue-50/30' : ''
                }`}
            onClick={onClick}
        >
            {/* Unread indicator */}
            {isUnread && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
            )}

            <div className="flex gap-3 pl-4">
                {/* Icon */}
                <div className="flex-shrink-0 text-2xl">
                    {categoryIcon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`text-sm font-semibold ${isUnread ? 'text-slate-900' : 'text-slate-700'}`}>
                            {notification.title}
                        </h4>
                        {notification.priority !== 'normal' && (
                            <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md border ${priorityColor}`}>
                                {notification.priority}
                            </span>
                        )}
                    </div>

                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                        {notification.message}
                    </p>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                            {notification.matter_number && (
                                <span className="font-mono">
                                    {notification.matter_number}
                                </span>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isUnread && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClick();
                                    }}
                                    className="p-1 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                    title="Mark as read"
                                >
                                    <Check className="h-3.5 w-3.5" />
                                </button>
                            )}
                            <button
                                onClick={onArchive}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Archive"
                            >
                                <Archive className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
