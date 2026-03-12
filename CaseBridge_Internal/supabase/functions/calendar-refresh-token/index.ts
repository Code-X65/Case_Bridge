/**
 * Calendar Token Refresh Edge Function
 * Handles OAuth token refresh for specific calendar connections
 * 
 * This function:
 * 1. Accepts user_id and connection_id
 * 2. Refreshes the OAuth token for that specific connection
 * 3. Stores new tokens in the database
 * 4. Returns success/failure status
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalendarConnection {
  id: string;
  user_id: string;
  firm_id: string;
  provider: 'google' | 'outlook';
  provider_email: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  sync_enabled: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Parse request body
    const { user_id, connection_id } = await req.json();

    if (!user_id || !connection_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: user_id and connection_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the specific calendar connection
    const connectionResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_calendar_connections?id=eq.${connection_id}&user_id=eq.${user_id}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const connections: CalendarConnection[] = await connectionResponse.json();
    
    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Calendar connection not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const connection = connections[0];

    // Check if token actually needs refresh
    const tokenExpiry = new Date(connection.expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (tokenExpiry > fiveMinutesFromNow) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Token still valid, no refresh needed',
          expires_at: connection.expires_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refresh the token
    const refreshedTokens = await refreshToken(connection);

    if (!refreshedTokens) {
      return new Response(
        JSON.stringify({ error: 'Failed to refresh token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update tokens in database
    await fetch(
      `${supabaseUrl}/rest/v1/user_calendar_connections?id=eq.${connection.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          access_token: refreshedTokens.access_token,
          refresh_token: refreshedTokens.refresh_token,
          expires_at: refreshedTokens.expires_at,
          last_sync_at: new Date().toISOString(),
        }),
      }
    );

    // Log the refresh
    await logTokenRefresh(supabaseUrl, supabaseKey, connection.user_id, connection.provider, true);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Token refreshed successfully',
        expires_at: refreshedTokens.expires_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Token refresh error:', error);
    
    // Log the error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      await logTokenRefresh(supabaseUrl, supabaseKey, 'unknown', 'unknown', false, error.message);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function refreshToken(connection: CalendarConnection): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: string;
} | null> {
  try {
    if (connection.provider === 'google') {
      // Google token refresh
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
          refresh_token: connection.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google token refresh failed:', errorText);
        return null;
      }

      const tokens = await response.json();
      return {
        access_token: tokens.access_token,
        refresh_token: connection.refresh_token, // Google doesn't always return new refresh token
        expires_at: new Date(tokens.expires_in * 1000 + Date.now()).toISOString(),
      };

    } else if (connection.provider === 'outlook') {
      // Microsoft token refresh
      const tenantId = Deno.env.get('MICROSOFT_TENANT_ID') || 'common';
      const response = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: Deno.env.get('MICROSOFT_CLIENT_ID') || '',
            client_secret: Deno.env.get('MICROSOFT_CLIENT_SECRET') || '',
            refresh_token: connection.refresh_token,
            grant_type: 'refresh_token',
            scope: 'Calendars.ReadWrite User.Read offline_access',
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Microsoft token refresh failed:', errorText);
        return null;
      }

      const tokens = await response.json();
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || connection.refresh_token,
        expires_at: new Date(tokens.expires_in * 1000 + Date.now()).toISOString(),
      };
    }

    console.error('Unknown provider:', connection.provider);
    return null;

  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

async function logTokenRefresh(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
  provider: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    await fetch(
      `${supabaseUrl}/rest/v1/calendar_sync_logs`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          user_id: userId,
          provider: provider,
          action: 'token_refresh',
          status: success ? 'success' : 'error',
          details: errorMessage || 'Token refreshed successfully',
        }),
      }
    );
  } catch (error) {
    console.error('Failed to log token refresh:', error);
  }
}
