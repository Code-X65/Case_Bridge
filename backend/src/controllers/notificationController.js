const { supabase } = require('../config/supabase');

/**
 * Get client notifications (filterable by client_id)
 */
const getNotifications = async (req, res, next) => {
  try {
    const { client_id, limit = 5 } = req.query;

    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (client_id) {
       // Filter by user_id or specific client_id column if it exists
       // We use OR but handle potential column missing error in the query if possible, 
       // but since Supabase JS doesn't support easy column check, we'll try a safer approach.
       query = query.or(`user_id.eq.${client_id},client_id.eq.${client_id}`);
    }

    let { data, error } = await query;

    // Fallback for missing client_id column (PostgreSQL 42703)
    if (error && error.code === '42703' && client_id) {
      console.warn('[notificationController.getNotifications] client_id column missing, falling back to user_id only');
      const fallbackQuery = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', client_id)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));
      
      const fbResult = await fallbackQuery;
      data = fbResult.data;
      error = fbResult.error;
    }

    if (error) {
      console.error('[notificationController.getNotifications] Supabase Error:', error);
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('[notificationController.getNotifications] Catch Error:', error.message);
    next(error);
  }
};

/**
 * Polling endpoint for real-time updates
 */
const pollNotifications = async (req, res, next) => {
  try {
    const { client_id, matter_ids, last_check } = req.query;
    
    // last_check should be a timestamp (ISO string)
    const checkTime = last_check || new Date(Date.now() - 10000).toISOString();

    let results = {
      notifications: [],
      updates: [],
      new_messages_count: 0
    };

    // 1. Check for new notifications
    if (client_id) {
      let { data: notifs, error: notifErr } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${client_id},client_id.eq.${client_id}`)
        .gt('created_at', checkTime);
      
      // Fallback for missing client_id column
      if (notifErr && notifErr.code === '42703') {
        console.warn('[notificationController.pollNotifications] client_id column missing, falling back to user_id only');
        const fallback = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', client_id)
          .gt('created_at', checkTime);
        
        notifs = fallback.data;
        notifErr = fallback.error;
      }

      if (notifErr) {
        console.error('[notificationController.pollNotifications] Notification Error:', notifErr);
      }
      results.notifications = notifs || [];
    }

    // 2. Check for new matter updates (if IDs provided)
    if (matter_ids) {
      const ids = matter_ids.split(',');
      const { data: updates, error: updateErr } = await supabase
        .from('matter_updates')
        .select('*, matter:matter_id(title)')
        .in('matter_id', ids)
        .gt('created_at', checkTime);
      
      if (updateErr) {
        console.error('[notificationController.pollNotifications] Matter Updates Error:', updateErr);
      }
      results.updates = updates || [];
    }

    res.status(200).json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[notificationController.pollNotifications] Catch Error:', error.message);
    next(error);
  }
};

module.exports = {
  getNotifications,
  pollNotifications
};
