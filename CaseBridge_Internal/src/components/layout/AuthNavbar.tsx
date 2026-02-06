import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Building2, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AuthNavbarProps {
    variant?: 'internal' | 'client';
}

export default function AuthNavbar({ variant = 'internal' }: AuthNavbarProps) {
    const location = useLocation();
    const isLoginPage = location.pathname.includes('login');
    const [hasFirm, setHasFirm] = useState<boolean | null>(null);

    useEffect(() => {
        async function checkFirm() {
            const { count } = await supabase
                .from('firms')
                .select('*', { count: 'exact', head: true });
            setHasFirm((count || 0) > 0);
        }
        checkFirm();
    }, []);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/5 backdrop-blur-xl border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-all">
                            {variant === 'internal' ? (
                                <ShieldCheck className="w-6 h-6 text-white" />
                            ) : (
                                <Building2 className="w-6 h-6 text-white" />
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-black text-lg tracking-tight">CaseBridge</span>
                            <span className="text-xs text-slate-400 font-medium -mt-1">
                                {variant === 'internal' ? 'Internal Portal' : 'Client Portal'}
                            </span>
                        </div>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-4">
                        {variant === 'internal' ? (
                            <>
                                <Link
                                    to="/internal/login"
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isLoginPage
                                        ? 'bg-white/10 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    Staff Login
                                </Link>
                                {!hasFirm && (
                                    <Link
                                        to="/internal/register-firm"
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${!isLoginPage
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        Register Firm
                                    </Link>
                                )}
                                <Link
                                    to="/client/login"
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"
                                >
                                    <Users className="w-4 h-4" />
                                    Client Portal
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/client/login"
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isLoginPage
                                        ? 'bg-white/10 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    Client Login
                                </Link>
                                <Link
                                    to="/internal/login"
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"
                                >
                                    <ShieldCheck className="w-4 h-4" />
                                    Staff Portal
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
