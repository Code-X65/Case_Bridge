/**
 * Calendar Sync Edge Function
 * Handles two-way synchronization between CaseBridge and external calendars
 * 
 * This function runs periodically to:
 * 1. Refresh expired tokens
 * 2. Push new CaseBridge events to external calendars
 * 3. Pull external calendar changes
 * 4. Update event mappings
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
  calendar_id?: string;
  sync_direction?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  attendees?: string[];
  status?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cronSecret = Deno.env.get('CRON_SECRET');

    // Verify cron authentication
    const authHeader = req.headers.get('authorization');
    const cronAuth = req.headers.get('x-cron-auth');
    
    // Allow calls with valid cron secret or service role key
    if (cronSecret && cronAuth !== cronSecret) {
      // Also check if it's a service role call (for manual triggers)
      if (!authHeader || !authHeader.includes(supabaseKey.substring(0, 20))) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get all active calendar connections
    const connectionsResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_calendar_connections?sync_enabled=eq.true&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const connections: CalendarConnection[] = await connectionsResponse.json();
    
    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active calendar connections to sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const conn of connections) {
      try {
        const syncResult = await syncCalendar(conn, supabaseUrl, supabaseKey);
        results.push({
          user_id: conn.user_id,
          provider: conn.provider,
          status: 'success',
          ...syncResult,
        });
      } catch (error) {
        results.push({
          user_id: conn.user_id,
          provider: conn.provider,
          status: 'error',
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: results.filter((r) => r.status === 'success').length,
        errors: results.filter((r) => r.status === 'error').length,
        details: results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function syncCalendar(
  connection: CalendarConnection,
  supabaseUrl: string,
  supabaseKey: string
) {
  // Check if token needs refresh
  const needsRefresh = new Date(connection.expires_at) < new Date();
  
  if (needsRefresh) {
    const refreshed = await refreshToken(connection);
    if (refreshed) {
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
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token,
            expires_at: refreshed.expires_at,
            last_sync_at: new Date().toISOString(),
          }),
        }
      );
      connection.access_token = refreshed.access_token;
      connection.refresh_token = refreshed.refresh_token;
    }
  }

  // Get pending events to sync
  const pendingResponse = await fetch(
    `${supabaseUrl}/rest/v1/calendar_event_mappings?user_id=eq.${connection.user_id}&provider=eq.${connection.provider}&sync_status=eq.pending&select=*`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    }
  );

  const pendingMappings = await pendingResponse.json();
  let synced = 0;

  for (const mapping of pendingMappings || []) {
    try {
      // Get the CaseBridge event
      const eventResponse = await fetch(
        `${supabaseUrl}/rest/v1/case_meetings?id=eq.${mapping.casebridge_event_id}&select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );
      
      const events = await eventResponse.json();
      if (!events || events.length === 0) continue;

      const event = events[0];

      // Map to external calendar format
      const externalEvent = {
        title: `Legal Meeting: ${event.title || 'Case Meeting'}`,
        description: event.description || '',
        start_time: event.confirmed_start || event.proposed_start,
        end_time: event.confirmed_end || event.proposed_end,
        location: event.video_meeting_link || '',
      };

      // Push to external calendar
      const externalEventId = await pushToExternalCalendar(
        connection.provider,
        connection.access_token,
        externalEvent
      );

      // Update mapping
      await fetch(
        `${supabaseUrl}/rest/v1/calendar_event_mappings?id=eq.${mapping.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            external_event_id: externalEventId,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          }),
        }
      );

      synced++;
    } catch (error) {
      // Mark as error
      await fetch(
        `${supabaseUrl}/rest/v1/calendar_event_mappings?id=eq.${mapping.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            sync_status: 'error',
            sync_error_message: error.message,
          }),
        }
      );
    }
  }

  return { events_synced: synced };
}

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

      if (!response.ok) return null;

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

      if (!response.ok) return null;

      const tokens = await response.json();
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || connection.refresh_token,
        expires_at: new Date(tokens.expires_in * 1000 + Date.now()).toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

async function pushToExternalCalendar(
  provider: string,
  accessToken: string,
  event: {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    location: string;
  }
): Promise<string> {
  if (provider === 'google') {
    // Push to Google Calendar
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: event.title,
          description: event.description,
          start: { dateTime: event.start_time, timeZone: 'UTC' },
          end: { dateTime: event.end_time, timeZone: 'UTC' },
          location: event.location,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id;
  } else if (provider === 'outlook') {
    // Push to Microsoft Graph API
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/me/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: event.title,
          body: { contentType: 'HTML', content: event.description },
          start: { dateTime: event.start_time, timeZone: 'UTC' },
          end: { dateTime: event.end_time, timeZone: 'UTC' },
          location: event.location ? { displayName: event.location } : undefined,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Microsoft Graph API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id;
  }

  throw new Error(`Unknown provider: ${provider}`);
}
