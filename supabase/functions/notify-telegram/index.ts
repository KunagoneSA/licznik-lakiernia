import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { text, photo_url } = await req.json()
    if (!text && !photo_url) {
      return new Response(JSON.stringify({ error: 'Missing text or photo_url' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!BOT_TOKEN || !CHAT_ID) {
      return new Response(JSON.stringify({ error: 'Bot not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const tgUrl = photo_url
      ? `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`
      : `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`

    const tgBody = photo_url
      ? { chat_id: CHAT_ID, photo: photo_url, caption: text, parse_mode: 'HTML' }
      : { chat_id: CHAT_ID, text, parse_mode: 'HTML' }

    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tgBody),
    })
    const tgData = await tgRes.json()
    if (!tgData.ok) {
      return new Response(JSON.stringify({ error: 'Telegram error', details: tgData }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
