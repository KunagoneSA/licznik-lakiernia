import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'Brak klucza API Anthropic' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { pdf_base64, image_base64, media_type } = await req.json()

    if (!pdf_base64 && !image_base64) {
      return new Response(JSON.stringify({ error: 'Brak pliku' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const isPdf = !!pdf_base64
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    }
    if (isPdf) {
      headers['anthropic-beta'] = 'pdfs-2024-09-25'
    }

    const fileContent = isPdf
      ? {
          type: 'document' as const,
          source: { type: 'base64', media_type: 'application/pdf', data: pdf_base64 },
        }
      : {
          type: 'image' as const,
          source: { type: 'base64', media_type: media_type || 'image/jpeg', data: image_base64 },
        }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              fileContent,
              {
                type: 'text',
                text: `Przeanalizuj tę fakturę/WZ i wyciągnij pozycje zakupowe.

Zwróć TYLKO JSON (bez markdown, bez komentarzy) w formacie:
{
  "supplier": "nazwa dostawcy z faktury",
  "date": "YYYY-MM-DD",
  "invoice_number": "numer faktury/WZ",
  "items": [
    {
      "product": "czysta nazwa produktu BEZ koloru",
      "quantity": 5,
      "unit": "kg",
      "unit_price": 22.00,
      "color": "kod koloru wyciągnięty z nazwy"
    }
  ]
}

Zasady:
- unit: "kg", "l", "szt" lub "opak"
- unit_price: ZAWSZE cena jednostkowa NETTO (bez VAT). Nigdy nie podawaj ceny brutto.
- quantity: ilość
- date: data wystawienia dokumentu
- WAŻNE — kolory: Dostawcy często wstawiają kolor w kod/nazwę produktu, np.:
  "OPV256BVG10/S1002-Y50R" → product: "Emalia poliuretanowa OPV256BVG10", color: "S1002-Y50R"
  "OPV256BVG10/R9016" → product: "Emalia poliuretanowa OPV256BVG10", color: "RAL9016"
  "OCV826G20/NERO" → product: "Emalia poliakrylowa OCV826G20", color: "NERO"
  "IMV1000/ IMC NERO" → product: "Impregnat wodny zewnętrzny IMV1000", color: "NERO"
  Jeśli kod po "/" to kolor (RAL, NCS, NERO, nazwa koloru), wyciągnij go do color a z product usuń
  Kody zaczynające się od R + 4 cyfry to RAL, np. R9016 → RAL9016
  Kody /P oznaczają "bezbarwny" — nie kolor, zostaw color = ""
- product: czytelna nazwa po polsku, np. "Emalia poliuretanowa", "Utwardzacz do połysków", "Lakier poliakrylowy bezbarwny". Dodaj kod katalogowy producenta (np. OPV256BVG10, C340V). NIE wstawiaj koloru do nazwy produktu.
- Jeśli nie ma koloru w pozycji, color = ""
- Zwróć CZYSTY JSON, bez backticks, bez markdown`
              }
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return new Response(JSON.stringify({ error: `Claude API error (${response.status}): ${errText}` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await response.json()
    const text = result.content?.[0]?.text ?? ''

    // Parse the JSON from Claude's response
    let parsed
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      parsed = JSON.parse(jsonMatch ? jsonMatch[1].trim() : text.trim())
    } catch {
      return new Response(JSON.stringify({ error: 'Nie udało się sparsować odpowiedzi', raw: text }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
