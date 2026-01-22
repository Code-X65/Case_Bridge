import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    isInternal: boolean | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isInternal, setIsInternal] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    const checkProfile = async (userId: string) => {
        try {
            console.log('🔍 Checking profile for user:', userId);

            // Add timeout to prevent infinite hanging
            const profilePromise = supabase
                .from('profiles')
                .select('internal_role')
                .eq('id', userId)
                .single();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
            );

            const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

            if (error) {
                console.error('❌ Error fetching profile:', error);
                setIsInternal(false); // Default to not internal if check fails
                return;
            }

            console.log('✅ Profile fetched:', data);
            setIsInternal(!!data?.internal_role);
            console.log('🔍 Is internal user?', !!data?.internal_role);
        } catch (err) {
            console.error('❌ Unexpected error in profile check:', err);
            setIsInternal(false);
        }
    };

    useEffect(() => {
        console.log('🔐 AuthProvider: Initializing...');

        // 1. Initial Session Recovery
        const initializeAuth = async () => {
            try {
                console.log('🔐 AuthProvider: Fetching session...');
                const { data: { session } } = await supabase.auth.getSession();
                console.log('🔐 AuthProvider: Session fetched:', session ? 'User logged in' : 'No session');

                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    console.log('🔐 AuthProvider: Checking profile for user:', session.user.id);
                    await checkProfile(session.user.id);
                }
            } catch (error) {
                console.error('❌ AuthProvider: Initial session check failed:', error);
            } finally {
                // IMPORTANT: Loading must resolve even if auth fails
                console.log('✅ AuthProvider: Setting loading to FALSE');
                setLoading(false);
            }
        };

        initializeAuth();

        // 2. Auth State Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            console.log('🔐 AuthProvider: Auth state changed:', event, currentSession ? 'Session exists' : 'No session');

            setSession(currentSession);
            setUser(currentSession?.user ?? null);

            if (currentSession?.user) {
                await checkProfile(currentSession.user.id);
            } else {
                setIsInternal(null);
            }

            setLoading(false);
        });

        return () => {
            console.log('🔐 AuthProvider: Cleaning up subscription');
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setIsInternal(null);
    };

    return (
        <AuthContext.Provider value={{ session, user, isInternal, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
