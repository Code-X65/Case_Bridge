/**
 * Calendar OAuth Controller
 * Handles OAuth flows for Google and Microsoft calendar integrations
 */

const { createClient } = require('@supabase/supabase-js');
const { GoogleCalendarService } = require('../services/googleCalendar');
const { OutlookCalendarService } = require('../services/outlookCalendar');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Initiate Google OAuth flow
 */
const initiateGoogleOAuth = async (req, res, next) => {
    try {
        const authUrl = GoogleCalendarService.getAuthUrl();
        
        if (!authUrl) {
            return res.status(500).json({ error: 'Failed to generate Google OAuth URL' });
        }
        
        res.json({ authUrl });
    } catch (error) {
        console.error('[OAuth] Google init error:', error);
        next(error);
    }
};

/**
 * Handle Google OAuth callback
 */
const handleGoogleCallback = async (req, res, next) => {
    try {
        const { code, user_id, firm_id } = req.query;
        
        if (!code) {
            return res.status(400).json({ error: 'Authorization code not provided' });
        }
        
        // Exchange code for tokens
        const tokens = await GoogleCalendarService.getTokensFromCode(code);
        
        // Get user info
        const googleService = new GoogleCalendarService(tokens);
        const userInfo = await googleService.getUserInfo();
        
        // Save to database
        const { data: connection, error } = await supabase
            .from('user_calendar_connections')
            .upsert({
                user_id: user_id,
                firm_id: firm_id,
                provider: 'google',
                provider_email: userInfo.email,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: new Date(tokens.expires_at).toISOString(),
                sync_enabled: true,
                primary_calendar_provider: 'google',
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,provider' })
            .select()
            .single();
        
        if (error) throw error;
        
        // Redirect to frontend with success
        const redirectUrl = `${process.env.FRONTEND_URL}/internal/profile?calendar=connected&provider=google`;
        res.redirect(redirectUrl);
    } catch (error) {
        console.error('[OAuth] Google callback error:', error);
        const redirectUrl = `${process.env.FRONTEND_URL}/internal/profile?calendar=error&provider=google&message=${encodeURIComponent(error.message)}`;
        res.redirect(redirectUrl);
    }
};

/**
 * Initiate Microsoft OAuth flow
 */
const initiateMicrosoftOAuth = async (req, res, next) => {
    try {
        const authUrl = OutlookCalendarService.getAuthUrl();
        
        if (!authUrl) {
            return res.status(500).json({ error: 'Failed to generate Microsoft OAuth URL' });
        }
        
        res.json({ authUrl });
    } catch (error) {
        console.error('[OAuth] Microsoft init error:', error);
        next(error);
    }
};

/**
 * Handle Microsoft OAuth callback
 */
const handleMicrosoftCallback = async (req, res, next) => {
    try {
        const { code, user_id, firm_id } = req.query;
        
        if (!code) {
            return res.status(400).json({ error: 'Authorization code not provided' });
        }
        
        // Exchange code for tokens
        const tokens = await OutlookCalendarService.getTokensFromCode(code);
        
        // Get user info
        const outlookService = new OutlookCalendarService(tokens);
        const userInfo = await outlookService.getUserInfo();
        
        // Save to database
        const { data: connection, error } = await supabase
            .from('user_calendar_connections')
            .upsert({
                user_id: user_id,
                firm_id: firm_id,
                provider: 'outlook',
                provider_email: userInfo.mail || userInfo.userPrincipalName,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: new Date(tokens.expires_at).toISOString(),
                sync_enabled: true,
                primary_calendar_provider: 'outlook',
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,provider' })
            .select()
            .single();
        
        if (error) throw error;
        
        // Redirect to frontend with success
        const redirectUrl = `${process.env.FRONTEND_URL}/internal/profile?calendar=connected&provider=outlook`;
        res.redirect(redirectUrl);
    } catch (error) {
        console.error('[OAuth] Microsoft callback error:', error);
        const redirectUrl = `${process.env.FRONTEND_URL}/internal/profile?calendar=error&provider=outlook&message=${encodeURIComponent(error.message)}`;
        res.redirect(redirectUrl);
    }
};

/**
 * Disconnect calendar connection
 */
const disconnectCalendar = async (req, res, next) => {
    try {
        const { provider, user_id } = req.body;
        
        if (!provider || !user_id) {
            return res.status(400).json({ error: 'Provider and user_id are required' });
        }
        
        const { error } = await supabase
            .from('user_calendar_connections')
            .delete()
            .eq('user_id', user_id)
            .eq('provider', provider);
        
        if (error) throw error;
        
        // Also delete event mappings
        await supabase
            .from('calendar_event_mappings')
            .delete()
            .eq('user_id', user_id)
            .eq('provider', provider);
        
        res.json({ success: true, message: `${provider} calendar disconnected` });
    } catch (error) {
        console.error('[OAuth] Disconnect error:', error);
        next(error);
    }
};

/**
 * Get user's calendar connections
 */
const getCalendarConnections = async (req, res, next) => {
    try {
        const { user_id } = req.params;
        
        if (!user_id) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        const { data: connections, error } = await supabase
            .from('user_calendar_connections')
            .select('*')
            .eq('user_id', user_id);
        
        if (error) throw error;
        
        // Don't expose tokens
        const sanitized = connections.map(c => ({
            id: c.id,
            provider: c.provider,
            provider_email: c.provider_email,
            sync_enabled: c.sync_enabled,
            last_sync_at: c.last_sync_at,
            created_at: c.created_at,
            primary_calendar_provider: c.primary_calendar_provider,
            calendar_name: c.calendar_name,
            sync_direction: c.sync_direction
        }));
        
        res.json(sanitized);
    } catch (error) {
        console.error('[OAuth] Get connections error:', error);
        next(error);
    }
};

/**
 * Update calendar sync settings
 */
const updateSyncSettings = async (req, res, next) => {
    try {
        const { connection_id } = req.params;
        const { sync_enabled, sync_direction, calendar_id, calendar_name, sync_settings } = req.body;
        
        const updates = {};
        if (sync_enabled !== undefined) updates.sync_enabled = sync_enabled;
        if (sync_direction) updates.sync_direction = sync_direction;
        if (calendar_id) updates.calendar_id = calendar_id;
        if (calendar_name) updates.calendar_name = calendar_name;
        if (sync_settings) updates.sync_settings = sync_settings;
        
        const { data, error } = await supabase
            .from('user_calendar_connections')
            .update(updates)
            .eq('id', connection_id)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json(data);
    } catch (error) {
        console.error('[OAuth] Update settings error:', error);
        next(error);
    }
};

/**
 * Trigger manual sync
 */
const triggerSync = async (req, res, next) => {
    try {
        const { user_id, provider } = req.body;
        
        if (!user_id || !provider) {
            return res.status(400).json({ error: 'User ID and provider are required' });
        }
        
        // Get connection
        const { data: connection, error } = await supabase
            .from('user_calendar_connections')
            .select('*')
            .eq('user_id', user_id)
            .eq('provider', provider)
            .single();
        
        if (error || !connection) {
            return res.status(404).json({ error: 'Calendar connection not found' });
        }
        
        // Check if token needs refresh
        let tokens = {
            access_token: connection.access_token,
            refresh_token: connection.refresh_token,
            expires_at: connection.expires_at
        };
        
        if (new Date(connection.expires_at) < new Date()) {
            // Refresh token
            if (provider === 'google') {
                const googleService = new GoogleCalendarService(tokens);
                tokens = await googleService.refreshToken();
            } else if (provider === 'outlook') {
                const outlookService = new OutlookCalendarService(tokens);
                tokens = await outlookService.refreshToken();
            }
            
            // Update tokens in database
            await supabase
                .from('user_calendar_connections')
                .update({
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expires_at: new Date(tokens.expires_at).toISOString()
                })
                .eq('id', connection.id);
        }
        
        // Return success - actual sync would be handled by edge function
        res.json({ 
            success: true, 
            message: 'Sync triggered',
            next_sync: 'Automatic sync will occur within the hour'
        });
    } catch (error) {
        console.error('[OAuth] Sync trigger error:', error);
        next(error);
    }
};

/**
 * Connect calendar with tokens (for storing after OAuth)
 */
const connectCalendar = async (req, res, next) => {
    try {
        const { user_id, firm_id, provider, access_token, refresh_token, expires_at, provider_email } = req.body;
        
        if (!user_id || !provider || !access_token) {
            return res.status(400).json({ error: 'user_id, provider, and access_token are required' });
        }
        
        if (!['google', 'outlook'].includes(provider)) {
            return res.status(400).json({ error: 'Provider must be google or outlook' });
        }
        
        // Save to database
        const { data: connection, error } = await supabase
            .from('user_calendar_connections')
            .upsert({
                user_id,
                firm_id,
                provider,
                provider_email: provider_email || null,
                access_token,
                refresh_token: refresh_token || null,
                expires_at: expires_at ? new Date(expires_at).toISOString() : null,
                sync_enabled: true,
                primary_calendar_provider: provider,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,provider' })
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ 
            success: true, 
            message: `${provider} calendar connected successfully`,
            connection_id: connection.id
        });
    } catch (error) {
        console.error('[OAuth] Connect error:', error);
        next(error);
    }
};

module.exports = {
    initiateGoogleOAuth,
    handleGoogleCallback,
    initiateMicrosoftOAuth,
    handleMicrosoftCallback,
    disconnectCalendar,
    getCalendarConnections,
    updateSyncSettings,
    triggerSync,
    connectCalendar
};
