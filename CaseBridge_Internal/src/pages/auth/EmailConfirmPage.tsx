import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function EmailConfirmPage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [firmName, setFirmName] = useState('');
    const [hasRun, setHasRun] = useState(false);

    useEffect(() => {
        if (hasRun) return;

        const confirmEmail = async () => {
            try {
                setHasRun(true);

                // STEP 1: Extract token from URL
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                let accessToken = hashParams.get('access_token');
                let refreshToken = hashParams.get('refresh_token');

                // Fallback: Try query params
                if (!accessToken) {
                    const queryParams = new URLSearchParams(window.location.search);
                    accessToken = queryParams.get('access_token') || queryParams.get('token');
                    refreshToken = queryParams.get('refresh_token');
                }

                console.log('🔐 Email confirmation attempt:', {
                    hasAccessToken: !!accessToken,
                    hasRefreshToken: !!refreshToken
                });

                if (!accessToken) {
                    throw new Error('No confirmation token found. Please use the link from your email.');
                }

                // STEP 2: Set session
                const { data: { user }, error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken || '',
                });

                if (sessionError) {
                    console.error('❌ Session error:', sessionError);
                    throw new Error(`Authentication failed: ${sessionError.message}`);
                }

                if (!user) {
                    throw new Error('No user found after authentication');
                }

                console.log('✅ User authenticated:', user.id);

                // STEP 3: Fetch pending registration from DATABASE
                const { data: pendingData, error: fetchError } = await supabase
                    .from('pending_firm_registrations')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (fetchError) {
                    console.error('❌ Error fetching pending registration:', fetchError);
                }

                // STEP 4: Handle different scenarios
                if (!pendingData) {
                    console.warn('⚠️ No pending registration found');

                    // Check if user already has a firm (re-confirmation case)
                    const { data: existingRoles } = await supabase
                        .from('user_firm_roles')
                        .select('*, firms(name)')
                        .eq('user_id', user.id)
                        .limit(1);

                    if (existingRoles && existingRoles.length > 0) {
                        console.log('✅ User already has firm, redirecting to login');
                        setStatus('success');
                        setMessage('Email already verified! You can now log in.');
                        // @ts-ignore
                        setFirmName(existingRoles[0].firms?.name || 'Your Firm');

                        await supabase.auth.signOut();

                        setTimeout(() => {
                            navigate('/internal/login');
                        }, 2000);
                        return;
                    }

                    throw new Error('No pending registration found. Please complete the registration process again.');
                }

                console.log('📋 Pending registration found:', pendingData.firm_name);
                setFirmName(pendingData.firm_name);

                // STEP 5: Complete registration using atomic RPC function
                console.log('🏢 Creating firm:', pendingData.firm_name);

                const { data: firmId, error: firmError } = await supabase.rpc('complete_firm_registration', {
                    p_user_id: user.id,
                    p_firm_name: pendingData.firm_name,
                    p_firm_email: pendingData.firm_email || user.email,
                    p_firm_phone: pendingData.firm_phone,
                    p_firm_address: pendingData.firm_address,
                    p_first_name: pendingData.user_first_name,
                    p_last_name: pendingData.user_last_name,
                    p_user_phone: pendingData.user_phone,
                });

                if (firmError) {
                    console.error('❌ Firm creation error:', firmError);
                    throw new Error(`Failed to create firm: ${firmError.message}`);
                }

                console.log('✅ Firm created successfully:', firmId);

                // STEP 6: Sign out and redirect to login
                await supabase.auth.signOut();

                setStatus('success');
                setMessage('Your firm has been activated successfully!');

                setTimeout(() => {
                    navigate('/internal/login', {
                        state: { message: 'Registration complete! Please log in.' }
                    });
                }, 3000);

            } catch (err: any) {
                console.error('❌ Confirmation error:', err);
                setStatus('error');
                setMessage(err.message || 'Email confirmation failed. Please try again.');
            }
        };

        confirmEmail();
    }, [hasRun, navigate]);

    return (
        <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Loading State */}
                {status === 'loading' && (
                    <div className="text-center">
                        <Loader2 className="w-16 h-16 animate-spin text-indigo-400 mx-auto mb-6" />
                        <h2 className="text-2xl font-black mb-2">Verifying Email...</h2>
                        <p className="text-slate-400">Please wait while we confirm your email address and activate your firm.</p>
                        <p className="text-xs text-slate-600 mt-4">Check the browser console for detailed logs</p>
                    </div>
                )}

                {/* Success State */}
                {status === 'success' && (
                    <div className="text-center">
                        <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-black mb-2">Email Verified!</h2>
                        <p className="text-slate-400 mb-6">{message}</p>

                        {firmName && (
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-6 mb-6">
                                <div className="flex items-center justify-center gap-3 mb-3">
                                    <ShieldCheck className="w-6 h-6 text-indigo-400" />
                                    <p className="text-lg font-bold text-white">{firmName}</p>
                                </div>
                                <p className="text-sm text-indigo-300">Your firm has been created successfully!</p>
                            </div>
                        )}

                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                            <p className="text-sm text-slate-300 mb-2">
                                <strong className="text-white">Next Steps:</strong>
                            </p>
                            <ul className="text-sm text-slate-400 space-y-1 text-left">
                                <li>✓ Email verified</li>
                                <li>✓ Firm activated</li>
                                <li>✓ Admin role assigned</li>
                                <li>→ Redirecting to login page...</li>
                            </ul>
                        </div>

                        <p className="text-xs text-slate-500">
                            You'll be redirected to the login page in a few seconds...
                        </p>
                    </div>
                )}

                {/* Error State */}
                {status === 'error' && (
                    <div className="text-center">
                        <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-red-400" />
                        </div>
                        <h2 className="text-2xl font-black mb-2">Verification Failed</h2>
                        <p className="text-slate-400 mb-6">{message}</p>

                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                            <p className="text-sm text-red-300 mb-3">
                                {message.includes('pending registration')
                                    ? 'The registration data was not found in the database. This can happen if the registration was already completed or if it expired.'
                                    : message.includes('token')
                                        ? 'The verification link may have expired or is invalid. Email confirmation links are valid for 24 hours.'
                                        : 'An unexpected error occurred during verification.'}
                            </p>
                            <p className="text-xs text-red-400">
                                Check the browser console (F12) for detailed error information.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => navigate('/internal/register-firm')}
                                className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
                            >
                                Try Registering Again
                            </button>
                            <button
                                onClick={() => navigate('/internal/login')}
                                className="text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                Already have an account? Log in
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
