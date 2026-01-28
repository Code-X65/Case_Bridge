import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function VerifyEmail() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [status, setStatus] = useState('verifying'); // verifying, success, error

    useEffect(() => {
        const verifyUser = async () => {
            // If we have a user (meaning the link worked and session is active)
            if (user) {
                try {
                    // Update status to verified
                    const { error } = await supabase
                        .from('external_users')
                        .update({ status: 'verified' })
                        .eq('id', user.id);

                    if (error) throw error;

                    setStatus('success');
                    // Short delay then redirect
                    setTimeout(() => {
                        navigate('/onboarding');
                    }, 1500);
                } catch (err: any) {
                    console.error('Error verifying user:', err);
                    setStatus('error');
                }
            } else {
                // If no user, wait a bit? Or maybe session hasn't loaded yet?
                // The auth context handles loading. If we are here and user is null, maybe the link failed?
                // But useAuth handles loading state.
            }
        };

        verifyUser();
    }, [user, navigate]);

    return (
        <div className="page-container">
            <div className="glass-card auth-card text-center">
                {status === 'verifying' && (
                    <>
                        <Loader2 className="animate-spin mb-4 mx-auto" size={48} color="hsl(var(--primary))" />
                        <h1>Verifying...</h1>
                        <p>Please wait while we verify your email.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <h1 className="text-green-400">Verified!</h1>
                        <p>Redirecting to onboarding...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <h1 className="text-red-400">Verification Failed</h1>
                        <p>We couldn't verify your email. Please try logging in or contact support.</p>
                        <button onClick={() => navigate('/login')} className="btn btn-primary mt-4">
                            Go to Login
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
