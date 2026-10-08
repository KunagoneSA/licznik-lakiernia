import { useEffect, useState } from 'react'
import { ExternalLink, Link2, Search, Unlink } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Powiązanie klienta lakierni z kartą w ERP Kuna (wspólna kartoteka i CRM, 06.10.2026).
// Handlowiec lakierni prowadzi klienta w ERP (notatki, zadania), a lakiernia przyjmuje jego zamówienia.
// Dzięki powiązaniu zamówienie wie, czyj to klient, a w ERP widać zamówienia lakierni przy karcie.

export interface KartaErp {
  id: string
  name: string
  city: string | null
  phone: string | null
  email: string | null
  contact_person: string | null
  opiekun: string | null
}

const POLA = 'id, name, city, phone, email, contact_person, opiekun'
export const linkDoErp = (id: string) => `https://erp.kunagone.pl/klienci?open=${id}`

export async function kartaErp(id: string): Promise<KartaErp | null> {
  const { data } = await supabase.from('erp_contractors').select(POLA).eq('id', id).maybeSingle()
  return (data as KartaErp | null) ?? null
}

// Wyszukiwarka kart w ERP po nazwie, mieście albo telefonie
export function SzukajWErp({ onWybierz, placeholder }: { onWybierz: (k: KartaErp) => void; placeholder?: string }) {
  const [q, setQ] = useState('')
  const [wyniki, setWyniki] = useState<KartaErp[]>([])
  useEffect(() => {
    const fraza = q.trim()
    if (fraza.length < 2) { setWyniki([]); return }
    const t = setTimeout(async () => {
      const bezp = fraza.replace(/[,()*%]/g, ' ')
      const cyfry = fraza.replace(/\D/g, '')
      const warunki = [`name.ilike.*${bezp}*`, `city.ilike.*${bezp}*`]
      if (cyfry.length >= 5) warunki.push(`phone.ilike.*${cyfry.slice(-6)}*`)
      const { data } = await supabase.from('erp_contractors').select(POLA)
        .eq('type', 'client').or(warunki.join(',')).order('name').limit(10)
      setWyniki((data ?? []) as KartaErp[])
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 rounded border border-gray-300 bg-white px-2 py-1.5">
        <Search className="h-3 w-3 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder ?? 'Szukaj klienta w ERP: nazwa, miasto, telefon'}
          className="w-full bg-transparent text-xs text-gray-800 outline-none" />
      </div>
      {wyniki.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded border border-gray-200 bg-white shadow-lg">
          {wyniki.map((k) => (
            <button key={k.id} type="button" onClick={() => { onWybierz(k); setQ(''); setWyniki([]) }}
              className="block w-full px-2 py-1.5 text-left text-xs hover:bg-amber-50">
              <span className="font-medium text-gray-800">{k.name}</span>
              <span className="ml-2 text-[10px] text-gray-400">{[k.city, k.phone, k.opiekun && `opiekun: ${k.opiekun}`].filter(Boolean).join(' · ')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Panel przy wybranym kliencie: pokazuje powiązaną kartę albo pozwala ją wskazać
export function PowiazanieErp({ clientId, contractorId, onZmiana }: {
  clientId: string; contractorId: string | null | undefined; onZmiana: () => void
}) {
  const [karta, setKarta] = useState<KartaErp | null>(null)
  const [zapisuje, setZapisuje] = useState(false)
  useEffect(() => {
    let alive = true
    if (!contractorId) { setKarta(null); return }
    void kartaErp(contractorId).then((k) => { if (alive) setKarta(k) })
    return () => { alive = false }
  }, [contractorId])

  const ustaw = async (id: string | null) => {
    setZapisuje(true)
    await supabase.from('clients').update({ contractor_id: id }).eq('id', clientId)
    setZapisuje(false)
    onZmiana()
  }

  return (
    <div className="max-w-lg rounded-lg border border-sky-200 bg-sky-50/50 p-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
        <Link2 className="h-3 w-3" /> Karta klienta w ERP
      </div>
      {contractorId && karta ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-gray-800">{karta.name}</span>
          <span className="text-gray-500">{karta.opiekun ? `opiekun: ${karta.opiekun}` : 'bez opiekuna'}</span>
          <a href={linkDoErp(karta.id)} target="_blank" rel="noreferrer"
            className="flex items-center gap-0.5 text-sky-700 hover:underline"><ExternalLink className="h-3 w-3" /> otwórz w ERP</a>
          <button type="button" disabled={zapisuje} onClick={() => { if (confirm('Odpiąć klienta od karty w ERP?')) void ustaw(null) }}
            className="ml-auto flex items-center gap-0.5 text-[11px] text-gray-400 hover:text-red-500"><Unlink className="h-3 w-3" /> odepnij</button>
        </div>
      ) : (
        <>
          <p className="mb-1.5 text-[11px] text-gray-500">Nie powiązany. Wskaż kartę, żeby zamówienia liczyły się opiekunowi klienta.</p>
          <SzukajWErp onWybierz={(k) => void ustaw(k.id)} />
        </>
      )}
    </div>
  )
}

// ── Notatki CRM z lakierni (etap 4, 06.10.2026) ──────────────────────────────────────────
// Kasia (kierownik lakierni) dopisuje notatki od razu do karty klienta w ERP, tej samej, którą prowadzi
// handlowiec lakierni i nadzoruje Kamila. Notatki z zamówień Kunagone (autor „Zamówienie") pomijamy.
type Notatka = { id: string; content: string; author_name: string | null; created_at: string }

const autor = (email: string | undefined) =>
  email === 'lakiernia@kunagone.pl' ? 'Kasia (lakiernia)' : `${(email ?? '').split('@')[0]} (lakiernia)`

export function NotatkiCrm({ contractorId, email }: { contractorId: string; email: string | undefined }) {
  const [lista, setLista] = useState<Notatka[]>([])
  const [tekst, setTekst] = useState('')
  const [zapisuje, setZapisuje] = useState(false)
  const [blad, setBlad] = useState('')

  const wczytaj = async () => {
    const { data } = await supabase.from('erp_contractor_notes').select('id, content, author_name, created_at')
      .eq('contractor_id', contractorId).neq('author_name', 'Zamówienie')
      .order('created_at', { ascending: false }).limit(20)
    setLista((data ?? []) as Notatka[])
  }
  useEffect(() => { void wczytaj() }, [contractorId]) // eslint-disable-line react-hooks/exhaustive-deps

  const dodaj = async () => {
    const tresc = tekst.trim()
    if (!tresc) return
    setZapisuje(true); setBlad('')
    const { error } = await supabase.from('erp_contractor_notes')
      .insert({ contractor_id: contractorId, content: tresc, author_email: email ?? null, author_name: autor(email) })
    setZapisuje(false)
    if (error) { setBlad('Nie zapisało się: ' + error.message); return }
    setTekst('')
    await wczytaj()
  }

  return (
    <div className="max-w-lg rounded-lg border border-gray-200 bg-white p-2.5">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Notatki CRM (widać je w ERP)</div>
      <div className="flex gap-1.5">
        <textarea value={tekst} onChange={(e) => setTekst(e.target.value)} rows={2} placeholder="Np. dzwonił klient, chce wycenę na fronty w kolorze…"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void dodaj() }}
          className="w-full resize-y rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-amber-500/30" />
        <button type="button" disabled={zapisuje || !tekst.trim()} onClick={() => void dodaj()}
          className="self-start rounded bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
          {zapisuje ? 'Zapisuję…' : 'Dodaj'}
        </button>
      </div>
      {blad && <p className="mt-1 text-[11px] text-red-600">{blad}</p>}
      {lista.length > 0 && (
        <div className="mt-2 max-h-64 divide-y divide-gray-100 overflow-y-auto">
          {lista.map((n) => (
            <div key={n.id} className="py-1 text-xs">
              <div className="text-[10px] text-gray-400">{new Date(n.created_at).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })} · {n.author_name ?? '—'}</div>
              <div className="whitespace-pre-wrap text-gray-700">{n.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
