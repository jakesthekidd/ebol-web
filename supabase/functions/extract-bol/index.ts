import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/**
 * extract-bol — Supabase Edge Function
 *
 * AI EXTRACTION HOOK (stub)
 * ─────────────────────────
 * When ready to implement:
 *
 * 1. Receive { filePath, shipmentId } from the client
 * 2. Download the file from Supabase Storage using the service-role client
 * 3. Convert PDF pages to images (base64) — client can pre-convert with PDF.js,
 *    or use a Deno-compatible PDF lib here
 * 4. Send page images to OpenAI vision:
 *      POST https://api.openai.com/v1/chat/completions
 *      model: gpt-4o
 *      content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,...' } }]
 *      prompt: "Extract BOL fields: shipment ID, BOL numbers, stop addresses,
 *               consignee names. Return structured JSON."
 * 5. Parse the response into { fields, detectedStops[] }
 * 6. UPDATE bols SET raw_extraction = <raw>, parsed_extraction = <parsed>
 *    WHERE shipment_id = shipmentId
 * 7. Return { success: true, detectedStops }
 *
 * Required secrets (set via `supabase secrets set`):
 *   OPENAI_API_KEY
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
    const { filePath, shipmentId } = await req.json();

    if (!filePath || !shipmentId) {
      return new Response(
        JSON.stringify({ error: 'filePath and shipmentId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // TODO: Replace stub with real OpenAI extraction (see above)
    const stubResult = {
      success: true,
      stub: true,
      message: 'Extraction not yet implemented — configure OPENAI_API_KEY to enable.',
      filePath,
      shipmentId,
      raw_extraction: null,
      parsed_extraction: null,
      detected_stops: [],
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
