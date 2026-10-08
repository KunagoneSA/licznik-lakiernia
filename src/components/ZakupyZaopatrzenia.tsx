import { useState } from 'react'
import { Undo2, Pencil } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

// Zakupy lakierni wpisywane w Zaopatrzeniu kuna-erp (kategoria „lakiernia"), czytane wprost z tej samej bazy.
// Zwrot (Anna cb3e6f9f, 01.10.2026): „przycisk »zwrócono«, po jego naciśnięciu przekreślasz pozycję (nie usuwasz)
// i odliczasz automatycznie ten koszt; daj możliwość edycji, bo mogę kupić 3 puszki bejcy, a zwrócić tylko 1".
// Zwrot zapisujemy przy samej pozycji w erp_supplies, więc liczy się wszędzie: tu, w Finansach i w kaflu ERP.

export interface ZakupErp {
  id: string
  numer: string | null
  data: string | null
  opis: string | null
  zamowienie: string | null
  dostawca: string | null
  ilosc: number | null
  koszt: number | null           // wartość CAŁEJ pozycji netto
  koszt_dostawy: number | null
  waluta: string | null
  zwrocono_ilosc: number | null
  zwrot_notatka: string | null
  zalaczniki?: { url: string; name?: string }[] | null   // faktura (PDF albo zdjęcie) wgrana w ERP (Anna 34ff4632)
}
export const POLA_ZAKUPU_ERP = 'id, numer, data, opis, zamowienie, dostawca, ilosc, koszt, koszt_dostawy, waluta, zwrocono_ilosc, zwrot_notatka, zalaczniki'

/** Ile zwrócono, przycięte do ilości pozycji. Pozycja bez ilości: zwrot znaczy „całość" (1 z 1). */
const iloscPozycji = (z: ZakupErp) => (Number(z.ilosc) > 0 ? Number(z.ilosc) : 1)
const iloscZwrotu = (z: ZakupErp) => Math.min(Math.max(Number(z.zwrocono_ilosc) || 0, 0), iloscPozycji(z))

/** Koszt po zwrocie: część pozycji proporcjonalnie do tego, co zostało, plus wysyłka (wysyłki nikt nie oddaje). */
export function kosztZakupuErp(z: ZakupErp): number {
  const pozostalo = (iloscPozycji(z) - iloscZwrotu(z)) / iloscPozycji(z)
  return (Number(z.koszt) || 0) * pozostalo + (Number(z.koszt_dostawy) || 0)
}
export const tylkoPln = (z: ZakupErp) => (z.waluta || 'PLN') === 'PLN'

