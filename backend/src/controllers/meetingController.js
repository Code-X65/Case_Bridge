const { supabase } = require('../config/supabase');

/**
 * Get meetings for a case
 */
const getMeetings = async (req, res, next) => {
  try {
    const { case_id } = req.query;

    if (!case_id) {
      const err = new Error('case_id required');
      err.status = 400;
      throw err;
    }

    const { data, error } = await supabase
      .from('case_meetings')
      .select('*')
      .eq('case_id', case_id)
      .order('proposed_start', { ascending: true });

    if (error) {
      console.error('[meetingController.getMeetings] Supabase Error:', error);
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('[meetingController.getMeetings] Catch Error:', error.message);
    next(error);
  }
};

module.exports = {
  getMeetings
};
