import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Onboarding() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        primaryGoals: [] as string[],
        personaType: '',
        urgencyLevel: '',
        referralSource: ''
    });

    const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            primaryGoals: checked
                ? [...prev.primaryGoals, value]
                : prev.primaryGoals.filter(g => g !== value)
        }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (!user) {
            setError("User not authenticated");
            setLoading(false);
            return;
        }

        try {
            // 1. Save responses in external_user_intent
            const { error: intentError } = await supabase
                .from('external_user_intent')
                .insert({
                    external_user_id: user.id,
                    primary_goals: formData.primaryGoals,
                    persona_type: formData.personaType,
                    urgency_level: formData.urgencyLevel,
                    referral_source: formData.referralSource || null
                });

            if (intentError) throw intentError;

            // 2. Update external_users.status -> active
            const { error: updateError } = await supabase
                .from('external_users')
                .update({ status: 'active' })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 3. Redirect to client dashboard
            navigate('/dashboard');

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to complete onboarding');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="glass-card auth-card" style={{ maxWidth: '600px' }}>
                <h1 className="mb-2">A few questions</h1>
                <p className="text-muted mb-8">Help us understand how we can help you.</p>

                {error && (
                    <div className="mb-4 p-3 bg-red-900/20 border border-red-500/20 text-red-200 rounded text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>

                    <div className="mb-6">
                        <label className="mb-2 block text-foreground">1. What would you like to use CaseBridge for?</label>
                        <div className="space-y-2">
                            {['Report a legal issue', 'Track an ongoing case', 'Consult a legal professional', 'Upload or manage documents', 'Just exploring'].map(opt => (
                                <label key={opt} style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal', color: 'inherit' }}>
                                    <input
                                        type="checkbox"
                                        value={opt}
                                        checked={formData.primaryGoals.includes(opt)}
                                        onChange={handleGoalChange}
                                        style={{ width: 'auto', marginRight: '0.75rem', marginBottom: 0 }}
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="mb-2 block text-foreground">2. Who are you?</label>
                        <div className="space-y-2">
                            {[
                                { label: 'Individual', value: 'individual' },
                                { label: 'Business Owner', value: 'business' },
                                { label: 'Representing an Organization', value: 'organisation_rep' }
                            ].map(opt => (
                                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal', color: 'inherit' }}>
                                    <input
                                        type="radio"
                                        name="personaType"
                                        value={opt.value}
                                        checked={formData.personaType === opt.value}
                                        onChange={handleChange}
                                        required
                                        style={{ width: 'auto', marginRight: '0.75rem', marginBottom: 0 }}
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="mb-2 block text-foreground">3. How urgent is your need?</label>
                        <div className="space-y-2">
                            {[
                                { label: 'Urgent', value: 'urgent' },
                                { label: 'Soon', value: 'soon' },
                                { label: 'Just researching', value: 'researching' }
                            ].map(opt => (
                                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal', color: 'inherit' }}>
                                    <input
                                        type="radio"
                                        name="urgencyLevel"
                                        value={opt.value}
                                        checked={formData.urgencyLevel === opt.value}
                                        onChange={handleChange}
                                        required
                                        style={{ width: 'auto', marginRight: '0.75rem', marginBottom: 0 }}
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="mb-8">
                        <label>4. How did you hear about CaseBridge? (Optional)</label>
                        <input
                            name="referralSource"
                            value={formData.referralSource}
                            onChange={handleChange}
                            placeholder="e.g. Google, Friend, Ad..."
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Saving...' : 'Complete Setup'}
                    </button>

                </form>
            </div>
        </div>
    );
}
