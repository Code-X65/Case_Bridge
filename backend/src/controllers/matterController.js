const { supabase } = require('../config/supabase');

/**
 * Get all matters (filterable by client_id or firm_id)
 */
const getMatters = async (req, res, next) => {
  try {
    const { client_id, assigned_associate, firm_id } = req.query;

    let query = supabase
      .from('matters')
      .select(`
        *,
        assignee:assigned_associate ( id, full_name, email ),
        case_manager:assigned_case_manager ( id, full_name ),
        client:client_id ( id, first_name, last_name, email, phone )
      `);

    if (client_id) query = query.eq('client_id', client_id);
    if (assigned_associate) query = query.eq('assigned_associate', assigned_associate);
    if (firm_id) query = query.eq('firm_id', firm_id);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[matterController.getMatters] Supabase Error:', error);
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('[matterController.getMatters] Catch Error:', error.message);
    next(error);
  }
};

/**
 * Get a single matter by ID with detailed joins
 */
const getMatterById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('matters')
      .select(`
        *,
        case_report:case_report_id ( * ),
        assignee:assigned_associate ( id, full_name, email ),
        case_manager:assigned_case_manager ( id, full_name ),
        client:client_id ( id, first_name, last_name, email, phone )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[matterController.getMatterById] Supabase Error:', error);
      throw error;
    }
    if (!data) {
      const err = new Error('Matter not found');
      err.status = 404;
      throw err;
    }

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[matterController.getMatterById] Catch Error:', error.message);
    next(error);
  }
};

/**
 * Update a matter
 */
const updateMatter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('matters')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get progress updates for a matter
 */
const getMatterUpdates = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('matter_updates')
      .select(`
        *,
        docs:report_documents(
          document:document_id (
            id,
            filename,
            file_url,
            uploaded_at,
            uploaded_by_role
          ),
          client_visible
        )
      `)
      .eq('matter_id', id)
      .eq('client_visible', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all documents associated with a matter (Vault)
 */
const getMatterDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Fetch from Matter Updates (joined via report_documents)
    // We fetch matter_updates first because we know it has matter_id
    const { data: updatesWithDocs, error: updateErr } = await supabase
      .from('matter_updates')
      .select(`
        id,
        report_documents (
          client_visible,
          document:document_id ( * )
        )
      `)
      .eq('matter_id', id)
      .eq('client_visible', true);

    if (updateErr) throw updateErr;

    // Flatten the documents from updates
    const updateDocs = (updatesWithDocs || []).flatMap(update => 
      (update.report_documents || [])
        .filter(rd => rd.client_visible)
        .map(rd => ({
          ...rd,
          source: 'Progress Update'
        }))
    );

    // 2. Fetch from Matter itself (Initial Case Report)
    const { data: matter, error: matterErr } = await supabase
      .from('matters')
      .select('case_report_id')
      .eq('id', id)
      .maybeSingle();
    
    if (matterErr) {
      console.error('[matterController.getMatterDocuments] Matter Fetch Error:', matterErr);
      throw matterErr;
    }

    let initialDocs = [];
    if (matter?.case_report_id) {
       // Note: case_report_documents schema uses file_name, file_path instead of document junction in some versions
       const { data: reportDocs, error: reportErr } = await supabase
        .from('case_report_documents')
        .select('*')
        .eq('case_report_id', matter.case_report_id);
       
       if (reportErr) {
         console.error('[matterController.getMatterDocuments] Case Report Docs Fetch Error:', reportErr);
         throw reportErr;
       }
       
       initialDocs = (reportDocs || []).map(d => ({ 
         id: d.id,
         document: {
           id: d.id,
           filename: d.file_name || d.filename,
           file_url: d.file_path || d.file_url,
           uploaded_at: d.uploaded_at
         },
         client_visible: true, 
         source: 'Initial Report' 
       }));
    }

    // 3. Fetch Signed Shared Documents (Signature Requests)
    const { data: sigDocs, error: sigErr } = await supabase
      .from('signature_requests')
      .select(`
        status,
        signed_at,
        document:document_id ( * )
      `)
      .eq('matter_id', id)
      .eq('status', 'signed');

    if (sigErr) {
      console.error('[matterController.getMatterDocuments] Signature Requests Fetch Error:', sigErr);
      throw sigErr;
    }

    const allDocs = [
      ...initialDocs,
      ...(updateDocs || []).map(d => ({ ...d, source: 'Progress Update' })),
      ...(sigDocs || []).map(d => ({ ...d, client_visible: true, source: 'Signed Document' }))
    ];

    res.status(200).json({
      success: true,
      data: allDocs
    });
  } catch (error) {
    console.error('[matterController.getMatterDocuments] Catch Error:', error.message);
    next(error);
  }
};

/**
 * Get unified history of a matter
 */
const getMatterHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Fetch Matter Updates
    const { data: updates, error: updateErr } = await supabase
      .from('matter_updates')
      .select('*')
      .eq('matter_id', id)
      .eq('client_visible', true);

    if (updateErr) throw updateErr;

    // 2. Fetch Audit Logs
    const { data: audits, error: auditErr } = await supabase
      .from('audit_logs')
      .select('*')
      .or(`target_id.eq.${id},metadata->>matter_id.eq.${id}`);

    if (auditErr) throw auditErr;

    // 3. Fetch Signature Events
    const { data: signatures, error: sigErr } = await supabase
      .from('signature_requests')
      .select('*, document:document_id(filename)')
      .eq('matter_id', id);

    if (sigErr) throw sigErr;

    // Combine and Sort
    const history = [
      ...(updates || []).map(u => ({ ...u, type: 'update', event: 'Progress Report Published' })),
      ...(audits || []).map(a => ({ ...a, type: 'audit', event: a.action })),
      ...(signatures || []).map(s => ([
        { ...s, type: 'signature_requested', event: `Signature Requested: ${s.document?.filename || 'Document'}`, created_at: s.created_at },
        s.status === 'signed' ? { ...s, type: 'signature_completed', event: `Document Signed: ${s.document?.filename || 'Document'}`, created_at: s.signed_at } : null
      ])).flat().filter(Boolean)
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMatters,
  getMatterById,
  updateMatter,
  getMatterUpdates,
  getMatterDocuments,
  getMatterHistory
};
