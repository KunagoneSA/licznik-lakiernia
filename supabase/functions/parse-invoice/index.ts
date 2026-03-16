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
    const { pdf_base64 } = await req.json()

    if (!pdf_base64) {
      return new Response(JSON.stringify({ error: 'Brak pliku PDF' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: pdf_base64,
                },
              },
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
      "product": "nazwa produktu",
      "quantity": 5,
      "unit": "kg",
      "unit_price": 22.00,
      "color": "RAL9016 lub opis koloru jeśli jest, inaczej pusty string"
    }
  ]
}

Zasady:
- unit: "kg", "l" lub "szt"
- unit_price: cena jednostkowa netto
- quantity: ilość
- Jeśli nie ma koloru w pozycji, color = ""
- date: data wystawienia dokumentu
- Zwróć CZYSTY JSON, bez backticks, bez markdown`
              }
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return new Response(JSON.stringify({ error: `Claude API error: ${errText}` }), {
        status: 500,
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
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
