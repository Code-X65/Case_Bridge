import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    UserCircle,
    Briefcase,
    FileText,
    Settings as SettingsIcon,
    LogOut,
    ChevronRight,
    Bell
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { supabase } from '../lib/supabase';

const NavItem = ({ to, icon: Icon, label, disabled = false, badge = '' }: any) => {
    if (disabled) {
        return (
            <div className="nav-item opacity-50 relative pointer-events-none p-4 mx-3 rounded-[var(--radius-neumorph)] bg-transparent">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <Icon size={20} />
                    <span className="flex-1 font-bold text-sm tracking-wide">{label}</span>
                    {badge && <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{badge}</span>}
                </div>
            </div>
        );
    }

    return (
        <NavLink
            to={to}
            className={({ isActive }) => `
                flex items-center gap-3 p-4 mx-3 rounded-[var(--radius-neumorph)] transition-all group relative overflow-hidden mb-2
                ${isActive
                    ? 'bg-primary/10 text-primary shadow-[0_0_15px_rgba(201,162,77,0.15)] border-l-4 border-primary'
                    : 'text-muted-foreground hover:bg-card hover:text-foreground shadow-sm hover:shadow-neumorph border-l-4 border-transparent'}
            `}
        >
            {({ isActive }) => (
                <>
                    {/* Hover internal glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <Icon size={20} className={`relative z-10 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/70'}`} />
                    <span className={`flex-1 font-bold text-sm tracking-wide relative z-10 transition-colors ${isActive ? 'text-primary' : 'text-foreground'}`}>{label}</span>
                    <ChevronRight size={16} className={`relative z-10 transition-all ${isActive ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-100 text-muted-foreground group-hover:text-primary -translate-x-2 group-hover:translate-x-0'}`} />
                </>
            )}
        </NavLink>
    );
};

interface ClientSidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function ClientSidebar({ isOpen = true, onClose }: ClientSidebarProps) {
    const navigate = useNavigate();
    const { unreadCount } = useNotifications();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const handleNavClick = () => {
        if (onClose) onClose();
    };

    return (
        <aside
            className={`fixed left-0 top-0 h-full w-72 bg-card/60 backdrop-blur-2xl border-r border-border flex flex-col z-50 transition-transform duration-300 ease-in-out shadow-neumorph-inset
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}
        >
            <div className="p-8 border-b border-border flex flex-col items-start justify-center relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>

                <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary/50 m-0 tracking-tight relative z-10">
                    CaseBridge
                </h1>
                <div className="flex items-center gap-2 mt-2 relative z-10">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(201,162,77,0.8)]"></div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Client Portal</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-6 no-scrollbar" onClick={handleNavClick}>
                <div className="px-6 mb-4 text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">
                    Main
                </div>
                <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                <NavItem to="/profile" icon={UserCircle} label="Profile" />

                <div className="px-6 mt-10 mb-4 text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">
                    Legal Services
                </div>
                <NavItem to="/cases" icon={Briefcase} label="My Cases" />
                <div className="relative">
                    <NavItem to="/notifications" icon={Bell} label="Notifications" />
                    {unreadCount > 0 && (
                        <span className="absolute right-8 top-1/2 -translate-y-1/2 min-w-[20px] h-5 px-1.5 bg-primary text-[10px] font-black text-primary-foreground flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(201,162,77,0.5)] pointer-events-none">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <NavItem to="/documents" icon={FileText} label="Documents" />
            </div>

            <div className="p-5 border-t border-border bg-card/30">
                <NavItem to="/settings" icon={SettingsIcon} label="Settings" />
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-3 p-4 rounded-[var(--radius-neumorph)] text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all font-bold tracking-wide mt-2 shadow-sm hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] group"
                >
                    <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Secure Logout</span>
                </button>
            </div>
        </aside>
    );
}
