import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email, role, firm_name, invite_link, first_name, last_name } = await req.json()

        const resendApiKey = Deno.env.get('RESEND_API_KEY')

        // If no API key, log simulation and return success (dev mode)
        if (!resendApiKey) {
            console.log(`📧 EMAIL SIMULATION (No RESEND_API_KEY):
    To: ${email}
    Subject: You've been invited to join ${firm_name} on CaseBridge
    Body: ${first_name} ${last_name}, you've been invited as a ${role}. 
    Link: ${invite_link}
    `)
            return new Response(JSON.stringify({ success: true, mode: 'simulation' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // Send actual email via Resend
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">CaseBridge</h1>
                            <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 14px;">Legal Case Management Platform</p>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px; font-weight: 600;">You're Invited!</h2>
                            
                            <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
                                Hi ${first_name || 'there'},
                            </p>
                            
                            <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
                                You've been invited to join <strong style="color: #1e293b;">${firm_name}</strong> on CaseBridge as a <strong style="color: #667eea;">${role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>.
                            </p>
                            
                            <p style="margin: 0 0 30px; color: #475569; font-size: 16px; line-height: 1.6;">
                                Click the button below to accept your invitation and create your account:
                            </p>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 30px;">
                                        <a href="${invite_link}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">Accept Invitation</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 16px; color: #64748b; font-size: 14px; line-height: 1.6;">
                                Or copy and paste this link into your browser:
                            </p>
                            
                            <p style="margin: 0 0 30px; padding: 12px; background-color: #f1f5f9; border-radius: 6px; word-break: break-all;">
                                <a href="${invite_link}" style="color: #667eea; text-decoration: none; font-size: 13px;">${invite_link}</a>
                            </p>
                            
                            <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                                This invitation will expire in 72 hours. If you didn't expect this invitation, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">
                                © ${new Date().getFullYear()} CaseBridge. All rights reserved.
                            </p>
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                Legal Case Management Platform
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
                from: 'CaseBridge <invitations@casebridge.com>',
                to: [email],
                subject: `You've been invited to join ${firm_name} on CaseBridge`,
                html: emailHtml,
            }),
        })

        const data = await res.json()

        if (!res.ok) {
            throw new Error(`Resend API error: ${JSON.stringify(data)}`)
        }

        console.log(`✅ Email sent successfully to ${email} via Resend (ID: ${data.id})`)

        return new Response(JSON.stringify({ success: true, mode: 'live', email_id: data.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('Email sending error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
