const { supabase } = require('../config/supabase');

/**
 * Get all case reports (filterable by client_id)
 */
const getReports = async (req, res, next) => {
  try {
    const { client_id } = req.query;

    let query = supabase
      .from('case_reports')
      .select('id, title, status, created_at')
      .order('created_at', { ascending: false });

    if (client_id) {
      query = query.eq('client_id', client_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[reportController.getReports] Supabase Error:', error);
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('[reportController.getReports] Catch Error:', error.message);
    next(error);
  }
};

/**
 * Get documents for a specific report
 */
const getReportDocuments = async (req, res, next) => {
  try {
    const { report_id } = req.query;

    if (!report_id) {
      const err = new Error('report_id required');
      err.status = 400;
      throw err;
    }

    const { data, error } = await supabase
      .from('case_report_documents')
      .select('*')
      .eq('case_report_id', report_id);

    if (error) {
      console.error('[reportController.getReportDocuments] Supabase Error:', error);
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('[reportController.getReportDocuments] Catch Error:', error.message);
    next(error);
  }
};

module.exports = {
  getReports,
  getReportDocuments
};
