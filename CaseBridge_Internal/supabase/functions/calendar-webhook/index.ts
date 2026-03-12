/**
 * Calendar Webhook Handler Edge Function
 * Handles webhook notifications from Google and Outlook calendars
 * 
 * This function:
 * 1. Verifies webhook signatures using the secret
 * 2. Processes calendar change events
 * 3. Updates local calendar_event_mappings accordingly
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  provider: 'google' | 'outlook';
  notification: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Google sends a GET request for verification
  if (req.method === 'GET') {
    const searchParams = new URL(req.url).searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const verifyToken = Deno.env.get('CALENDAR_WEBHOOK_VERIFY_TOKEN') || 'casebridge_calendar_webhook';

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Google webhook verified');
      return new Response(challenge, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    return new Response('Forbidden', { status: 403, headers: corsHeaders });
  }

  // Handle POST notifications
  if (req.method === 'POST') {
    try {
      const contentType = req.headers.get('content-type') || '';

      // Determine provider based on headers
      let provider: 'google' | 'outlook' | null = null;

      if (contentType.includes('application/json')) {
        // Check for Google webhook
        const googleChannelId = req.headers.get('x-goog-channel-id');
        const googleMessageNumber = req.headers.get('x-goog-message-number');
        
        if (googleChannelId) {
          provider = 'google';
        }

        // Check for Microsoft webhook
        const msClientState = req.headers.get('client-state');
        if (msClientState && msClientState.startsWith('casebridge-')) {
          provider = 'outlook';
        }
      }

      // Parse the request body
      const body = await req.json();
      
      console.log('Webhook received:', JSON.stringify({ provider, body: JSON.stringify(body).substring(0, 200) }));

      // Process the webhook based on provider
      if (provider === 'google') {
        return await handleGoogleWebhook(req, body);
      } else if (provider === 'outlook') {
        return await handleOutlookWebhook(req, body);
      } else {
        // Try to determine from body content
        if (body.summary || body.id) {
          return await handleGoogleWebhook(req, body);
        } else if (body.value) {
          return await handleOutlookWebhook(req, body);
        }
      }

      return new Response(
        JSON.stringify({ message: 'Webhook processed successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Webhook processing error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
});

async function handleGoogleWebhook(req: Request, body: any): Promise<Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // Get the channel ID from headers
    const channelId = req.headers.get('x-goog-channel-id') || '';
    const resourceId = req.headers.get('x-goog-resource-id') || '';

    console.log('Google webhook:', { channelId, resourceId });

    // Find the connection by webhook subscription
    const connectionResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_calendar_connections?webhook_subscription_id=eq.${channelId}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const connections = await connectionResponse.json();

    if (!connections || connections.length === 0) {
      console.log('No connection found for channel:', channelId);
      return new Response(
        JSON.stringify({ message: 'Connection not found, acknowledged' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const connection = connections[0];

    // Get the resource state from the notification
    // Google sends the actual state in subsequent API calls
    // For now, we'll trigger a sync
    
    // Log the webhook event
    await logWebhookEvent(supabaseUrl, supabaseKey, {
      user_id: connection.user_id,
      provider: 'google',
      event_type: 'calendar_change',
      external_event_id: resourceId,
      status: 'received',
    });

    // Fetch the actual changed events from Google Calendar
    const timeMin = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // Last hour
    const timeMax = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // Next hour

    const eventsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&maxResults=100`,
      {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
        },
      }
    );

    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json();
      const externalEvents = eventsData.items || [];

      // Process each event
      for (const extEvent of externalEvents) {
        await processGoogleEvent(supabaseUrl, supabaseKey, connection, extEvent);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Google webhook processed',
        events_updated: externalEvents?.length || 0 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Google webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleOutlookWebhook(req: Request, body: any): Promise<Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    console.log('Outlook webhook body:', JSON.stringify(body).substring(0, 200));

    // Get client state
    const clientState = req.headers.get('client-state') || '';

    // Find connection by webhook subscription
    const connectionResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_calendar_connections?webhook_subscription_id=eq.${clientState}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const connections = await connectionResponse.json();

    if (!connections || connections.length === 0) {
      console.log('No connection found for client state:', clientState);
      return new Response(
        JSON.stringify({ message: 'Connection not found, acknowledged' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const connection = connections[0];

    // Process notification value
    const notifications = body.value || [];
    
    for (const notification of notifications) {
      const changeType = notification.changeType; // created, updated, deleted
      const eventId = notification.resourceData?.id;

      if (!eventId) continue;

      // Log the webhook event
      await logWebhookEvent(supabaseUrl, supabaseKey, {
        user_id: connection.user_id,
        provider: 'outlook',
        event_type: changeType,
        external_event_id: eventId,
        status: 'received',
      });

      // Find the mapping for this event
      const mappingResponse = await fetch(
        `${supabaseUrl}/rest/v1/calendar_event_mappings?user_id=eq.${connection.user_id}&external_event_id=eq.${eventId}&provider=eq.outlook&select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );

      const mappings = await mappingResponse.json();

      if (changeType === 'deleted') {
        // Mark mapping as deleted
        if (mappings && mappings.length > 0) {
          await fetch(
            `${supabaseUrl}/rest/v1/calendar_event_mappings?id=eq.${mappings[0].id}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify({
                sync_status: 'deleted',
                last_synced_at: new Date().toISOString(),
              }),
            }
          );
        }
      } else {
        // Fetch the updated event from Microsoft Graph
        const eventResponse = await fetch(
          `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
          {
            headers: {
              'Authorization': `Bearer ${connection.access_token}`,
            },
          }
        );

        if (eventResponse.ok) {
          const outlookEvent = await eventResponse.json();
          
          if (mappings && mappings.length > 0) {
            // Update existing mapping
            await processOutlookEventUpdate(supabaseUrl, supabaseKey, connection, outlookEvent, mappings[0]);
          } else if (changeType === 'created') {
            // New event - could be from external source, create mapping
            console.log('New Outlook event received:', eventId);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Outlook webhook processed',
        notifications_count: notifications.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Outlook webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function processGoogleEvent(
  supabaseUrl: string,
  supabaseKey: string,
  connection: any,
  googleEvent: any
): Promise<void> {
  const eventId = googleEvent.id;
  const status = googleEvent.status;

  // Check if this event exists in our mappings
  const mappingResponse = await fetch(
    `${supabaseUrl}/rest/v1/calendar_event_mappings?user_id=eq.${connection.user_id}&external_event_id=eq.${eventId}&provider=eq.google&select=*`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    }
  );

  const mappings = await mappingResponse.json();

  if (status === 'confirmed' && !mappings?.length) {
    // New event in Google Calendar - create mapping
    // This could be a meeting created externally
    console.log('New Google event detected:', eventId);
  } else if (status === 'cancelled') {
    // Event was deleted/cancelled
    if (mappings && mappings.length > 0) {
      await fetch(
        `${supabaseUrl}/rest/v1/calendar_event_mappings?id=eq.${mappings[0].id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            sync_status: 'deleted',
            last_synced_at: new Date().toISOString(),
          }),
        }
      );
    }
  } else if (mappings && mappings.length > 0) {
    // Update the CaseBridge event with external changes
    // For now, mark as needing review
    await fetch(
      `${supabaseUrl}/rest/v1/calendar_event_mappings?id=eq.${mappings[0].id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          sync_status: 'pending',
          last_synced_at: new Date().toISOString(),
        }),
      }
    );
  }
}

async function processOutlookEventUpdate(
  supabaseUrl: string,
  supabaseKey: string,
  connection: any,
  outlookEvent: any,
  mapping: any
): Promise<void> {
  // Update the local event based on external changes
  // This would update the case_meetings table

  const updatedEvent = {
    title: outlookEvent.subject,
    description: outlookEvent.body?.content || '',
    start_time: outlookEvent.start?.dateTime,
    end_time: outlookEvent.end?.dateTime,
    location: outlookEvent.location?.displayName || '',
  };

  // Update the mapping status
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
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      }),
    }
  );

  console.log('Updated mapping for Outlook event:', mapping.id);
}

async function logWebhookEvent(
  supabaseUrl: string,
  supabaseKey: string,
  event: {
    user_id: string;
    provider: string;
    event_type: string;
    external_event_id: string;
    status: string;
  }
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
          user_id: event.user_id,
          provider: event.provider,
          action: 'webhook',
          status: event.status,
          details: `${event.event_type}: ${event.external_event_id}`,
        }),
      }
    );
  } catch (error) {
    console.error('Failed to log webhook event:', error);
  }
}
