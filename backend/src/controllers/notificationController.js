const { supabase } = require('../config/supabase');
const notificationService = require('../services/NotificationService');

/**
 * Get client notifications (filterable by client_id)
 */
const getNotifications = async (req, res, next) => {
  try {
    const { client_id, limit = 5 } = req.query;

    let query = supabase
      .from('notifications')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (client_id) {
       query = query.or(`user_id.eq.${client_id},client_id.eq.${client_id}`);
    }

    let { data, error } = await query;

    if (error && error.code === '42703' && client_id) {
       const fallbackQuery = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', client_id)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));
      
      const fbResult = await fallbackQuery;
      data = fbResult.data;
      error = fbResult.error;
    }

    if (error) throw error;

    res.status(200).json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
};

/**
 * Polling endpoint
 */
const pollNotifications = async (req, res, next) => {
  try {
    const { client_id, matter_ids, last_check } = req.query;
    const checkTime = last_check || new Date(Date.now() - 10000).toISOString();

    let results = { notifications: [], updates: [], new_messages_count: 0 };

    if (client_id) {
      let { data: notifs, error } = await supabase
        .from('notifications')
        .select('*')
        .is('archived_at', null)
        .or(`user_id.eq.${client_id},client_id.eq.${client_id}`)
        .gt('created_at', checkTime);
      
      if (error && error.code === '42703') {
        const fallback = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', client_id)
          .is('archived_at', null)
          .gt('created_at', checkTime);
        notifs = fallback.data;
      }
      results.notifications = notifs || [];
    }

    if (matter_ids) {
      const ids = matter_ids.split(',');
      const { data: updates } = await supabase
        .from('matter_updates')
        .select('*, matter:matter_id(title)')
        .in('matter_id', ids)
        .gt('created_at', checkTime);
      results.updates = updates || [];
    }

    res.status(200).json({ success: true, data: results, timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
};

/**
 * Preferences Management
 */
const getPreferences = async (req, res, next) => {
    try {
        const { user_id } = req.query; // In real app, from auth token
        const { data, error } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', user_id);
        
        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

const updatePreferences = async (req, res, next) => {
    try {
        const { user_id, category, email_enabled, push_enabled, in_app_enabled } = req.body;
        const { data, error } = await supabase
            .from('notification_preferences')
            .upsert({ user_id, category, email_enabled, push_enabled, in_app_enabled, updated_at: new Date().toISOString() }, { onConflict: 'user_id, category' });
        
        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

/**
 * Delivery Endpoints
 */
const sendNotification = async (req, res, next) => {
    try {
        const result = await notificationService.send(req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const sendTestNotification = async (req, res, next) => {
    try {
        const { user_id } = req.body;
        const result = await notificationService.send({
            user_id,
            category: 'system',
            template_slug: 'system_security_alert_v1', // Should be seeded
            payload: {
                title: 'Institutional Test Sync',
                message: 'This is an authorized test of the CaseBridge multi-channel delivery engine.',
                full_name: 'Authorized Personnel'
            }
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

module.exports = {
  getNotifications,
  pollNotifications,
  getPreferences,
  updatePreferences,
  sendNotification,
  sendTestNotification
};
