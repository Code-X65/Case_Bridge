import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    UserCircle,
    Briefcase,
    FileText,
    Bell
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

const NavItem = ({ to, icon: Icon, label, badge = 0 }: any) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => `flex flex-col items-center justify-center p-2 rounded-xl transition-all relative ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
            {({ isActive }) => (
                <>
                    {/* Active Background Glow */}
                    {isActive && (
                        <div className="absolute inset-0 bg-primary/10 rounded-xl max-h-[80%] my-auto" />
                    )}

                    <div className="relative mb-1">
                        <Icon size={22} className={`relative z-10 transition-transform ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(201,162,77,0.5)]' : ''}`} />
                        {badge > 0 && (
                            <span className="absolute -top-1 -right-2 bg-primary text-primary-foreground text-[8px] font-black h-4 min-w-[16px] flex items-center justify-center rounded-full px-1 shadow-[0_0_8px_rgba(201,162,77,0.6)] z-20 pointer-events-none">
                                {badge > 99 ? '99+' : badge}
                            </span>
                        )}
                    </div>
                    <span className={`text-[9px] font-bold tracking-wider relative z-10 hidden xs:block ${isActive ? 'text-primary' : ''}`}>
                        {label}
                    </span>
                    {/* Active minimal dot indicator for very small screens */}
                    <span className={`h-1 w-1 rounded-full xs:hidden mt-0.5 transition-opacity ${isActive ? 'bg-primary opacity-100 shadow-[0_0_5px_rgba(201,162,77,0.8)]' : 'opacity-0'}`}></span>
                </>
            )}
        </NavLink>
    );
};

export default function ClientBottomNav() {
    const { unreadCount } = useNotifications();

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 bg-card/80 backdrop-blur-2xl border-t border-border pb-safe">
            <div className="flex items-center justify-around p-2 shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
                <NavItem to="/dashboard" icon={LayoutDashboard} label="Home" />
                <NavItem to="/cases" icon={Briefcase} label="Cases" />
                {/* Center Action (Optional, can just be a regular tab or special elevated one. Let's make it regular for now) */}
                <NavItem to="/documents" icon={FileText} label="Vault" />
                <NavItem to="/notifications" icon={Bell} label="Alerts" badge={unreadCount} />
                <NavItem to="/profile" icon={UserCircle} label="Profile" />
            </div>
        </nav>
    );
}
