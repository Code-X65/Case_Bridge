const { supabase } = require('../config/supabase');
const Handlebars = require('handlebars');
const { Resend } = require('resend');
const admin = require('firebase-admin');

// Initialize Resend (API Key should be in env)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Initialize Firebase (Optional, needs service account JSON)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error('[NotificationService] Failed to init Firebase:', e.message);
    }
}

class NotificationService {
    /**
     * Core delivery engine
     */
    async send({ user_id, category, template_slug, payload }) {
        console.log(`[NotificationService] Processing ${template_slug} for user ${user_id}`);

        try {
            // 1. Fetch User Preferences
            const { data: prefs, error: prefErr } = await supabase
                .from('notification_preferences')
                .select('*')
                .eq('user_id', user_id)
                .eq('category', category)
                .single();

            // Default to enabled if no record exists for in-app/email, disabled for push
            const canSendInApp = prefs ? prefs.in_app_enabled : true;
            const canSendEmail = prefs ? prefs.email_enabled : true;
            const canSendPush = prefs ? prefs.push_enabled : false;

            // 2. Fetch Template
            const { data: template, error: tempErr } = await supabase
                .from('notification_templates')
                .select('*')
                .eq('slug', template_slug)
                .single();

            if (tempErr || !template) {
                console.warn(`[NotificationService] Template ${template_slug} not found, using raw payload.`);
            }

            // 3. Render Content
            let finalTitle = payload.title || 'Notification';
            let finalMessage = payload.message || '';
            let finalSubject = finalTitle;
            let finalBody = finalMessage;

            if (template) {
                const renderSubject = Handlebars.compile(template.subject_template);
                const renderBody = Handlebars.compile(template.body_template);
                
                finalSubject = renderSubject(payload);
                finalBody = renderBody(payload);
                
                // For In-App, we might still want the title/message from payload if not in template
                finalTitle = finalSubject;
                finalMessage = finalBody;
            }

            // 4. Delivery Phase
            const deliveryResults = { in_app: false, email: false, push: false };

            // Channel: In-App
            if (canSendInApp) {
                const { error: insertErr } = await supabase
                    .from('notifications')
                    .insert({
                        user_id,
                        channel: 'in_app',
                        event_type: template_slug || payload.event_type || 'system_alert',
                        category: category,
                        payload: {
                            ...payload,
                            title: finalTitle,
                            message: finalMessage,
                            category
                        },
                        created_at: new Date().toISOString()
                    });
                
                if (!insertErr) deliveryResults.in_app = true;
            }

            // Channel: Email
            if (canSendEmail && resend) {
                // Fetch user email from profiles or auth (assuming profile has it for convenience)
                const { data: profile } = await supabase.from('profiles').select('email').eq('id', user_id).single();
                
                if (profile?.email) {
                    const { error: emailErr } = await resend.emails.send({
                        from: 'CaseBridge <notifications@casebridge.law>',
                        to: profile.email,
                        subject: finalSubject,
                        html: finalBody
                    });
                    if (!emailErr) deliveryResults.email = true;
                }
            }

            // Channel: Push
            if (canSendPush && admin.apps.length > 0) {
                // Fetch push token (assuming user_push_tokens table exists)
                const { data: tokens } = await supabase.from('user_push_tokens').select('token').eq('user_id', user_id);
                
                if (tokens && tokens.length > 0) {
                    const messages = tokens.map(t => ({
                        notification: { title: finalTitle, body: finalMessage },
                        token: t.token,
                        data: { link: payload.link || '' }
                    }));
                    
                    try {
                        await admin.messaging().sendAll(messages);
                        deliveryResults.push = true;
                    } catch (e) {
                        console.error('[NotificationService] Push failed:', e.message);
                    }
                }
            }

            return { success: true, delivery: deliveryResults };

        } catch (error) {
            console.error('[NotificationService] Fatal Error:', error.message);
            throw error;
        }
    }
}

module.exports = new NotificationService();
