const { supabase } = require('../config/supabase');

/**
 * Get communication logs for a matter
 */
const getCommunications = async (req, res, next) => {
  try {
    const { matter_id } = req.query;

    if (!matter_id) {
      const err = new Error('matter_id required');
      err.status = 400;
      throw err;
    }

    const { data, error } = await supabase
      .from('matter_communications')
      .select('*')
      .eq('matter_id', matter_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[communicationController.getCommunications] Supabase Error:', error);
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('[communicationController.getCommunications] Catch Error:', error.message);
    next(error);
  }
};

module.exports = {
  getCommunications
};
