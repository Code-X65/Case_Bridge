const { supabase } = require('../config/supabase');
const { GoogleCalendarService } = require('../services/googleCalendar');
const { OutlookCalendarService } = require('../services/outlookCalendar');

/**
 * Get all events for a firm (Admin/CM access)
 */
const getFirmCalendar = async (req, res, next) => {
  try {
    const { firm_id } = req.query;
    if (!firm_id) {
      const err = new Error('firm_id required');
      err.status = 400;
      throw err;
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        matter:matters(title),
        location:firm_locations(name),
        participants:calendar_participants(user_id, attendance_status)
      `)
      .eq('firm_id', firm_id)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('[calendarController.getFirmCalendar] Supabase Error:', error);
      throw error;
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[calendarController.getFirmCalendar] Catch Error:', error.message);
    next(error);
  }
};

/**
 * Get events for the authenticated staff member
 */
const getStaffCalendar = async (req, res, next) => {
  try {
    const { user_id } = req.query; // In production this would come from auth context
    if (!user_id) {
      const err = new Error('user_id required');
      err.status = 400;
      throw err;
    }

    const { data, error } = await supabase
      .from('calendar_participants')
      .select(`
        event:calendar_events(
          *,
          matter:matters(title),
          location:firm_locations(name)
        )
      `)
      .eq('user_id', user_id);

    if (error) {
      console.error('[calendarController.getStaffCalendar] Supabase Error:', error);
      throw error;
    }

    // Flatten the result
    const events = data.map(d => d.event).filter(Boolean);

    res.status(200).json({ success: true, data: events });
  } catch (error) {
    console.error('[calendarController.getStaffCalendar] Catch Error:', error.message);
    next(error);
  }
};

/**
 * Create a new calendar event
 */
const createEvent = async (req, res, next) => {
  try {
    const { 
      firm_id, matter_id, created_by, title, description, 
      event_type, meeting_type, start_time, end_time, 
      location_id, virtual_link, participant_ids 
    } = req.body;

    // 1. Create the event
    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .insert({
        firm_id, matter_id, created_by, title, description,
        event_type, meeting_type, start_time, end_time,
        location_id, virtual_link
      })
      .select()
      .single();

    if (eventError) {
      console.error('[calendarController.createEvent] Create Event Error:', eventError);
      throw eventError;
    }

    // 2. Add participants if provided
    if (participant_ids && participant_ids.length > 0) {
      const participants = participant_ids.map(uid => ({
        event_id: event.id,
        user_id: uid,
        role: uid === created_by ? 'organizer' : 'attendee',
        attendance_status: uid === created_by ? 'accepted' : 'pending'
      }));

      const { error: partError } = await supabase
        .from('calendar_participants')
        .insert(participants);

      if (partError) {
        console.error('[calendarController.createEvent] Add Participants Error:', partError);
        throw partError;
      }
    }

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error('[calendarController.createEvent] Catch Error:', error.message);
    next(error);
  }
};

/**
 * Update an existing event
 */
const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('calendar_events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[calendarController.updateEvent] Supabase Error:', error);
      throw error;
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[calendarController.updateEvent] Catch Error:', error.message);
    next(error);
  }
};

/**
 * Delete an event
 */
const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[calendarController.deleteEvent] Supabase Error:', error);
      throw error;
    }

    res.status(200).json({ success: true, message: 'Event deleted' });
  } catch (error) {
    console.error('[calendarController.deleteEvent] Catch Error:', error.message);
    next(error);
  }
};

/**
 * Check for scheduling conflicts
 */
const checkConflicts = async (req, res, next) => {
  try {
    const { start_time, end_time, location_id, user_ids } = req.body;

    const results = {
      room_conflict: false,
      user_conflicts: []
    };

    // 1. Check Room
    if (location_id) {
      const { data: roomEvents, error: roomError } = await supabase
        .from('calendar_events')
        .select('id, title')
        .eq('location_id', location_id)
        .eq('status', 'confirmed')
        .filter('start_time', 'lt', end_time)
        .filter('end_time', 'gt', start_time);

      if (roomError) {
        console.error('[calendarController.checkConflicts] Room Error:', roomError);
        throw roomError;
      }
      results.room_conflict = roomEvents.length > 0;
    }

    // 2. Check Users (simple overlap for now)
    if (user_ids && user_ids.length > 0) {
      const { data: userEvents, error: userError } = await supabase
        .from('calendar_participants')
        .select(`
          user_id,
          event:calendar_events(title, start_time, end_time)
        `)
        .in('user_id', user_ids)
        .filter('event.start_time', 'lt', end_time)
        .filter('event.end_time', 'gt', start_time);

      if (userError) {
        console.error('[calendarController.checkConflicts] User Error:', userError);
        throw userError;
      }
      results.user_conflicts = userEvents.map(u => u.user_id);
    }

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error('[calendarController.checkConflicts] Catch Error:', error.message);
    next(error);
  }
};

/**
 * Get sync status for a user's calendar connection
 */
const getSyncStatus = async (req, res, next) => {
  try {
    const { user_id, provider } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Get calendar connections
    const { data: connections, error } = await supabase
      .from('user_calendar_connections')
      .select('*')
      .eq('user_id', user_id);

    if (error) throw error;

    if (!connections || connections.length === 0) {
      return res.status(200).json({ 
        success: true, 
        connected: false,
        message: 'No calendar connections found'
      });
    }

    // Filter by provider if specified
    const filteredConnections = provider 
      ? connections.filter(c => c.provider === provider)
      : connections;

    const status = filteredConnections.map(conn => ({
      provider: conn.provider,
      connected: true,
      sync_enabled: conn.sync_enabled,
      last_sync_at: conn.last_sync_at,
      expires_at: conn.expires_at,
      email: conn.provider_email,
      calendar_name: conn.calendar_name,
      sync_direction: conn.sync_direction
    }));

    res.status(200).json({ 
      success: true, 
      connected: true,
      connections: status
    });
  } catch (error) {
    console.error('[calendarController.getSyncStatus] Catch Error:', error.message);
    next(error);
  }
};

/**
 * Fetch events from external calendar
 */
const getExternalEvents = async (req, res, next) => {
  try {
    const { user_id, provider, start_time, end_time } = req.query;

    if (!user_id || !provider) {
      return res.status(400).json({ error: 'user_id and provider are required' });
    }

    if (!start_time || !end_time) {
      return res.status(400).json({ error: 'start_time and end_time are required' });
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

    let externalEvents = [];

    if (provider === 'google') {
      const googleService = new GoogleCalendarService(tokens);
      
      // Refresh token if expired
      if (new Date(connection.expires_at) < new Date()) {
        tokens = await googleService.refreshToken();
        await supabase
          .from('user_calendar_connections')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: new Date(tokens.expires_at).toISOString()
          })
          .eq('id', connection.id);
      }

      externalEvents = await googleService.getEvents(start_time, end_time);
      
      // Transform to consistent format
      externalEvents = externalEvents.map(event => ({
        external_id: event.id,
        title: event.summary,
        description: event.description,
        start_time: event.start?.dateTime || event.start?.date,
        end_time: event.end?.dateTime || event.end?.date,
        location: event.location,
        provider: 'google'
      }));

    } else if (provider === 'outlook') {
      const outlookService = new OutlookCalendarService(tokens);

      // Refresh token if expired
      if (new Date(connection.expires_at) < new Date()) {
        tokens = await outlookService.refreshToken();
        await supabase
          .from('user_calendar_connections')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: new Date(tokens.expires_at).toISOString()
          })
          .eq('id', connection.id);
      }

      externalEvents = await outlookService.getEvents(start_time, end_time);

      // Transform to consistent format
      externalEvents = externalEvents.map(event => ({
        external_id: event.id,
        title: event.subject,
        description: event.body?.content,
        start_time: event.start?.dateTime,
        end_time: event.end?.dateTime,
        location: event.location?.displayName,
        provider: 'outlook'
      }));
    }

    res.status(200).json({ 
      success: true, 
      count: externalEvents.length,
      events: externalEvents
    });
  } catch (error) {
    console.error('[calendarController.getExternalEvents] Catch Error:', error.message);
    next(error);
  }
};

/**
 * Push event to external calendar
 */
const pushEventToExternal = async (req, res, next) => {
  try {
    const { 
      user_id, 
      provider, 
      event_id,
      title, 
      description, 
      start_time, 
      end_time, 
      location,
      attendees,
      calendar_id 
    } = req.body;

    if (!user_id || !provider) {
      return res.status(400).json({ error: 'user_id and provider are required' });
    }

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'title, start_time, and end_time are required' });
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

    let externalEvent;

    const eventData = {
      title,
      description,
      start_time,
      end_time,
      location,
      attendees,
      calendar_id
    };

    if (provider === 'google') {
      const googleService = new GoogleCalendarService(tokens);
      
      // Refresh token if expired
      if (new Date(connection.expires_at) < new Date()) {
        tokens = await googleService.refreshToken();
        await supabase
          .from('user_calendar_connections')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: new Date(tokens.expires_at).toISOString()
          })
          .eq('id', connection.id);
      }

      if (event_id) {
        // Update existing event
        externalEvent = await googleService.updateEvent(event_id, eventData, calendar_id || 'primary');
      } else {
        // Create new event
        externalEvent = await googleService.createEvent(eventData);
      }

    } else if (provider === 'outlook') {
      const outlookService = new OutlookCalendarService(tokens);

      // Refresh token if expired
      if (new Date(connection.expires_at) < new Date()) {
        tokens = await outlookService.refreshToken();
        await supabase
          .from('user_calendar_connections')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: new Date(tokens.expires_at).toISOString()
          })
          .eq('id', connection.id);
      }

      if (event_id) {
        // Update existing event
        externalEvent = await outlookService.updateEvent(event_id, eventData);
      } else {
        // Create new event
        externalEvent = await outlookService.createEvent(eventData);
      }
    }

    // If event_id provided, map the events
    if (event_id) {
      // Update the mapping
      await supabase
        .from('calendar_event_mappings')
        .update({
          external_event_id: externalEvent.id,
          updated_at: new Date().toISOString()
        })
        .eq('local_event_id', event_id)
        .eq('provider', provider);
    } else if (event_id) {
      // Create mapping for new event pushed to external
      await supabase
        .from('calendar_event_mappings')
        .insert({
          local_event_id: event_id,
          external_event_id: externalEvent.id,
          provider,
          user_id,
          direction: 'outbound'
        });
    }

    res.status(200).json({ 
      success: true, 
      message: `Event ${event_id ? 'updated' : 'created'} in ${provider} calendar`,
      external_event_id: externalEvent.id
    });
  } catch (error) {
    console.error('[calendarController.pushEventToExternal] Catch Error:', error.message);
    next(error);
  }
};

module.exports = {
  getFirmCalendar,
  getStaffCalendar,
  createEvent,
  updateEvent,
  deleteEvent,
  checkConflicts,
  getExternalEvents,
  pushEventToExternal,
  getSyncStatus
};
