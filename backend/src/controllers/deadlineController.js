const { supabase } = require('../config/supabase');

/**
 * Get deadlines for a matter
 */
const getDeadlines = async (req, res, next) => {
  try {
    const { matter_id } = req.query;

    if (!matter_id) {
      const err = new Error('matter_id required');
      err.status = 400;
      throw err;
    }

    const { data, error } = await supabase
      .from('matter_deadlines')
      .select('*')
      .eq('matter_id', matter_id)
      .order('deadline_date', { ascending: true });

    if (error) {
      console.error('[deadlineController.getDeadlines] Supabase Error:', error);
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('[deadlineController.getDeadlines] Catch Error:', error.message);
    next(error);
  }
};

module.exports = {
  getDeadlines
};
