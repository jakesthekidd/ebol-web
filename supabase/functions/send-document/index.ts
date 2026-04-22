import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/**
 * send-document — Supabase Edge Function
 *
 * SEND HOOK (stub)
 * ────────────────
 * When ready to implement:
 *
 * 1. Receive { bolId, method, recipient, message } from client
 * 2. Fetch BOL record + pdf_url from Supabase using service-role client
 * 3. For method === 'email':
 *      POST to SendGrid / Resend / SES:
 *        to: recipient
 *        subject: "Your Bill of Lading — BOL #{bol_number}"
 *        body: message + link to pdf_url
 * 4. For method === 'sms':
 *      POST to Twilio:
 *        to: recipient (E.164 format)
 *        body: "BOL #{bol_number}: " + pdf_url
 * 5. Insert notification record for the shipper
 * 6. Return { success: true }
 *
 * Required secrets (set via `supabase secrets set`):
 *   SENDGRID_API_KEY  (or RESEND_API_KEY)
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM_NUMBER
 *   SUPABASE_SERVICE_ROLE_KEY  (auto-injected)
 *   SUPABASE_URL               (auto-injected)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bolId, method, recipient, message } = await req.json();

    if (!bolId || !method || !recipient) {
      return new Response(
        JSON.stringify({ error: 'bolId, method, and recipient are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (method !== 'email' && method !== 'sms') {
      return new Response(
        JSON.stringify({ error: 'method must be "email" or "sms"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // TODO: Replace stub with real email/SMS delivery (see above)
    const stubResult = {
      success: true,
      stub: true,
      message: 'Send not yet implemented — configure delivery provider secrets to enable.',
      bolId,
      method,
      recipient,
      sentMessage: message ?? null,
    };

    return new Response(JSON.stringify(stubResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
