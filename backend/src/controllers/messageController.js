const { supabase } = require('../config/supabase');

/**
 * Fetch all messages for a specific matter
 */
const getMessages = async (req, res, next) => {
  try {
    const { matterId } = req.params;

    const { data, error } = await supabase
      .from('matter_messages_view')
      .select('*')
      .eq('matter_id', matterId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[messageController.getMessages] Supabase Error:', error);
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('[messageController.getMessages] Catch Error:', error.message);
    next(error);
  }
};

/**
 * Send a new message to a matter
 */
const sendMessage = async (req, res, next) => {
  try {
    const { matterId } = req.params;
    const { content, sender_id, reply_to_id, mentions } = req.body;

    if (!content || !sender_id) {
      const error = new Error('Content and sender_id are required');
      error.status = 400;
      throw error;
    }

    const { data, error } = await supabase
      .from('matter_messages')
      .insert({
        matter_id: matterId,
        sender_id,
        content,
        reply_to_id,
        mentions
      })
      .select()
      .single();

    if (error) {
      console.error('[messageController.sendMessage] Supabase Error:', error);
      throw error;
    }

    res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[messageController.sendMessage] Catch Error:', error.message);
    next(error);
  }
};

/**
 * Mark messages as read for a matter
 */
const markAsRead = async (req, res, next) => {
  try {
    const { matterId } = req.params;

    const { data, error } = await supabase.rpc('mark_matter_messages_read', {
      p_matter_id: matterId
    });

    if (error) {
      console.error('[messageController.markAsRead] Supabase Error:', error);
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('[messageController.markAsRead] Catch Error:', error.message);
    next(error);
  }
};

/**
 * Get unread message count for a matter
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const { matterId } = req.params;

    const { data, error } = await supabase.rpc('get_unread_chat_count', {
      p_matter_id: matterId
    });

    if (error) {
      console.error('[messageController.getUnreadCount] Supabase Error:', error);
      throw error;
    }

    res.status(200).json({
      success: true,
      count: data || 0
    });
  } catch (error) {
    console.error('[messageController.getUnreadCount] Catch Error:', error.message);
    next(error);
  }
};

module.exports = {
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount
};
