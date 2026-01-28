import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { email, role, firm_name, invite_link } = await req.json()

        // GOVERNANCE: In a real "Live" app, you would integrate SendGrid, Postmark, or Resend here.
        console.log(`LIVE EMAIL SIMULATION:
    To: ${email}
    Subject: You've been invited to join ${firm_name} on CaseBridge
    Body: You've been invited as a ${role}. Click here: ${invite_link}
    `)

        /* 
        EXAMPLE RESEND INTEGRATION:
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          },
          body: JSON.stringify({
            from: 'CaseBridge <notifications@casebridge.com>',
            to: [email],
            subject: `Invite: Join ${firm_name} on CaseBridge`,
            html: `<strong>Welcome!</strong><p>Join ${firm_name} as ${role}.</p><a href="${invite_link}">Accept Invite</a>`,
          }),
        });
        */

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
