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
            <div className="nav-item disabled group relative" title={badge}>
                <div className="flex items-center gap-3 px-4 py-3 text-muted-foreground/50 cursor-not-allowed">
                    <Icon size={20} />
                    <span className="flex-1 font-medium">{label}</span>
                    {badge && <span className="text-[10px] bg-secondary px-2 py-0.5 rounded uppercase tracking-wider">{badge}</span>}
                </div>
            </div>
        );
    }

    return (
        <NavLink
            to={to}
            className={({ isActive }) => `nav-item flex items-center gap-3 px-4 py-3 transition-colors ${isActive ? 'bg-primary/10 text-primary border-r-2 border-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}
        >
            <Icon size={20} />
            <span className="flex-1 font-medium">{label}</span>
            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
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
        // Close mobile menu when navigating
        if (onClose) {
            onClose();
        }
    };

    return (
        <aside
            className={`fixed left-0 top-0 h-full w-64 glass border-r border-white/10 flex flex-col z-50 
                lg:translate-x-0 transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
        >
            <div className="p-6">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 m-0">
                    CaseBridge
                </h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Client Portal</p>
            </div>

            <nav className="flex-1 mt-4" onClick={handleNavClick}>
                <div className="px-4 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Main
                </div>
                <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                <NavItem to="/profile" icon={UserCircle} label="Profile" />

                <div className="px-4 mt-8 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Legal Services
                </div>
                <NavItem to="/cases" icon={Briefcase} label="My Cases" />
                <div className="relative">
                    <NavItem to="/notifications" icon={Bell} label="Notifications" />
                    {unreadCount > 0 && (
                        <span className="absolute right-12 top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 text-[10px] font-black text-white flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(59,130,246,0.4)] pointer-events-none">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <NavItem to="/documents" icon={FileText} label="Documents" />
            </nav>

            <div className="p-4 border-t border-white/10">
                <NavItem to="/settings" icon={SettingsIcon} label="Settings" />
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors rounded-md mt-2"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
}