const fmt = (n: number) => n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function ZakupyZaopatrzenia({ zakupy, onZmiana, dopisek }: { zakupy: ZakupErp[]; onZmiana: () => void; dopisek: string }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [edytowany, setEdytowany] = useState<string | null>(null)
  const [ile, setIle] = useState('')
  const [notatka, setNotatka] = useState('')
  const [zapisuje, setZapisuje] = useState(false)

  const otworz = (z: ZakupErp) => {
    setEdytowany(z.id)
    setIle(String(iloscZwrotu(z) || iloscPozycji(z)).replace('.', ','))
    setNotatka(z.zwrot_notatka ?? '')
  }
  const zapisz = async (z: ZakupErp, cofnij = false) => {
    const wartosc = cofnij ? null : Number(ile.replace(',', '.'))
    if (!cofnij && (!Number.isFinite(wartosc) || (wartosc as number) <= 0 || (wartosc as number) > iloscPozycji(z))) {
      toast(`Podaj ilość zwrotu od 0 do ${iloscPozycji(z)}`, 'error'); return
    }
    setZapisuje(true)
    const { data, error } = await supabase.from('erp_supplies').update({
      zwrocono_ilosc: wartosc,
      zwrot_notatka: cofnij ? null : (notatka.trim() || null),
      zwrot_at: cofnij ? null : new Date().toISOString(),
      zwrot_przez: cofnij ? null : (user?.email ?? null),
    }).eq('id', z.id).select('id')
    setZapisuje(false)
    // Brak zwróconego wiersza = zapis nie przeszedł (np. uprawnienia), choć błędu nie było.
    if (error || !data?.length) { toast('Nie zapisano zwrotu' + (error ? `: ${error.message}` : ''), 'error'); return }
    toast(cofnij ? 'Zwrot cofnięty' : 'Zwrot zapisany, koszt odliczony')
    setEdytowany(null)
    onZmiana()
  }

  if (!zakupy.length) return null
  const razem = zakupy.filter(tylkoPln).reduce((s, z) => s + kosztZakupuErp(z), 0)

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="bg-gray-50 px-3 py-1.5 flex items-center justify-between border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Zakupy z Zaopatrzenia (ERP)</span>
        <span className="text-[10px] text-gray-400">{dopisek}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/50">
            <th className="px-3 py-1.5 text-left font-medium text-gray-500">Data</th>
            <th className="px-3 py-1.5 text-left font-medium text-gray-500">Nr</th>
            <th className="px-3 py-1.5 text-left font-medium text-gray-500">Co</th>
            <th className="px-3 py-1.5 text-left font-medium text-gray-500">Dostawca</th>
            <th className="px-3 py-1.5 text-right font-medium text-gray-500">Kwota netto</th>
            <th className="px-2 py-1.5 print:hidden"></th>
          </tr>
        </thead>
        <tbody>
          {zakupy.map((z, i) => {
            const obca = !tylkoPln(z)
            const zwrot = iloscZwrotu(z)
            const calyZwrot = zwrot > 0 && zwrot >= iloscPozycji(z)
            const czesciowy = zwrot > 0 && !calyZwrot
            return (
              <tr key={z.id} className={`border-b border-gray-50 align-top ${i % 2 === 1 ? 'bg-gray-50/30' : ''} ${obca ? 'opacity-50' : ''}`}>
                <td className="px-3 py-1 text-gray-600">{z.data}</td>
                <td className="px-3 py-1 text-gray-500">{z.numer || '—'}</td>
                <td className="px-3 py-1 text-gray-800">
                  <span className={calyZwrot ? 'line-through text-gray-400' : ''}>{z.opis || z.zamowienie || '—'}</span>
                  {(z.zalaczniki ?? []).map((a, k) => (
                    <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" title={a.name || 'Faktura'}
                      className="ml-1.5 text-[10px] font-semibold text-amber-600 hover:underline">
                      📎 {/\.pdf($|\?)/i.test(a.url) ? 'PDF' : 'foto'}{(z.zalaczniki ?? []).length > 1 ? ` ${k + 1}` : ''}
                    </a>
                  ))}
                  {Number(z.ilosc) > 0 && <span className="ml-1 text-[10px] text-gray-400">({z.ilosc} szt.)</span>}
                  {zwrot > 0 && (
                    <div className="text-[10px] font-medium text-rose-600">
                      {calyZwrot ? 'Zwrócono całość' : `Zwrócono ${zwrot} z ${iloscPozycji(z)}`}
                      {z.zwrot_notatka && <span className="font-normal text-gray-500"> · {z.zwrot_notatka}</span>}
                    </div>
                  )}
                  {edytowany === z.id && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 print:hidden">
                      <span className="text-[10px] text-gray-500">Zwrócono</span>
                      <input value={ile} onChange={(e) => setIle(e.target.value)} inputMode="decimal"
                        className="w-14 rounded border border-gray-300 px-1 py-0.5 text-right text-[11px]" />
                      <span className="text-[10px] text-gray-500">z {iloscPozycji(z)}</span>
                      <input value={notatka} onChange={(e) => setNotatka(e.target.value)} placeholder="powód, np. uszkodzona puszka"
                        className="min-w-[140px] flex-1 rounded border border-gray-300 px-1.5 py-0.5 text-[11px]" />
                      <button type="button" disabled={zapisuje} onClick={() => void zapisz(z)}
                        className="rounded bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-amber-600 disabled:opacity-50">Zapisz</button>
                      {zwrot > 0 && (
                        <button type="button" disabled={zapisuje} onClick={() => void zapisz(z, true)}
                          className="rounded px-2 py-0.5 text-[11px] text-gray-500 hover:bg-gray-100">Cofnij zwrot</button>
                      )}
                      <button type="button" onClick={() => setEdytowany(null)} className="rounded px-2 py-0.5 text-[11px] text-gray-400 hover:bg-gray-100">Anuluj</button>
                    </div>
                  )}
                </td>
                <td className="px-3 py-1 text-gray-600">{z.dostawca || '—'}</td>
                <td className="px-3 py-1 text-right tabular-nums">
                  <span className={calyZwrot ? 'text-gray-400' : 'text-orange-600'}>{fmt(kosztZakupuErp(z))} {obca ? z.waluta : 'zł'}</span>
                  {czesciowy && <div className="text-[10px] text-gray-400 line-through">{fmt((Number(z.koszt) || 0) + (Number(z.koszt_dostawy) || 0))} zł</div>}
                  {!!Number(z.koszt_dostawy) && <div className="text-[10px] text-gray-400">w tym wysyłka {fmt(Number(z.koszt_dostawy))}</div>}
                  {obca && <div className="text-[10px] text-gray-400">nie wliczone — inna waluta</div>}
                </td>
                <td className="px-2 py-1 text-right print:hidden">
                  <button type="button" onClick={() => (edytowany === z.id ? setEdytowany(null) : otworz(z))}
                    title={zwrot > 0 ? 'Popraw zwrot' : 'Zwrot (całość albo część)'}
                    className="inline-flex items-center gap-1 rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-500 hover:bg-gray-50 hover:text-rose-600">
                    {zwrot > 0 ? <Pencil className="h-3 w-3" /> : <Undo2 className="h-3 w-3" />}
                    {zwrot > 0 ? 'Zwrot' : 'Zwrócono'}
                  </button>
                </td>
              </tr>
            )
          })}
          <tr className="bg-gray-50 font-semibold border-t border-gray-200">
            <td className="px-3 py-1.5 text-gray-700" colSpan={4}>Razem (po zwrotach)</td>
            <td className="px-3 py-1.5 text-right text-orange-600 tabular-nums">{fmt(razem)} zł</td>
            <td className="print:hidden"></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
