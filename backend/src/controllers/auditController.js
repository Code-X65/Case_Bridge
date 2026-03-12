const { supabase } = require('../config/supabase');

/**
 * Get audit logs for a target (filterable by target_id or matter_id in metadata)
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { target_id, matter_id } = req.query;

    let data, error;

    if (target_id) {
      ({ data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('target_id', target_id)
        .order('created_at', { ascending: false }));
    } else if (matter_id) {
      // Fallback: Check if matter_id is in metadata
      ({ data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .contains('metadata', { matter_id })
        .order('created_at', { ascending: false }));
    } else {
      const err = new Error('target_id or matter_id required');
      err.status = 400;
      throw err;
    }

    if (error) {
      console.error('[auditController.getAuditLogs] Supabase Error:', error);
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('[auditController.getAuditLogs] Catch Error:', error.message);
    next(error);
  }
};

module.exports = {
  getAuditLogs
};
