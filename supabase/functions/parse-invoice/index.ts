import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function buildPrompt(existingSuppliers: string[], existingProducts: string[]) {
  let supplierRule = ''
  if (existingSuppliers.length > 0) {
    supplierRule = `\n- DOSTAWCA — w bazie istnieją już dostawcy: [${existingSuppliers.map(s => `"${s}"`).join(', ')}]. Jeśli dostawca z faktury pasuje do któregoś z listy (ta sama firma, nawet jeśli inna forma prawna np. "Sp. z o.o." vs ""), UŻYJ DOKŁADNIE nazwy z listy. Jeśli żaden nie pasuje — wpisz nazwę z faktury.`
  }
  let productRule = ''
  if (existingProducts.length > 0) {
    productRule = `\n- PRODUKTY — w bazie istnieją już produkty: [${existingProducts.map(p => `"${p}"`).join(', ')}]. Jeśli produkt z faktury pasuje do któregoś z listy (ten sam produkt/kod katalogowy), UŻYJ DOKŁADNIE nazwy z listy. Jeśli żaden nie pasuje — wpisz nową nazwę.`
  }
  return `Przeanalizuj tę fakturę/WZ i wyciągnij pozycje zakupowe.

Zwróć TYLKO JSON (bez markdown, bez komentarzy) w formacie:
{
  "supplier": "nazwa dostawcy — DOKŁADNIE z listy istniejących jeśli pasuje",
  "date": "YYYY-MM-DD",
  "invoice_number": "numer faktury/WZ",
  "total_netto": 722.85,
  "items": [
    {
      "product": "czysta nazwa produktu BEZ koloru",
      "quantity": 2.5,
      "unit": "kg",
      "unit_price": 22.00,
      "value_netto": 55.00,
      "color": "kod koloru wyciągnięty z nazwy"
    }
  ]
}

Zasady:
- unit: "kg", "l", "szt" lub "opak"
- unit_price: ZAWSZE cena jednostkowa NETTO (bez VAT). Nigdy nie podawaj ceny brutto.
- quantity: ilość — UWAGA na liczby z przecinkiem! np. "2,5" to 2.5, "0,3" to 0.3. W JSON użyj kropki.
- value_netto: wartość netto pozycji — przepisz DOKŁADNIE z kolumny "Wartość netto" z dokumentu
- total_netto: łączna wartość netto z dokumentu (pole "Razem netto" / "Netto" z podsumowania)
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
- Jeśli nie ma koloru w pozycji, color = ""${supplierRule}${productRule}
- Zwróć CZYSTY JSON, bez backticks, bez markdown`
}

function parseJson(text: string) {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  return JSON.parse(jsonMatch ? jsonMatch[1].trim() : text.trim())
}

function validateInvoice(parsed: any): { valid: boolean; computedTotal: number; expectedTotal: number; errors: string[] } {
  const errors: string[] = []
  const expectedTotal = Number(parsed.total_netto) || 0
  let computedTotal = 0

  if (!parsed.items || !Array.isArray(parsed.items)) {
    return { valid: false, computedTotal: 0, expectedTotal, errors: ['Brak pozycji'] }
  }

  for (let i = 0; i < parsed.items.length; i++) {
    const item = parsed.items[i]
    const qty = Number(item.quantity) || 0
    const price = Number(item.unit_price) || 0
    const lineTotal = Math.round(qty * price * 100) / 100
    const valueNetto = Number(item.value_netto) || 0
    computedTotal += valueNetto > 0 ? valueNetto : lineTotal

    // Jeśli quantity*price nie zgadza się z value_netto — problem z quantity
    if (valueNetto > 0 && Math.abs(lineTotal - valueNetto) > 0.5) {
      errors.push(`Pozycja ${i + 1} "${item.product}": quantity(${qty}) * unit_price(${price}) = ${lineTotal}, ale value_netto = ${valueNetto}`)
    }
  }

  computedTotal = Math.round(computedTotal * 100) / 100

  if (expectedTotal > 0 && Math.abs(computedTotal - expectedTotal) > 0.5) {
    errors.push(`Suma pozycji (${computedTotal}) ≠ total_netto z dokumentu (${expectedTotal})`)
  }

  return { valid: errors.length === 0, computedTotal, expectedTotal, errors }
}

async function callClaude(headers: Record<string, string>, messages: any[]) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Claude API error (${response.status}): ${errText}`)
  }

  const result = await response.json()
  return result.content?.[0]?.text ?? ''
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
    const { pdf_base64, image_base64, media_type, existing_suppliers, existing_products } = await req.json()

    if (!pdf_base64 && !image_base64) {
      return new Response(JSON.stringify({ error: 'Brak pliku' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const isPdf = !!pdf_base64
    const apiHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    }
    if (isPdf) {
      apiHeaders['anthropic-beta'] = 'pdfs-2024-09-25'
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

    // === KROK 1: Parsowanie faktury ===
    const prompt = buildPrompt(existing_suppliers ?? [], existing_products ?? [])
    const messages: any[] = [
      {
        role: 'user',
        content: [fileContent, { type: 'text', text: prompt }],
      },
    ]

    const text1 = await callClaude(apiHeaders, messages)
    let parsed
    try {
      parsed = parseJson(text1)
    } catch {
      return new Response(JSON.stringify({ error: 'Nie udało się sparsować odpowiedzi', raw: text1 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === KROK 2: Walidacja — jeśli sumy się nie zgadzają, popraw automatycznie ===
    const validation = validateInvoice(parsed)

    if (!validation.valid) {
      // Wyślij poprawkę — daj Claude oryginalną odpowiedź + błędy i każ poprawić
      messages.push(
        { role: 'assistant', content: text1 },
        {
          role: 'user',
          content: `Twoja odpowiedź zawiera błędy walidacji:

${validation.errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

NAPRAW te błędy. Dla każdej pozycji upewnij się że:
- quantity * unit_price = value_netto (z dokładnością do groszy)
- Suma value_netto wszystkich pozycji = total_netto z dokumentu
- Jeśli quantity jest ułamkowe (np. 2,5 kg), użyj 2.5 NIE 25

Zwróć poprawiony CZYSTY JSON (bez markdown, bez komentarzy).`
        }
      )

      const text2 = await callClaude(apiHeaders, messages)
      try {
        const parsed2 = parseJson(text2)
        // Sprawdź czy poprawka pomogła
        const validation2 = validateInvoice(parsed2)
        if (validation2.valid || validation2.errors.length < validation.errors.length) {
          parsed = parsed2
        }
        // Jeśli nadal nie pasuje ale jest lepiej — użyj poprawionej wersji
      } catch {
        // Poprawka się nie udała — użyj oryginalnej odpowiedzi
      }
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
