const { supabase } = require('../config/supabase');

/**
 * Get signature requests (filterable by client_id and status)
 */
const getSignatureRequests = async (req, res, next) => {
  try {
    const { client_id, status = 'pending' } = req.query;

    let query = supabase
      .from('signature_requests')
      .select('id, message, created_at, status, document:document_id(filename)');

    if (client_id) {
      query = query.eq('client_id', client_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[signatureController.getSignatureRequests] Supabase Error:', error);
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('[signatureController.getSignatureRequests] Catch Error:', error.message);
    next(error);
  }
};

module.exports = {
  getSignatureRequests
};
